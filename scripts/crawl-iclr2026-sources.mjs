import fs from "node:fs";
import path from "node:path";
import {
  ICLR_2026,
  fetchViaMirror,
  extractWorkshopGroups
} from "./iclr2026.pipeline.shared.mjs";

const outputPath =
  process.argv[2] || path.resolve(process.cwd(), "data/iclr2026.source_manifest.json");

const committeesMarkdown = fetchViaMirror(ICLR_2026.committeesUrl);
const programMarkdown = fetchViaMirror(ICLR_2026.programCommitteeUrl);
const workshopHubMarkdown = fetchViaMirror(ICLR_2026.workshopHubUrl);

const workshopGroups = extractWorkshopGroups(workshopHubMarkdown);

const manifest = {
  conferenceId: ICLR_2026.conferenceId,
  generatedAt: new Date().toISOString(),
  pages: {
    officialHome: ICLR_2026.officialUrl,
    committees: ICLR_2026.committeesUrl,
    programCommittee: ICLR_2026.programCommitteeUrl,
    openreviewWorkshopHub: ICLR_2026.workshopHubUrl
  },
  checks: {
    committeesFetched: committeesMarkdown.length > 1000,
    programCommitteeFetched: programMarkdown.length > 1000,
    workshopHubFetched: workshopHubMarkdown.length > 500,
    workshopCountDiscovered: workshopGroups.length
  },
  workshopVenues: workshopGroups
};

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`Wrote source manifest -> ${outputPath}`);
console.log(`Discovered workshop venues: ${workshopGroups.length}`);
