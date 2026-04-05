import fs from "node:fs";
import path from "node:path";

const dataPath = path.resolve(process.cwd(), "data/conferences.json");
const rows = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const issues = [];
const byId = new Set();

const isPlaceholder = (v = "") =>
  ["待官网公布", "待补充", "待公布", ""].includes(String(v).trim());

const isIsoDate = (v = "") => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);

for (const row of rows) {
  if (byId.has(row.conferenceId)) {
    issues.push(`[duplicate-id] ${row.conferenceId}`);
  } else {
    byId.add(row.conferenceId);
  }

  if (!row.conferenceName || !row.shortName) {
    issues.push(`[missing-name] ${row.conferenceId}`);
  }
  if (!row.domain || !row.subTrack) {
    issues.push(`[missing-taxonomy] ${row.conferenceId}`);
  }

  if (!isIsoDate(row?.dates?.paperDeadline)) {
    issues.push(`[bad-date.paperDeadline] ${row.conferenceId}: ${row?.dates?.paperDeadline}`);
  }
  if (!isIsoDate(row?.dates?.notification)) {
    issues.push(`[bad-date.notification] ${row.conferenceId}: ${row?.dates?.notification}`);
  }
  if (!isIsoDate(row?.dates?.conferenceStart)) {
    issues.push(`[bad-date.conferenceStart] ${row.conferenceId}: ${row?.dates?.conferenceStart}`);
  }
  if (!isIsoDate(row?.dates?.conferenceEnd)) {
    issues.push(`[bad-date.conferenceEnd] ${row.conferenceId}: ${row?.dates?.conferenceEnd}`);
  }

  if (row?.dates?.conferenceStart && row?.dates?.conferenceEnd) {
    const start = new Date(row.dates.conferenceStart);
    const end = new Date(row.dates.conferenceEnd);
    if (start > end) {
      issues.push(
        `[date-order] ${row.conferenceId}: conferenceStart(${row.dates.conferenceStart}) > conferenceEnd(${row.dates.conferenceEnd})`
      );
    }
  }

  if (row.url && !/^https?:\/\//.test(row.url)) {
    issues.push(`[bad-url] ${row.conferenceId}: ${row.url}`);
  }
}

const total = rows.length;
const withOfficialUrl = rows.filter((r) => Boolean(r.url)).length;
const withPublishedLocation = rows.filter(
  (r) => !isPlaceholder(r.location) && !isPlaceholder(r.city)
).length;
const withConferenceDate = rows.filter(
  (r) => Boolean(r?.dates?.conferenceStart) && Boolean(r?.dates?.conferenceEnd)
).length;

console.log("Data Quality Snapshot");
console.log(`- total conferences: ${total}`);
console.log(`- with official url: ${withOfficialUrl}`);
console.log(`- with published location/city: ${withPublishedLocation}`);
console.log(`- with conference date range: ${withConferenceDate}`);

if (issues.length === 0) {
  console.log("\nNo blocking issues found.");
  process.exit(0);
}

console.log(`\nFound ${issues.length} issue(s):`);
for (const issue of issues) {
  console.log(`- ${issue}`);
}
process.exit(1);
