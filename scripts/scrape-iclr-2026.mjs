import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const outputPath =
  process.argv[2] || path.resolve(process.cwd(), "data/iclr2026.knowledge.json");

const PROXY_ENV = {
  ...process.env,
  https_proxy: process.env.https_proxy || "http://127.0.0.1:7890",
  http_proxy: process.env.http_proxy || "http://127.0.0.1:7890",
  all_proxy: process.env.all_proxy || "socks5://127.0.0.1:7890"
};

function fetchMarkdown(url) {
  const wrapped = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
  try {
    return execFileSync("curl", ["-s", "--max-time", "35", wrapped], {
      encoding: "utf8",
      env: PROXY_ENV,
      maxBuffer: 1024 * 1024 * 10
    });
  } catch {
    return "";
  }
}

function makePersonId(name, affiliation, source) {
  return `p_${crypto
    .createHash("sha256")
    .update(`${name}|${affiliation}|${source}`)
    .digest("hex")
    .slice(0, 10)}`;
}

function cleanLine(line) {
  return line
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function isLikelyName(value) {
  if (!value) return false;
  if (value.length < 3 || value.length > 80) return false;
  if (/^(Main Navigation|Select Year|Login|Calls|Guides|Attend|Organization|Exhibitors)$/i.test(value)) return false;
  if (/\d{3,}/.test(value)) return false;
  if (/University|Institute|Laboratories|Labs|College|School|ICLR|Meta|Google|Microsoft|OpenAI|NVIDIA|Amazon/i.test(value)) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return /^[\p{L}\s.'\-&()]+$/u.test(value);
}

function looksLikeAffiliation(value) {
  return /University|Institute|Laboratories|Labs|Laboratory|School|College|Center|Research|Meta|Google|Microsoft|OpenAI|NVIDIA|Hugging Face|Apple|Cornell|Stanford|Columbia|ICLR|Therapeutics|Inc\.?|Ltd\.?|Company|Corporation|Institute|ETH|CMU|MIT/i.test(
    value
  );
}

function parseOrganizingCommittee(markdown) {
  const lines = markdown.split("\n").map((line) => line.trim());
  const start = lines.findIndex((line) => line.startsWith("## 2026 Organizing Committee"));
  if (start < 0) return [];

  const roles = [];
  let currentRole = null;

  for (let i = start + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw) continue;
    if (raw.startsWith("Successful Page Load")) break;

    if (raw.startsWith("###### ")) {
      if (currentRole) roles.push(currentRole);
      currentRole = {
        roleLabel: cleanLine(raw.replace(/^######\s+/, "")),
        members: []
      };
      continue;
    }

    if (!currentRole) continue;
    const text = cleanLine(raw);
    if (!text) continue;
    if (!isLikelyName(text) && !looksLikeAffiliation(text)) continue;

    const last = currentRole.members[currentRole.members.length - 1];
    if (looksLikeAffiliation(text) && last && last.affiliation === "待补充") {
      last.affiliation = text;
      continue;
    }

    if (isLikelyName(text)) {
      currentRole.members.push({
        name: text,
        title: currentRole.roleLabel,
        affiliation: "待补充",
        linkedIn: "",
        github: "",
        gScholar: "",
        sourceLinks: ["https://iclr.cc/Conferences/2026/Committees"]
      });
    }
  }

  if (currentRole) roles.push(currentRole);

  return roles.filter((role) => role.members.length > 0);
}

function parseProgramCommittee(markdown) {
  const lines = markdown.split("\n").map((line) => cleanLine(line)).filter(Boolean);
  const headings = ["Senior Area Chairs", "Area Chairs", "Reviewers"];

  const idxByHeading = new Map();
  for (const h of headings) idxByHeading.set(h, []);
  lines.forEach((line, idx) => {
    if (idxByHeading.has(line)) idxByHeading.get(line).push(idx);
  });

  const seniors = idxByHeading.get("Senior Area Chairs");
  const areas = idxByHeading.get("Area Chairs");
  const reviewers = idxByHeading.get("Reviewers");
  if (!seniors?.length || !areas?.length || !reviewers?.length) return [];

  // ProgramCommittee page contains nav headings once, then real headings again.
  const startSenior = seniors[seniors.length - 1];
  const startArea = areas.find((idx) => idx > startSenior);
  const startReviewer = reviewers.find((idx) => idx > (startArea ?? -1));
  if (startArea == null || startReviewer == null) return [];

  function collect(start, end, roleLabel) {
    const seen = new Set();
    const members = [];
    for (let i = start + 1; i < end; i += 1) {
      const name = lines[i];
      if (!isLikelyName(name)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      members.push({
        name,
        title: roleLabel,
        affiliation: "待补充",
        linkedIn: "",
        github: "",
        gScholar: "",
        sourceLinks: ["https://iclr.cc/Conferences/2026/ProgramCommittee"]
      });
    }
    return members;
  }

  const seniorMembers = collect(startSenior, startArea, "Senior Area Chair");
  const areaMembers = collect(startArea, startReviewer, "Area Chair");
  const reviewerMembers = collect(startReviewer, lines.length, "Reviewer");

  return [
    { roleLabel: "Senior Area Chair", members: seniorMembers },
    { roleLabel: "Area Chair", members: areaMembers },
    { roleLabel: "Reviewer", members: reviewerMembers }
  ].filter((r) => r.members.length > 0);
}

function extractWorkshopGroups(markdown) {
  const links = [];
  const pattern =
    /\*   \[(ICLR 2026 Workshop [^\]]+)\]\((https:\/\/openreview\.net\/group\?id=ICLR\.cc\/2026\/Workshop\/[^)]+)\)/g;
  for (const match of markdown.matchAll(pattern)) {
    links.push({
      title: match[1].replace(/^ICLR 2026 Workshop\s*/i, "").trim(),
      openreviewUrl: match[2]
    });
  }
  return links;
}

function parseWorkshopTopInfo(markdown) {
  const titleMatch = markdown.match(/^#\s+(.+?)\s+\|\s+OpenReview/m);
  const displayName = titleMatch?.[1]?.trim() || "ICLR Workshop";
  const websiteMatch = markdown.match(/\[(https?:\/\/[^\]\s]+)\]\([^)]+Homepage[^)]*\)/i);
  const emailMatch = markdown.match(/\[([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\]\(mailto:/i);
  return {
    displayName,
    website: websiteMatch?.[1] || "",
    contactEmail: emailMatch?.[1] || ""
  };
}

function extractOrganizerCandidates(markdown, fallbackSource) {
  const lines = markdown.split("\n");
  const candidates = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/organizer|organisers|organizing committee|chairs|workshop chair/i.test(line)) {
      continue;
    }

    for (let j = i; j < Math.min(lines.length, i + 18); j += 1) {
      const l = lines[j];
      for (const m of l.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
        const name = cleanLine(m[1]);
        const url = m[2];
        if (!isLikelyName(name)) continue;
        const key = name.toLowerCase();
        if (!candidates.has(key)) {
          candidates.set(key, {
            name,
            title: "Workshop Organizer",
            affiliation: "待补充",
            linkedIn: /linkedin\.com/i.test(url) ? url : "",
            github: /github\.com/i.test(url) ? url : "",
            gScholar: /scholar\.google/i.test(url) ? url : "",
            sourceLinks: [fallbackSource, url]
          });
        } else {
          const existing = candidates.get(key);
          if (!existing.linkedIn && /linkedin\.com/i.test(url)) existing.linkedIn = url;
          if (!existing.github && /github\.com/i.test(url)) existing.github = url;
          if (!existing.gScholar && /scholar\.google/i.test(url)) existing.gScholar = url;
          if (!existing.sourceLinks.includes(url)) existing.sourceLinks.push(url);
        }
      }

      const cleaned = cleanLine(l);
      if (isLikelyName(cleaned)) {
        const key = cleaned.toLowerCase();
        if (!candidates.has(key)) {
          candidates.set(key, {
            name: cleaned,
            title: "Workshop Organizer",
            affiliation: "待补充",
            linkedIn: "",
            github: "",
            gScholar: "",
            sourceLinks: [fallbackSource]
          });
        }
      }
    }
  }

  return [...candidates.values()];
}

function normalizePerson(person, sourceUrl) {
  const affiliation = person.affiliation || "待补充";
  return {
    personId: makePersonId(person.name, affiliation, sourceUrl),
    name: person.name,
    title: person.title || "待补充",
    affiliation,
    linkedIn: person.linkedIn || "",
    github: person.github || "",
    gScholar: person.gScholar || "",
    sourceLinks: person.sourceLinks && person.sourceLinks.length > 0 ? person.sourceLinks : [sourceUrl]
  };
}

function main() {
  const fetchedAt = new Date().toISOString();
  const committeesMd = fetchMarkdown("https://iclr.cc/Conferences/2026/Committees");
  const programCommitteeMd = fetchMarkdown("https://iclr.cc/Conferences/2026/ProgramCommittee");
  const workshopHubMd = fetchMarkdown("https://openreview.net/group?id=ICLR.cc/2026/Workshop");

  const organizingRoles = parseOrganizingCommittee(committeesMd);
  const programRoles = parseProgramCommittee(programCommitteeMd);
  const workshopGroups = extractWorkshopGroups(workshopHubMd);

  const committeeRoles = [];
  for (const role of [...organizingRoles, ...programRoles]) {
    committeeRoles.push({
      roleLabel: role.roleLabel,
      members: role.members.map((person) =>
        normalizePerson(person, person.sourceLinks?.[0] || "https://iclr.cc/Conferences/2026")
      )
    });
  }

  const workshops = workshopGroups.map((w, index) => {
    const pageMd = fetchMarkdown(w.openreviewUrl);
    const top = parseWorkshopTopInfo(pageMd);
    const siteMd = top.website ? fetchMarkdown(top.website) : "";
    const organizers = extractOrganizerCandidates(
      siteMd || pageMd,
      top.website || w.openreviewUrl
    );

    return {
      workshopId: `iclr2026-ws-${String(index + 1).padStart(2, "0")}`,
      name: top.displayName || w.title,
      openreviewUrl: w.openreviewUrl,
      website: top.website,
      contactEmail: top.contactEmail,
      organizers: organizers.map((person) => normalizePerson(person, top.website || w.openreviewUrl))
    };
  });

  const peopleMap = new Map();
  for (const role of committeeRoles) {
    for (const p of role.members) {
      if (!peopleMap.has(p.personId)) peopleMap.set(p.personId, p);
    }
  }
  for (const ws of workshops) {
    for (const p of ws.organizers) {
      if (!peopleMap.has(p.personId)) peopleMap.set(p.personId, p);
    }
  }

  const payload = {
    conferenceId: "ICLR2026",
    conferenceName: "International Conference on Learning Representations",
    year: 2026,
    officialUrl: "https://iclr.cc/Conferences/2026",
    sources: [
      "https://iclr.cc/Conferences/2026/Committees",
      "https://iclr.cc/Conferences/2026/ProgramCommittee",
      "https://openreview.net/group?id=ICLR.cc/2026/Workshop"
    ],
    fetchedAt,
    extractionPolicy: {
      mode: "precision_first",
      note: "仅写入可从公开页面稳定抽取的字段；无法确认的链接/单位保持为空或待补充。"
    },
    committeeRoles,
    workshops,
    stats: {
      roleGroups: committeeRoles.length,
      committeePeople: committeeRoles.reduce((sum, role) => sum + role.members.length, 0),
      workshops: workshops.length,
      workshopOrganizers: workshops.reduce((sum, ws) => sum + ws.organizers.length, 0),
      uniquePeople: peopleMap.size
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(JSON.stringify(payload.stats, null, 2));
}

main();
