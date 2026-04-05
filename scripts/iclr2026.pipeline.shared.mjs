import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const ICLR_2026 = {
  conferenceId: "ICLR2026",
  conferenceName: "International Conference on Learning Representations",
  year: 2026,
  officialUrl: "https://iclr.cc/Conferences/2026",
  committeesUrl: "https://iclr.cc/Conferences/2026/Committees",
  programCommitteeUrl: "https://iclr.cc/Conferences/2026/ProgramCommittee",
  workshopHubUrl: "https://openreview.net/group?id=ICLR.cc/2026/Workshop"
};

const PROXY_ENV = {
  ...process.env,
  https_proxy: process.env.https_proxy || "http://127.0.0.1:7890",
  http_proxy: process.env.http_proxy || "http://127.0.0.1:7890",
  all_proxy: process.env.all_proxy || "socks5://127.0.0.1:7890"
};

export function toMirrorUrl(url) {
  return `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
}

export function fetchViaMirror(url, timeoutSec = 35) {
  for (let i = 0; i < 3; i += 1) {
    try {
      const result = execFileSync(
        "curl",
        ["-s", "--max-time", String(timeoutSec), toMirrorUrl(url)],
        {
          encoding: "utf8",
          env: PROXY_ENV,
          maxBuffer: 1024 * 1024 * 15
        }
      );
      if (result && result.length > 200) {
        return result;
      }
    } catch {
      // retry
    }
  }
  return "";
}

export async function fetchViaPlaywright(url) {
  try {
    const mod = await import("playwright");
    const browser = await mod.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    const content = await page.content();
    await browser.close();
    return content;
  } catch {
    return "";
  }
}

export function cleanLine(line) {
  return line
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeAffiliation(value) {
  return /University|Institute|Laborator(y|ies)|Labs|School|College|Center|Research|Meta|Google|Microsoft|OpenAI|NVIDIA|Hugging Face|Apple|Cornell|Stanford|Columbia|ICLR|Therapeutics|Inc\.?|Ltd\.?|Company|Corporation|ETH|CMU|MIT|Genesis/i.test(
    value
  );
}

export function isLikelyName(value) {
  if (!value) return false;
  if (value.length < 3 || value.length > 90) return false;
  if (/^(\d+|Main Navigation|Select Year|Login|Calls|Guides|Attend|Organization|Exhibitors)$/i.test(value)) return false;
  if (/Conference|Workshop|OpenReview|Published:|Readers:|Show details/i.test(value)) return false;
  if (looksLikeAffiliation(value)) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return /^[\p{L}\s.'\-()&]+$/u.test(value);
}

export function slug(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function makePersonId(name, affiliation, source) {
  return `p_${crypto
    .createHash("sha256")
    .update(`${name}|${affiliation}|${source}`)
    .digest("hex")
    .slice(0, 10)}`;
}

export function extractWorkshopGroups(workshopHubMarkdown) {
  const links = [];
  const pattern =
    /\*   \[(ICLR 2026 Workshop [^\]]+)\]\((https:\/\/openreview\.net\/group\?id=ICLR\.cc\/2026\/Workshop\/[^)]+)\)/g;
  for (const match of workshopHubMarkdown.matchAll(pattern)) {
    links.push({
      title: cleanLine(match[1].replace(/^ICLR 2026 Workshop\s*/i, "")),
      openreviewVenueUrl: match[2]
    });
  }
  return links;
}

export function parseOrganizingCommittee(markdown, sourceUrl) {
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
        affiliation: "待补充",
        role: currentRole.roleLabel,
        sourceUrls: [sourceUrl],
        evidenceText: text
      });
    }
  }

  if (currentRole) roles.push(currentRole);
  return roles.filter((role) => role.members.length > 0);
}

export function parseProgramCommittee(markdown, sourceUrl) {
  const lines = markdown.split("\n").map((line) => cleanLine(line)).filter(Boolean);
  const seniors = [];
  const areas = [];
  const reviewers = [];

  lines.forEach((line, idx) => {
    if (line === "Senior Area Chairs") seniors.push(idx);
    if (line === "Area Chairs") areas.push(idx);
    if (line === "Reviewers") reviewers.push(idx);
  });

  if (!seniors.length || !areas.length) return [];

  const startSenior = seniors[seniors.length - 1];
  const startArea = areas.find((idx) => idx > startSenior);
  if (startArea == null) return [];
  const startReviewer = reviewers.find((idx) => idx > startArea) ?? lines.length;

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
        affiliation: "待补充",
        role: roleLabel,
        sourceUrls: [sourceUrl],
        evidenceText: name
      });
    }
    return members;
  }

  // Reviewer is intentionally excluded per product requirement.
  return [
    {
      roleLabel: "Senior Area Chair",
      members: collect(startSenior, startArea, "Senior Area Chair")
    },
    {
      roleLabel: "Area Chair",
      members: collect(startArea, startReviewer, "Area Chair")
    }
  ].filter((item) => item.members.length > 0);
}

export function parseWorkshopTopInfo(markdown) {
  const titleMatch = markdown.match(/^#\s+(.+?)\s+\|\s+OpenReview/m);
  const displayName = titleMatch?.[1]?.trim() || "ICLR Workshop";
  const websiteMatch = markdown.match(/\[(https?:\/\/[^\]\s]+)\]\([^)]+Homepage[^)]*\)/i);
  const emailMatch = markdown.match(/\[([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\]\(mailto:/i);
  return {
    displayName,
    officialSiteUrl: websiteMatch?.[1] || "",
    contactEmail: emailMatch?.[1] || ""
  };
}

export function extractOrganizerCandidates(markdown, fallbackSource) {
  const lines = markdown.split("\n");
  const candidates = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/organizer|organisers|organizing committee|chairs|workshop chair/i.test(line)) {
      continue;
    }

    for (let j = i; j < Math.min(lines.length, i + 22); j += 1) {
      const l = lines[j];
      for (const m of l.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
        const name = cleanLine(m[1]);
        const url = m[2];
        if (!isLikelyName(name)) continue;
        const key = name.toLowerCase();
        if (!candidates.has(key)) {
          candidates.set(key, {
            name,
            affiliation: "待补充",
            role: "Workshop Organizer",
            sourceUrls: [fallbackSource, url],
            evidenceText: cleanLine(l),
            rawLinks: [url]
          });
        } else {
          const p = candidates.get(key);
          if (!p.sourceUrls.includes(url)) p.sourceUrls.push(url);
          if (!p.rawLinks.includes(url)) p.rawLinks.push(url);
        }
      }

      const plain = cleanLine(l);
      if (isLikelyName(plain)) {
        const key = plain.toLowerCase();
        if (!candidates.has(key)) {
          candidates.set(key, {
            name: plain,
            affiliation: "待补充",
            role: "Workshop Organizer",
            sourceUrls: [fallbackSource],
            evidenceText: plain,
            rawLinks: []
          });
        }
      }
    }
  }

  return [...candidates.values()];
}
