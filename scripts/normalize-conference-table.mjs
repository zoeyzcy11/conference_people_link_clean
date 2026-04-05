import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2] || "/Users/cengchenyu/Downloads/Conference_Table.csv";
const outputPath =
  process.argv[3] ||
  path.resolve(process.cwd(), "data/conferences.seeds.generated.json");

const rows = fs
  .readFileSync(inputPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.split(","));

if (rows.length < 4) {
  throw new Error("CSV 数据行不足，无法解析。");
}

const domainRow = rows[1];
const subTrackRow = rows[2];

const columnMeta = [];
let currentDomain = "";
for (let i = 1; i < subTrackRow.length; i += 1) {
  if (domainRow[i] && domainRow[i].trim()) {
    currentDomain = domainRow[i].trim();
  }
  const subTrack = (subTrackRow[i] || "").trim();
  columnMeta.push({
    col: i,
    domain: currentDomain,
    subTrack
  });
}

const seeds = [];
let currentRuBu = "";

for (let r = 3; r < rows.length; r += 1) {
  const row = rows[r];
  if ((row[0] || "").trim()) {
    currentRuBu = row[0].trim();
  }
  if (!currentRuBu) {
    continue;
  }
  columnMeta.forEach((meta) => {
    const conferenceLabel = (row[meta.col] || "")
      .replace(/\u3000/g, " ")
      .trim();
    if (!conferenceLabel) {
      return;
    }
    seeds.push({
      seedId: `seed-${r + 1}-${currentRuBu}-${meta.subTrack}-${conferenceLabel}`
        .replace(/\s+/g, "")
        .replace(/[^\w\-\u4e00-\u9fa5]/g, "_"),
      ruBu: currentRuBu,
      domain: meta.domain,
      subTrack: meta.subTrack,
      conferenceLabel,
      sourceRow: r + 1
    });
  });
}

fs.writeFileSync(outputPath, JSON.stringify(seeds, null, 2));
console.log(`Generated ${seeds.length} seeds -> ${outputPath}`);
