import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { makePersonId } from "./iclr2026.pipeline.shared.mjs";

const inputPath =
  process.argv[2] || path.resolve(process.cwd(), "data/iclr2026.extracted.json");
const outputPath =
  process.argv[3] || path.resolve(process.cwd(), "data/iclr2026.enriched.json");

if (!fs.existsSync(inputPath)) {
  throw new Error(`extracted dataset not found: ${inputPath}`);
}

const extracted = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const HIGH_PRECISION_THRESHOLD = 0.92;
const MAX_SEARCH = Number(process.env.MAX_SEARCH || 240);
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY || "";

const PROXY_ENV = {
  ...process.env,
  https_proxy: process.env.https_proxy || "http://127.0.0.1:7890",
  http_proxy: process.env.http_proxy || "http://127.0.0.1:7890",
  all_proxy: process.env.all_proxy || "socks5://127.0.0.1:7890"
};

let searchCount = 0;
let serpCount = 0;
const queryCache = new Map();

function fetchSearchMarkdown(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://r.jina.ai/http://www.bing.com/search?q=${encoded}`;
  try {
    return execFileSync("curl", ["-s", "--max-time", "22", url], {
      encoding: "utf8",
      env: PROXY_ENV,
      maxBuffer: 1024 * 1024 * 8
    });
  } catch {
    return "";
  }
}

