import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const seedsPath =
  process.argv[2] || path.resolve(process.cwd(), "data/conferences.seeds.generated.json");
const templatesPath =
  process.argv[3] || path.resolve(process.cwd(), "config/crawl.templates.json");
const outputPath =
  process.argv[4] ||
  path.resolve(process.cwd(), "data/conferences.profiles.generated.json");

const seeds = JSON.parse(fs.readFileSync(seedsPath, "utf8"));
const templates = JSON.parse(fs.readFileSync(templatesPath, "utf8"));

function makePersonId(name, affiliation, source) {
  const input = `${name}|${affiliation}|${source}`;
  return `p_${crypto.createHash("sha256").update(input).digest("hex").slice(0, 8)}`;
}

const groups = new Map();
for (const seed of seeds) {
  const key = `${seed.conferenceLabel}-${seed.domain}-${seed.subTrack}`;
  if (!groups.has(key)) {
    groups.set(key, []);
  }
  groups.get(key).push(seed);
}

const profiles = [];
const queue = [];
for (const [key, group] of groups.entries()) {
  const first = group[0];
  const template = templates[first.conferenceLabel] || null;
  const conferenceId = `${first.conferenceLabel}${new Date().getFullYear() + 1}`;

  const profile = {
    domain: first.domain,
    subTrack: first.subTrack,
    conferenceId,
    conferenceName: first.conferenceLabel,
    shortName: conferenceId,
    year: new Date().getFullYear() + 1,
    location: "待补充",
    city: "待补充",
    url: template?.official_url || "",
    dates: {
      paperDeadline: "",
      notification: "",
      conferenceStart: "",
      conferenceEnd: ""
    },
    ruBus: [...new Set(group.map((item) => item.ruBu))],
    seedIds: group.map((item) => item.seedId),
    committeeRoles: [
      {
        roleKey: "generalChair",
        roleLabel: "大会主席",
        members: [],
        source: {
          sourceUrl: template?.committee_source || "",
          fetchedAt: new Date().toISOString(),
          confidence: 0.3
        }
      },
      {
        roleKey: "programCoChair",
        roleLabel: "程序共同主席",
        members: [],
        source: {
          sourceUrl: template?.committee_source || "",
          fetchedAt: new Date().toISOString(),
          confidence: 0.3
        }
      },
      {
        roleKey: "areaChairs",
        roleLabel: "PC Area Chairs",
        members: [
          {
            personId: makePersonId("待抓取", "待抓取", template?.committee_source || key),
            name: "待抓取",
            title: "待补充",
            affiliation: "待补充",
            linkedIn: "",
            github: "",
            gScholar: ""
          }
        ],
        source: {
          sourceUrl: template?.committee_source || "",
          fetchedAt: new Date().toISOString(),
          confidence: 0.25
        }
      }
    ],
    workshops: [
      {
        workshopId: "ws-pending",
        name: "待抓取 Workshop",
        description: "自动抓取后替换",
        organizers: [],
        url: template?.workshop_source || "",
        source: {
          sourceUrl: template?.workshop_source || "",
          fetchedAt: new Date().toISOString(),
          confidence: 0.25
        }
      }
    ],
    source: {
      sourceUrl: template?.official_url || "",
      fetchedAt: new Date().toISOString(),
      confidence: template ? 0.45 : 0.2
    },
    status: "review_pending"
  };

  profiles.push(profile);
  queue.push({
    conferenceId,
    reason: "自动富化结果需人工审核后发布",
    createdAt: new Date().toISOString(),
    status: "pending"
  });
}

fs.writeFileSync(outputPath, JSON.stringify(profiles, null, 2));
fs.writeFileSync(
  path.resolve(path.dirname(outputPath), "review.queue.generated.json"),
  JSON.stringify(queue, null, 2)
);
console.log(`Generated ${profiles.length} profiles -> ${outputPath}`);
