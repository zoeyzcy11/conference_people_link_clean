import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INPUT_PATH = path.resolve(ROOT, "data/conferences.json");
const OUTPUT_PATH = path.resolve(ROOT, "data/cvpr2026.lessie.enriched.json");
const CONFERENCE_ID = process.env.CONFERENCE_ID || "CVPR2026";
const APPLY = process.env.APPLY !== "0";
const LIMIT = Number(process.env.LIMIT || 200);
const SLEEP_MS = Number(process.env.SLEEP_MS || 300);

function runLessie(args) {
  const raw = execFileSync("lessie", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 12,
    env: process.env
  });
  return JSON.parse(raw);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function norm(value) {
  return String(value || "").trim();
}

function normalizeUrl(url) {
  const value = norm(url);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function isPlaceholder(url, type) {
  const value = norm(url).toLowerCase();
  if (!value) return true;
  if (type === "linkedin") return value === "https://www.linkedin.com";
  if (type === "github") return value === "https://github.com";
  if (type === "scholar") return value === "https://scholar.google.com";
  return false;
}

function splitTokens(value) {
  return norm(value)
    .toLowerCase()
    .split(/[\s,.'\-_/&()]+/)
    .filter((x) => x.length >= 2);
}

function overlapScore(a, b) {
  const ta = new Set(splitTokens(a));
  const tb = splitTokens(b);
  if (!ta.size || !tb.length) return 0;
  let hit = 0;
  for (const t of tb) {
    if (ta.has(t)) hit += 1;
  }
  return hit;
}

function pickUrlFromText(raw, domain, personName) {
  if (!raw) return "";
  const urls = new Set();
  for (const m of String(raw).matchAll(/https?:\/\/[^\s)"'<>]+/g)) {
    urls.add(m[0].replace(/[),.;]+$/, ""));
  }
  const tokens = splitTokens(personName).filter((x) => x.length >= 3);
  const cands = [];
  for (const u of urls) {
    const lower = u.toLowerCase();
    if (!lower.includes(domain)) continue;
    if (domain === "linkedin.com" && !/linkedin\.com\/in\//i.test(lower)) continue;
    if (domain === "github.com" && !/github\.com\/[^/]+\/?$/i.test(lower)) continue;
    if (domain === "scholar.google.com" && !/scholar\.google\.com\/citations/i.test(lower)) continue;
    let score = 1;
    for (const t of tokens) {
      if (lower.includes(t)) score += 2;
    }
    cands.push({ url: u, score });
  }
  cands.sort((a, b) => b.score - a.score);
  return cands[0]?.url || "";
}

function pickBestFindPeople(person, payload) {
  const rows = payload?.people || [];
  if (!rows.length) return null;
  const ranked = rows.map((row) => {
    const name = row?.name?.value || row?.profile?.full_name?.value || "";
    const company =
      row?.profile?.job_company_name?.value ||
      row?.profile?.company_name?.value ||
      row?.profile?.organization_name?.value ||
      "";
    const linkedin =
      row?.profile?.linkedin_url?.value || row?.profile?.linkedin?.value || row?.linkedin?.url?.value || "";
    const avatar = row?.avatar?.value || row?.profile?.avatar?.value || "";
    let score = 0;
    score += overlapScore(person.name, name) * 5;
    score += overlapScore(person.affiliation, company) * 3;
    if (linkedin) score += 4;
    return { score, name, company, linkedin: normalizeUrl(linkedin), avatar: normalizeUrl(avatar), raw: row };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}

function buildLinkField(url, confidence, reason, sourceUrl) {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return {
      url: "",
      status: "empty",
      confidence: 0,
      matchReason: "not_found",
      verifiedBy: "auto",
      sourceUrls: sourceUrl ? [sourceUrl] : []
    };
  }
  return {
    url: normalized,
    status: confidence >= 0.92 ? "verified" : "pending",
    confidence,
    matchReason: reason,
    verifiedBy: "auto",
    sourceUrls: sourceUrl ? [sourceUrl] : []
  };
}

function collectPeople(conference) {
  const list = [];
  for (const role of conference.committeeRoles || []) {
    for (const member of role.members || []) {
      list.push({
        personId: member.personId,
        name: member.name,
        affiliation: member.affiliation || "",
        roleKey: role.roleKey,
        roleLabel: role.roleLabel,
        isWorkshop: false
      });
    }
  }
  for (const workshop of conference.workshops || []) {
    for (const member of workshop.organizers || []) {
      list.push({
        personId: member.personId,
        name: member.name,
        affiliation: member.affiliation || "",
        roleKey: "workshopOrganizer",
        roleLabel: `Workshop Organizer · ${workshop.name}`,
        isWorkshop: true
      });
    }
  }
  const map = new Map();
  for (const row of list) {
    const key = row.personId || `${row.name}|${row.affiliation}`;
    if (!map.has(key)) map.set(key, row);
  }
  return [...map.values()].slice(0, LIMIT);
}

function enrichPerson(person) {
  const sourceUrls = [];
  let linkedIn = "";
  let photo = "";
  let linkedInConfidence = 0;

  try {
    const payload = runLessie([
      "find-people",
      "--filter",
      JSON.stringify({ person_name: person.name, company: person.affiliation }),
      "--checkpoint",
      `Academic organizer profile lookup: ${person.name}`,
      "--strategy",
      "saas_only",
      "--target-count",
      "8",
      "--language",
      "en-US"
    ]);
    sourceUrls.push(`lessie:find-people:${payload.search_id || "unknown"}`);
    const best = pickBestFindPeople(person, payload);
    if (best?.linkedin) {
      linkedIn = best.linkedin;
      linkedInConfidence = Math.min(0.97, 0.86 + Math.min(0.1, best.score / 100));
    }
    if (best?.avatar) photo = best.avatar;
  } catch {
    // ignore and fallback to web-search
  }

  let github = "";
  let gScholar = "";
  try {
    const payload = runLessie([
      "web-search",
      "--query",
      `${person.name} ${person.affiliation} linkedin github google scholar`,
      "--count",
      "10"
    ]);
    sourceUrls.push(`lessie:web-search:${person.name}`);
    const raw = JSON.stringify(payload);
    if (!linkedIn) {
      linkedIn = pickUrlFromText(raw, "linkedin.com", person.name);
      if (linkedIn) linkedInConfidence = 0.9;
    }
    github = pickUrlFromText(raw, "github.com", person.name);
    gScholar = pickUrlFromText(raw, "scholar.google.com", person.name);
  } catch {
    // ignore
  }

  const links = {
    linkedIn: buildLinkField(linkedIn, linkedInConfidence || (linkedIn ? 0.88 : 0), "lessie_match", sourceUrls[0]),
    github: buildLinkField(github, github ? 0.9 : 0, "lessie_web_search", sourceUrls[1] || sourceUrls[0]),
    gScholar: buildLinkField(gScholar, gScholar ? 0.9 : 0, "lessie_web_search", sourceUrls[1] || sourceUrls[0])
  };

  const confidence = Number(
    (
      (links.linkedIn.confidence + links.github.confidence + links.gScholar.confidence) /
      3
    ).toFixed(3)
  );

  return {
    ...person,
    linkedIn: links.linkedIn.url,
    github: links.github.url,
    gScholar: links.gScholar.url,
    photo: photo || "",
    links,
    sourceUrls,
    evidenceText: "lessie find-people + web-search",
    confidence
  };
}

function applyToConference(conference, enrichedMap) {
  for (const role of conference.committeeRoles || []) {
    role.members = (role.members || []).map((member) => {
      const hit = enrichedMap.get(member.personId) || enrichedMap.get(`${member.name}|${member.affiliation}`);
      if (!hit) return member;
      const merged = { ...member };
      if (!member.linkedIn || isPlaceholder(member.linkedIn, "linkedin")) merged.linkedIn = hit.linkedIn || member.linkedIn;
      if (!member.github || isPlaceholder(member.github, "github")) merged.github = hit.github || member.github;
      if (!member.gScholar || isPlaceholder(member.gScholar, "scholar")) merged.gScholar = hit.gScholar || member.gScholar;
      if (!member.photo && hit.photo) merged.photo = hit.photo;
      merged.links = hit.links;
      merged.sourceUrls = [...new Set([...(member.sourceUrls || []), ...(hit.sourceUrls || [])])];
      merged.evidenceText = hit.evidenceText;
      merged.confidence = hit.confidence;
      return merged;
    });
  }
  for (const workshop of conference.workshops || []) {
    workshop.organizers = (workshop.organizers || []).map((member) => {
      const hit = enrichedMap.get(member.personId) || enrichedMap.get(`${member.name}|${member.affiliation}`);
      if (!hit) return member;
      const merged = { ...member };
      if (!member.linkedIn || isPlaceholder(member.linkedIn, "linkedin")) merged.linkedIn = hit.linkedIn || member.linkedIn;
      if (!member.github || isPlaceholder(member.github, "github")) merged.github = hit.github || member.github;
      if (!member.gScholar || isPlaceholder(member.gScholar, "scholar")) merged.gScholar = hit.gScholar || member.gScholar;
      if (!member.photo && hit.photo) merged.photo = hit.photo;
      merged.links = hit.links;
      merged.sourceUrls = [...new Set([...(member.sourceUrls || []), ...(hit.sourceUrls || [])])];
      merged.evidenceText = hit.evidenceText;
      merged.confidence = hit.confidence;
      return merged;
    });
  }
}

const status = runLessie(["status"]);
if (!status.authorized) {
  console.error("Lessie is not authorized. Run `lessie auth` first.");
  process.exit(1);
}

const conferences = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
const conference = conferences.find((x) => x.conferenceId === CONFERENCE_ID);
if (!conference) {
  console.error(`Conference not found: ${CONFERENCE_ID}`);
  process.exit(1);
}

const people = collectPeople(conference);
const enriched = [];
for (let i = 0; i < people.length; i += 1) {
  const person = people[i];
  process.stdout.write(`[${i + 1}/${people.length}] enriching ${person.name}\n`);
  const row = enrichPerson(person);
  enriched.push(row);
  if (SLEEP_MS > 0) sleep(SLEEP_MS);
}

const enrichedMap = new Map();
for (const row of enriched) {
  if (row.personId) enrichedMap.set(row.personId, row);
  enrichedMap.set(`${row.name}|${row.affiliation}`, row);
}

if (APPLY) {
  applyToConference(conference, enrichedMap);
  fs.writeFileSync(INPUT_PATH, JSON.stringify(conferences, null, 2), "utf8");
}

const summary = {
  generatedAt: new Date().toISOString(),
  conferenceId: CONFERENCE_ID,
  totalPeople: people.length,
  enrichedPeople: enriched.length,
  applyToConferencesJson: APPLY,
  people: enriched
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2), "utf8");
console.log(`Wrote ${OUTPUT_PATH}`);
