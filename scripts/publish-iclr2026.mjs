import fs from "node:fs";
import path from "node:path";
import { ICLR_2026 } from "./iclr2026.pipeline.shared.mjs";

const enrichedPath =
  process.argv[2] || path.resolve(process.cwd(), "data/iclr2026.enriched.json");
const knowledgePath =
  process.argv[3] || path.resolve(process.cwd(), "data/iclr2026.knowledge.json");
const reviewQueuePath =
  process.argv[4] || path.resolve(process.cwd(), "data/iclr2026.review_queue.json");
const manualOverridesPath = path.resolve(process.cwd(), "data/iclr2026.manual_overrides.json");

if (!fs.existsSync(enrichedPath)) {
  throw new Error(`enriched dataset not found: ${enrichedPath}`);
}

if (!fs.existsSync(manualOverridesPath)) {
  const seed = {
    conferenceId: ICLR_2026.conferenceId,
    generatedAt: new Date().toISOString(),
    notes: "manual > auto. 可按 personId 或 name+role 覆盖。",
    overrides: []
  };
  fs.writeFileSync(manualOverridesPath, JSON.stringify(seed, null, 2), "utf8");
}

const enriched = JSON.parse(fs.readFileSync(enrichedPath, "utf8"));
const manual = JSON.parse(fs.readFileSync(manualOverridesPath, "utf8"));
const overrides = manual.overrides || [];
const removedPersonIds = new Set(manual.removedPersonIds || []);

function applyOverride(person, roleLabel) {
  const byId = overrides.find((item) => item.personId && item.personId === person.personId);
  const byNameRole = overrides.find(
    (item) => !item.personId && item.name === person.name && item.role === roleLabel
  );
  const matched = byId || byNameRole;
  if (!matched) return person;

  const patch = matched.patch || {};
  const patched = {
    ...person,
    ...patch,
    source: "manual"
  };
  return patched;
}

const committeeRoles = enriched.committeeRoles
  .map((role) => ({
    ...role,
    members: role.members
      .filter((person) => !removedPersonIds.has(person.personId))
      .map((person) => applyOverride(person, role.roleLabel))
  }))
  .filter((role) => role.members.length > 0);

const workshops = enriched.workshops.map((workshop) => ({
  ...workshop,
  organizers: workshop.organizers
    .filter((person) => !removedPersonIds.has(person.personId))
    .map((person) => applyOverride(person, "Workshop Organizer"))
}));

const queue = [];
function pushQueue(person, reason, roleLabel) {
  queue.push({
    conferenceId: ICLR_2026.conferenceId,
    personId: person.personId,
    name: person.name,
    role: roleLabel,
    reason,
    sourceUrls: person.sourceUrls || [],
    createdAt: new Date().toISOString(),
    status: "pending"
  });
}

for (const role of committeeRoles) {
  if (/reviewer/i.test(role.roleLabel)) {
    continue;
  }
  for (const person of role.members) {
    if (!person.affiliation || person.affiliation === "待补充") {
      pushQueue(person, "missing_affiliation", role.roleLabel);
    }
    for (const key of ["linkedIn", "github", "gScholar"]) {
      const linkField = person.links?.[key];
      if (!linkField || linkField.status !== "verified") {
        pushQueue(person, `link_${key}_unverified`, role.roleLabel);
      }
    }
  }
}

for (const workshop of workshops) {
  for (const person of workshop.organizers) {
    if (!person.affiliation || person.affiliation === "待补充") {
      pushQueue(person, "missing_affiliation", "Workshop Organizer");
    }
    for (const key of ["linkedIn", "github", "gScholar"]) {
      const linkField = person.links?.[key];
      if (!linkField || linkField.status !== "verified") {
        pushQueue(person, `link_${key}_unverified`, "Workshop Organizer");
      }
    }
  }
}

const allPeople = [
  ...committeeRoles.flatMap((role) => role.members),
  ...workshops.flatMap((workshop) => workshop.organizers)
];
const uniquePeople = new Map(allPeople.map((person) => [person.personId, person]));

const knowledge = {
  conferenceId: ICLR_2026.conferenceId,
  conferenceName: ICLR_2026.conferenceName,
  year: ICLR_2026.year,
  officialUrl: ICLR_2026.officialUrl,
  sources: {
    official: [
      ICLR_2026.officialUrl,
      ICLR_2026.committeesUrl,
      ICLR_2026.programCommitteeUrl
    ],
    workshopHub: ICLR_2026.workshopHubUrl
  },
  extractionPolicy: {
    mode: "precision_first",
    threshold: 0.92,
    note: "仅自动发布高置信链接；其余进入 review_queue。"
  },
  generatedAt: new Date().toISOString(),
  committeeRoles,
  workshops,
  stats: {
    roleGroups: committeeRoles.length,
    committeePeople: committeeRoles.reduce((sum, role) => sum + role.members.length, 0),
    workshops: workshops.length,
    workshopOrganizers: workshops.reduce((sum, ws) => sum + ws.organizers.length, 0),
    uniquePeople: uniquePeople.size,
    reviewQueueSize: queue.length
  }
};

fs.writeFileSync(knowledgePath, JSON.stringify(knowledge, null, 2), "utf8");
fs.writeFileSync(reviewQueuePath, JSON.stringify(queue, null, 2), "utf8");

const reviewJsonlPath = reviewQueuePath.replace(/\.json$/, ".jsonl");
const jsonl = queue.map((row) => JSON.stringify(row)).join("\n");
fs.writeFileSync(reviewJsonlPath, jsonl ? `${jsonl}\n` : "", "utf8");

console.log(`Wrote published knowledge -> ${knowledgePath}`);
console.log(`Wrote review queue -> ${reviewQueuePath}`);
console.log(`Wrote review queue jsonl -> ${reviewJsonlPath}`);
console.log(JSON.stringify(knowledge.stats, null, 2));
