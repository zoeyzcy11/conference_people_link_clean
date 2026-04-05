import fs from "node:fs";
import path from "node:path";

const seedsPath =
  process.argv[2] || path.resolve(process.cwd(), "data/conferences.seeds.generated.json");
const registryPath =
  process.argv[3] || path.resolve(process.cwd(), "data/conference.official.registry.json");
const existingPath =
  process.argv[4] || path.resolve(process.cwd(), "data/conferences.json");
const outputPath =
  process.argv[5] || path.resolve(process.cwd(), "data/conferences.generated.json");

const seeds = JSON.parse(fs.readFileSync(seedsPath, "utf8"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, "utf8")) : [];

const existingMap = new Map(existing.map((item) => [item.conferenceId, item]));

const normalizeKey = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

const registryMap = new Map(
  Object.entries(registry).map(([key, val]) => [normalizeKey(key), val])
);

const groups = new Map();
const mergedAliases = new Set(["SC FAST", "HPCA FAST", "PwRSoC（2027）"]);
for (const seed of seeds) {
  if (mergedAliases.has(seed.conferenceLabel)) {
    continue;
  }
  const labelNorm = seed.conferenceLabel.replace(/\s+/g, "").toUpperCase();
  const key = `${seed.domain}__${seed.subTrack}__${labelNorm}`;
  if (!groups.has(key)) {
    groups.set(key, {
      domain: seed.domain,
      subTrack: seed.subTrack,
      label: seed.conferenceLabel,
      labelNorm,
      ruBus: new Set(),
      seedIds: []
    });
  }
  const g = groups.get(key);
  g.ruBus.add(seed.ruBu);
  g.seedIds.push(seed.seedId);
}

const now = new Date().toISOString();
const result = [];

for (const g of groups.values()) {
  const reg = registryMap.get(normalizeKey(g.label)) || {};
  const shortLabel = reg.shortName || g.label;
  const shortName = `${shortLabel} ${reg.year || 2026}`;
  const conferenceKey = normalizeKey(g.label) || g.labelNorm;
  const conferenceId = `${conferenceKey}${reg.year || 2026}`;
  const existingItem = existingMap.get(conferenceId);
  const mergedDates = {
    paperDeadline: reg?.dates?.paperDeadline || existingItem?.dates?.paperDeadline || "",
    notification: reg?.dates?.notification || existingItem?.dates?.notification || "",
    conferenceStart: reg?.dates?.conferenceStart || existingItem?.dates?.conferenceStart || "",
    conferenceEnd: reg?.dates?.conferenceEnd || existingItem?.dates?.conferenceEnd || ""
  };
  const mergedUrl = reg.officialUrl || existingItem?.url || "";
  const mergedLocation = reg.location || existingItem?.location || "待官网补充";
  const mergedCity = reg.city || existingItem?.city || "待公布";
  const mergedName = reg.conferenceName || existingItem?.conferenceName || g.label;
  const mergedYear = reg.year || existingItem?.year || 2026;
  const mergedStatus =
    mergedUrl && mergedLocation !== "待官网公布" && mergedLocation !== "待补充"
      ? "published"
      : mergedUrl
        ? "review_pending"
        : "seed_only";

  if (existingItem) {
    result.push({
      ...existingItem,
      domain: g.domain,
      subTrack: g.subTrack,
      conferenceName: mergedName,
      shortName: `${reg.shortName || g.label} ${mergedYear}`,
      year: mergedYear,
      location: mergedLocation,
      city: mergedCity,
      url: mergedUrl,
      dates: mergedDates,
      ruBus: [...g.ruBus],
      seedIds: g.seedIds,
      source: {
        ...(existingItem.source || {}),
        sourceUrl: mergedUrl || existingItem?.source?.sourceUrl || "",
        fetchedAt: now,
        confidence: mergedUrl ? 0.8 : 0.2
      },
      status: mergedStatus
    });
    continue;
  }

  result.push({
    domain: g.domain,
    subTrack: g.subTrack,
    conferenceId,
    conferenceName: mergedName,
    shortName: `${reg.shortName || g.label} ${mergedYear}`,
    year: mergedYear,
    location: mergedLocation,
    city: mergedCity,
    url: mergedUrl,
    dates: mergedDates,
    ruBus: [...g.ruBus],
    seedIds: g.seedIds,
    committeeRoles: [
      {
        roleKey: "generalChair",
        roleLabel: "大会主席",
        members: [],
        source: {
          sourceUrl: mergedUrl,
          fetchedAt: now,
          confidence: mergedUrl ? 0.4 : 0.1
        }
      },
      {
        roleKey: "programCoChair",
        roleLabel: "程序共同主席",
        members: [],
        source: {
          sourceUrl: mergedUrl,
          fetchedAt: now,
          confidence: mergedUrl ? 0.4 : 0.1
        }
      },
      {
        roleKey: "areaChairs",
        roleLabel: "PC Area Chairs",
        members: [],
        source: {
          sourceUrl: mergedUrl,
          fetchedAt: now,
          confidence: mergedUrl ? 0.4 : 0.1
        }
      }
    ],
    workshops: [],
    source: {
      sourceUrl: mergedUrl,
      fetchedAt: now,
      confidence: mergedUrl ? 0.45 : 0.12
    },
    status: mergedStatus
  });
}

result.sort((a, b) => {
  const d = a.domain.localeCompare(b.domain);
  if (d !== 0) return d;
  const s = a.subTrack.localeCompare(b.subTrack);
  if (s !== 0) return s;
  return a.shortName.localeCompare(b.shortName);
});

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Generated ${result.length} conference profiles -> ${outputPath} (groups: ${groups.size})`);
