import fs from "node:fs";
import path from "node:path";
import {
  ICLR_2026,
  fetchViaMirror,
  fetchViaPlaywright,
  parseOrganizingCommittee,
  parseProgramCommittee,
  parseWorkshopTopInfo,
  extractOrganizerCandidates,
  slug
} from "./iclr2026.pipeline.shared.mjs";

const inputPath =
  process.argv[2] || path.resolve(process.cwd(), "data/iclr2026.source_manifest.json");
const outputPath =
  process.argv[3] || path.resolve(process.cwd(), "data/iclr2026.extracted.json");

if (!fs.existsSync(inputPath)) {
  throw new Error(`source manifest not found: ${inputPath}`);
}

const manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const committeesMarkdown = fetchViaMirror(ICLR_2026.committeesUrl);
const programMarkdown = fetchViaMirror(ICLR_2026.programCommitteeUrl);

const organizingRoles = parseOrganizingCommittee(committeesMarkdown, ICLR_2026.committeesUrl);
let programRoles = parseProgramCommittee(programMarkdown, ICLR_2026.programCommitteeUrl);

if (programRoles.length === 0) {
  const knowledgeFallbackPath = path.resolve(process.cwd(), "data/iclr2026.knowledge.json");
  if (fs.existsSync(knowledgeFallbackPath)) {
    const fallback = JSON.parse(fs.readFileSync(knowledgeFallbackPath, "utf8"));
    programRoles = (fallback.committeeRoles || [])
      .filter((role) => /senior area chair|area chair/i.test(role.roleLabel))
      .map((role) => ({
        roleLabel: role.roleLabel,
        members: (role.members || []).map((member) => ({
          name: member.name,
          affiliation: member.affiliation || "待补充",
          role: role.roleLabel,
          sourceUrls: member.sourceUrls?.length
            ? member.sourceUrls
            : [ICLR_2026.programCommitteeUrl],
          evidenceText: member.evidenceText || member.name
        }))
      }));
  }
}

async function resolveWorkshopOrganizers(workshop) {
  const openreviewMarkdown = fetchViaMirror(workshop.openreviewVenueUrl);
  const topInfo = parseWorkshopTopInfo(openreviewMarkdown);
  const siteUrl = topInfo.officialSiteUrl || "";

  let siteContent = "";
  let extractionSource = "openreview";

  if (siteUrl) {
    const playwrightHtml = await fetchViaPlaywright(siteUrl);
    if (playwrightHtml) {
      siteContent = playwrightHtml;
      extractionSource = "playwright_html";
    } else {
      siteContent = fetchViaMirror(siteUrl);
      extractionSource = siteContent ? "http_mirror" : "openreview";
    }
  }

  const organizers = extractOrganizerCandidates(
    siteContent || openreviewMarkdown,
    siteUrl || workshop.openreviewVenueUrl
  );

  return {
    workshopId: `iclr2026-ws-${slug(workshop.title || topInfo.displayName || workshop.openreviewVenueUrl)}`,
    name:
      topInfo.displayName && topInfo.displayName !== "ICLR Workshop"
        ? topInfo.displayName
        : workshop.title,
    openreviewVenueUrl: workshop.openreviewVenueUrl,
    officialSiteUrl: siteUrl,
    contactEmail: topInfo.contactEmail || "",
    organizerExtractionSource: extractionSource,
    organizers
  };
}

const workshops = [];
for (const workshop of manifest.workshopVenues) {
  // Keep sequential to avoid hammering sources and getting blocked.
  // This is still fast enough for one conference and preserves stability.
  // eslint-disable-next-line no-await-in-loop
  const resolved = await resolveWorkshopOrganizers(workshop);
  workshops.push(resolved);
}

const extracted = {
  conferenceId: ICLR_2026.conferenceId,
  conferenceName: ICLR_2026.conferenceName,
  year: ICLR_2026.year,
  generatedAt: new Date().toISOString(),
  sourceManifest: inputPath,
  committeeRoles: [...organizingRoles, ...programRoles],
  workshops
};

fs.writeFileSync(outputPath, JSON.stringify(extracted, null, 2), "utf8");
console.log(`Wrote extracted dataset -> ${outputPath}`);
console.log(
  JSON.stringify(
    {
      roleGroups: extracted.committeeRoles.length,
      committeePeople: extracted.committeeRoles.reduce((sum, role) => sum + role.members.length, 0),
      workshops: extracted.workshops.length,
      workshopOrganizers: extracted.workshops.reduce((sum, ws) => sum + ws.organizers.length, 0)
    },
    null,
    2
  )
);
