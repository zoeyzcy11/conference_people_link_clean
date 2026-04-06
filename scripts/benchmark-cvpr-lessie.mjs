import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SAMPLE_SIZE = Number(process.env.SAMPLE_SIZE || 30);
const MODE = process.env.MODE || "both"; // baseline | lessie | both
const OUTPUT_PATH =
  process.env.OUTPUT_PATH || path.resolve(process.cwd(), "data/cvpr2026.benchmark.json");
const SERPAPI_API_KEY =
  process.env.SERPAPI_API_KEY || "e0e5ebc5838c88999ce0a2ba294a7e56a76aa3495cfb0f8da8e948221dca1317";

const PROXY_ENV = {
  ...process.env
};

function run(command, args, useProxy = true) {
  return execFileSync(command, args, {
    encoding: "utf8",
    env: useProxy ? PROXY_ENV : process.env,
    maxBuffer: 1024 * 1024 * 16
  });
}

function fetchCvprOrganizersHtml() {
  return run("curl", ["-sL", "--max-time", "25", "https://cvpr.thecvf.com/Conferences/2026/Organizers"]);
}

function cleanText(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCvprOrganizers(html) {
  const roles = [];
  const rolePattern = /<h3>([^<]+)<\/h3>\s*<ul class="list-unstyled mb-0">([\s\S]*?)<\/ul>/g;
  for (const roleMatch of html.matchAll(rolePattern)) {
    const roleLabel = cleanText(roleMatch[1]);
    const block = roleMatch[2];
    const members = [];
    const itemPattern = /<li>\s*([^<(<][\s\S]*?)\s*(?:\(([^)]+)\))?\s*<\/li>/g;
    for (const itemMatch of block.matchAll(itemPattern)) {
      const name = cleanText(itemMatch[1].replace(/<[^>]*>/g, ""));
      const affiliation = cleanText((itemMatch[2] || "待补充").replace(/<[^>]*>/g, ""));
      if (!name || name.length < 3) continue;
      members.push({
        name,
        affiliation,
        role: roleLabel
      });
    }
    if (members.length) {
      roles.push({ roleLabel, members });
    }
  }
  return roles;
}

function pickCandidateFromSearch(markdown, domain, name) {
  if (!markdown) return "";
  const pattern = /(https?:\/\/[^\s)]+)/g;
  const urls = new Set();
  for (const m of markdown.matchAll(pattern)) {
    urls.add(m[1]);
  }
  const nameTokens = name
    .toLowerCase()
    .split(/[\s.'-]+/)
    .filter((token) => token.length >= 3);
  const candidates = [];
  for (const raw of urls) {
    const url = raw.replace(/[),.;]+$/, "");
    if (!url.toLowerCase().includes(domain)) continue;
    if (domain === "linkedin.com" && !/linkedin\.com\/in\//i.test(url)) continue;
    if (domain === "github.com" && !/github\.com\/[^/]+\/?$/i.test(url)) continue;
    if (domain === "scholar.google.com" && !/scholar\.google\.com\/citations/i.test(url)) continue;
    const lower = url.toLowerCase();
    const score = nameTokens.some((token) => lower.includes(token)) ? 2 : 1;
    candidates.push({ url, score });
  }
  if (!candidates.length) return "";
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

function pickCandidateFromSerp(json, domain, name) {
  const rows = json?.organic_results || [];
  if (!rows.length) return "";
  const nameTokens = name
    .toLowerCase()
    .split(/[\s.'-]+/)
    .filter((token) => token.length >= 3);
  const candidates = [];
  for (const row of rows) {
    const link = row.link || "";
    if (!link.toLowerCase().includes(domain)) continue;
    if (domain === "linkedin.com" && !/linkedin\.com\/in\//i.test(link)) continue;
    if (domain === "github.com" && !/github\.com\/[^/]+\/?$/i.test(link)) continue;
    if (domain === "scholar.google.com" && !/scholar\.google\.com\/citations/i.test(link)) continue;
    const ctx = `${row.title || ""} ${row.snippet || ""}`.toLowerCase();
    const score = nameTokens.some((token) => link.toLowerCase().includes(token) || ctx.includes(token))
      ? 2
      : 1;
    candidates.push({ url: link, score });
  }
  if (!candidates.length) return "";
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

function fetchSerpJson(query) {
  if (!SERPAPI_API_KEY) return null;
  try {
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
      query
    )}&api_key=${SERPAPI_API_KEY}&num=8`;
    const raw = run("curl", ["-s", "--max-time", "12", url]);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function baselineEnrichPerson(person) {
  const query = `${person.name} ${person.affiliation} linkedin github google scholar`;
  const serp = fetchSerpJson(query);
  let markdown = "";
  if (!serp) {
    const mirror = `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(query)}`;
    try {
      markdown = run("curl", ["-s", "--max-time", "6", mirror]);
    } catch {
      markdown = "";
    }
  }
  return {
    linkedIn: serp
      ? pickCandidateFromSerp(serp, "linkedin.com", person.name)
      : pickCandidateFromSearch(markdown, "linkedin.com", person.name),
    github: serp
      ? pickCandidateFromSerp(serp, "github.com", person.name)
      : pickCandidateFromSearch(markdown, "github.com", person.name),
    gScholar: serp
      ? pickCandidateFromSerp(serp, "scholar.google.com", person.name)
      : pickCandidateFromSearch(markdown, "scholar.google.com", person.name)
  };
}

function tryLessieStatus() {
  try {
    const raw = run("lessie", ["status"], false);
    return JSON.parse(raw);
  } catch {
    return { authorized: false };
  }
}

function lessieEnrichPerson(person) {
  const query = `${person.name} ${person.affiliation} linkedin github google scholar`;
  try {
    const raw = run("lessie", ["web-search", "--query", query, "--count", "10"], false);
    const json = JSON.parse(raw);
    const rows = json.results || json.data || json.items || [];
    const allText = JSON.stringify(rows);
    return {
      linkedIn: pickCandidateFromSearch(allText, "linkedin.com", person.name),
      github: pickCandidateFromSearch(allText, "github.com", person.name),
      gScholar: pickCandidateFromSearch(allText, "scholar.google.com", person.name)
    };
  } catch {
    return { linkedIn: "", github: "", gScholar: "" };
  }
}

function computeMetrics(name, enrichedRows, ms, extra = {}) {
  let linkedIn = 0;
  let github = 0;
  let gScholar = 0;
  let any = 0;
  for (const row of enrichedRows) {
    const li = Boolean(row.links.linkedIn);
    const gh = Boolean(row.links.github);
    const gs = Boolean(row.links.gScholar);
    if (li) linkedIn += 1;
    if (gh) github += 1;
    if (gs) gScholar += 1;
    if (li || gh || gs) any += 1;
  }
  return {
    method: name,
    durationMs: ms,
    total: enrichedRows.length,
    linkedIn,
    github,
    gScholar,
    any,
    anyCoverage: Number((any / Math.max(1, enrichedRows.length)).toFixed(3)),
    ...extra
  };
}

function runMethod(method, people) {
  const t0 = Date.now();
  const rows = people.map((person) => {
    const links = method === "lessie" ? lessieEnrichPerson(person) : baselineEnrichPerson(person);
    return { person, links };
  });
  const t1 = Date.now();
  return {
    rows,
    metrics: computeMetrics(method, rows, t1 - t0)
  };
}

function dedupePeople(roles) {
  const map = new Map();
  for (const role of roles) {
    for (const member of role.members) {
      const key = `${member.name}|${member.affiliation}`;
      if (!map.has(key)) map.set(key, member);
    }
  }
  return [...map.values()];
}

const html = fetchCvprOrganizersHtml();
const roles = parseCvprOrganizers(html);
const people = dedupePeople(roles).slice(0, SAMPLE_SIZE);

const summary = {
  generatedAt: new Date().toISOString(),
  conferenceId: "CVPR2026",
  sampleSize: SAMPLE_SIZE,
  parsedRoles: roles.length,
  parsedPeopleTotal: dedupePeople(roles).length,
  status: {}
};

if (!people.length) {
  summary.status.error = "CVPR organizers parse empty";
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Wrote benchmark output -> ${OUTPUT_PATH}`);
  process.exit(1);
}

if (MODE === "baseline" || MODE === "both") {
  const baseline = runMethod("baseline", people);
  summary.baseline = baseline.metrics;
}

if (MODE === "lessie" || MODE === "both") {
  const status = tryLessieStatus();
  if (!status?.authorized) {
    summary.lessie = {
      method: "lessie",
      skipped: true,
      reason: "lessie_not_authorized",
      hint: "运行 lessie auth 完成登录后重试。"
    };
  } else {
    const lessie = runMethod("lessie", people);
    summary.lessie = lessie.metrics;
  }
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2), "utf8");
console.log(`Wrote benchmark output -> ${OUTPUT_PATH}`);
console.log(JSON.stringify(summary, null, 2));