function fetchSerpApiJson(query) {
  if (!SERPAPI_API_KEY) return null;
  const key = `serp:${query}`;
  if (queryCache.has(key)) return queryCache.get(key);
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query
  )}&engine=google&hl=en&api_key=${SERPAPI_API_KEY}&num=10`;
  try {
    const raw = execFileSync("curl", ["-s", "--max-time", "25", url], {
      encoding: "utf8",
      env: PROXY_ENV,
      maxBuffer: 1024 * 1024 * 6
    });
    const json = JSON.parse(raw);
    serpCount += 1;
    queryCache.set(key, json);
    return json;
  } catch {
    queryCache.set(key, null);
    return null;
  }
}

function pickCandidateFromSerp(json, domain, name, affiliation) {
  if (!json?.organic_results?.length) return "";
  const nameTokens = name
    .toLowerCase()
    .split(/[\s.'-]+/)
    .filter((token) => token.length >= 3);
  const affTokens = (affiliation || "")
    .toLowerCase()
    .split(/[\s,'&().-]+/)
    .filter((token) => token.length >= 4);

  const candidates = [];
  for (const row of json.organic_results) {
    const link = row.link || "";
    if (!link.toLowerCase().includes(domain)) continue;
    if (domain === "linkedin.com" && !/linkedin\.com\/in\//i.test(link)) continue;
    if (domain === "github.com" && !/github\.com\/[^/]+\/?$/i.test(link)) continue;
    if (domain === "scholar.google.com" && !/scholar\.google\.com\/citations/i.test(link)) continue;
    const ctx = `${row.title || ""} ${row.snippet || ""}`.toLowerCase();
    const nameHit = nameTokens.some((token) => link.toLowerCase().includes(token) || ctx.includes(token));
    const affHit = affTokens.some((token) => ctx.includes(token));
    const score = (nameHit ? 2 : 0) + (affHit ? 1 : 0);
    candidates.push({ link, score });
  }
  if (!candidates.length) return "";
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].link;
}

function decodeBingRedirect(url) {
  const match = url.match(/[?&]u=([^&]+)/);
  if (!match) return "";
  let raw = decodeURIComponent(match[1]);
  if (raw.startsWith("a1")) {
    raw = raw.slice(2);
  }
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return decoded.startsWith("http://") || decoded.startsWith("https://") ? decoded : "";
  } catch {
    return "";
  }
}

function pickCandidateFromSearch(markdown, domain, name, affiliation) {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const candidates = [];
  const nameTokens = name
    .toLowerCase()
    .split(/[\s.'-]+/)
    .filter((token) => token.length >= 3);
  const affTokens = (affiliation || "")
    .toLowerCase()
    .split(/[\s,'&().-]+/)
    .filter((token) => token.length >= 4);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.includes("https://www.bing.com/ck/a?")) continue;
    const decoded = decodeBingRedirect(line);
    if (!decoded) continue;
    if (!decoded.toLowerCase().includes(domain)) continue;
    if (domain === "linkedin.com" && !/linkedin\.com\/in\//i.test(decoded)) continue;
    if (domain === "github.com" && !/github\.com\/[^/]+\/?$/i.test(decoded)) continue;
    if (domain === "scholar.google.com" && !/scholar\.google\.com\/citations/i.test(decoded)) continue;

    const context = `${line} ${(lines[i + 1] || "")} ${(lines[i + 2] || "")}`.toLowerCase();
    const nameHit = nameTokens.some((token) => decoded.toLowerCase().includes(token));
    const affHit = affTokens.some((token) => context.includes(token));
    const score = (nameHit ? 2 : 0) + (affHit ? 1 : 0);
    candidates.push({ url: decoded, score });
  }

  if (candidates.length === 0) return "";
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

function scoreLink(name, url) {
  if (!url) return { confidence: 0, matchReason: "missing" };
  const normalized = url.toLowerCase();
  if (/linkedin\.com|github\.com|scholar\.google/.test(normalized)) {
    const tokens = name
      .toLowerCase()
      .split(/[\s.'-]+/)
      .filter((token) => token.length >= 3);
    const hit = tokens.some((token) => normalized.includes(token));
    return {
      confidence: hit ? 0.96 : 0.88,
      matchReason: hit ? "name-token-in-url" : "domain-only-no-name-token"
    };
  }
  return { confidence: 0.7, matchReason: "non-target-domain" };
}

function toLinkField(url, name, sourceUrls) {
  const { confidence, matchReason } = scoreLink(name, url);
  if (!url) {
    return {
      url: "",
      status: "empty",
      confidence: 0,
      matchReason: "no-candidate",
      verifiedBy: "auto",
      sourceUrls
    };
  }
  if (confidence >= HIGH_PRECISION_THRESHOLD) {
    return {
      url,
      status: "verified",
      confidence,
      matchReason,
      verifiedBy: "auto",
      sourceUrls
    };
  }
  return {
    url,
    status: "pending",
    confidence,
    matchReason,
    verifiedBy: "auto",
    sourceUrls
  };
}

function normalizePerson(person, role) {
  const sourceUrls = person.sourceUrls && person.sourceUrls.length > 0 ? person.sourceUrls : [];
  const rawLinks = person.rawLinks || [];

  let linkedinCandidate = rawLinks.find((link) => /linkedin\.com/i.test(link)) || "";
  let githubCandidate = rawLinks.find((link) => /github\.com/i.test(link)) || "";
  let scholarCandidate = rawLinks.find((link) => /scholar\.google/i.test(link)) || "";

  const canSearch =
    searchCount < MAX_SEARCH &&
    !/reviewer/i.test(role) &&
    (!linkedinCandidate || !githubCandidate || !scholarCandidate);

  if (canSearch) {
    searchCount += 1;
    const q = `${person.name} ${person.affiliation || ""}`;
    const serp = fetchSerpApiJson(`${q} google scholar linkedin github`);
    if (!linkedinCandidate) {
      linkedinCandidate =
        pickCandidateFromSerp(serp, "linkedin.com", person.name, person.affiliation) || "";
    }
    if (!githubCandidate) {
      githubCandidate =
        pickCandidateFromSerp(serp, "github.com", person.name, person.affiliation) || "";
    }
    if (!scholarCandidate) {
      scholarCandidate =
        pickCandidateFromSerp(serp, "scholar.google.com", person.name, person.affiliation) || "";
    }

    if ((!linkedinCandidate || !githubCandidate || !scholarCandidate) && !serp) {
      const md = fetchSearchMarkdown(`${q} linkedin github google scholar`);
      if (!linkedinCandidate) {
        linkedinCandidate = pickCandidateFromSearch(md, "linkedin.com", person.name, person.affiliation);
      }
      if (!githubCandidate) {
        githubCandidate = pickCandidateFromSearch(md, "github.com", person.name, person.affiliation);
      }
      if (!scholarCandidate) {
        scholarCandidate = pickCandidateFromSearch(
          md,
          "scholar.google.com",
          person.name,
          person.affiliation
        );
      }
    }
  }

  const linkedIn = toLinkField(linkedinCandidate, person.name, sourceUrls);
  const github = toLinkField(githubCandidate, person.name, sourceUrls);
  const gScholar = toLinkField(scholarCandidate, person.name, sourceUrls);

  const confidenceScores = [linkedIn.confidence, github.confidence, gScholar.confidence].filter(
    (v) => v > 0
  );
  const personConfidence =
    confidenceScores.length > 0
      ? Number((confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length).toFixed(3))
      : person.affiliation && person.affiliation !== "待补充"
        ? 0.9
        : 0.76;

  const personId = makePersonId(
    person.name,
    person.affiliation || "待补充",
    sourceUrls[0] || extracted.conferenceId
  );

  return {
    personId,
    conferenceId: extracted.conferenceId,
    name: person.name,
    role,
    affiliation: person.affiliation || "待补充",
    sourceUrls,
    evidenceText: person.evidenceText || person.name,
    confidence: personConfidence,
    links: { linkedIn, github, gScholar },
    linkedIn: linkedIn.status === "verified" ? linkedIn.url : "",
    github: github.status === "verified" ? github.url : "",
    gScholar: gScholar.status === "verified" ? gScholar.url : ""
  };
}

const committeeRoles = extracted.committeeRoles.map((role) => ({
  roleLabel: role.roleLabel,
  members: role.members.map((person) => normalizePerson(person, role.roleLabel))
}));

const workshops = extracted.workshops.map((workshop) => ({
  ...workshop,
  organizers: workshop.organizers.map((person) => normalizePerson(person, "Workshop Organizer"))
}));

const enriched = {
  ...extracted,
  confidenceThreshold: HIGH_PRECISION_THRESHOLD,
  searchUsed: searchCount,
  searchLimit: MAX_SEARCH,
  serpApiUsed: serpCount,
  generatedAt: new Date().toISOString(),
  committeeRoles,
  workshops
};

fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), "utf8");
console.log(`Wrote enriched dataset -> ${outputPath}`);
