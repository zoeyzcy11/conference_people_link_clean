import seeds from "@/data/conferences.seeds.json";
import conferences from "@/data/conferences.json";
import queue from "@/data/review.queue.json";
import iclrKnowledge from "@/data/iclr2026.knowledge.json";
import iclrReviewQueue from "@/data/iclr2026.review_queue.json";
import { ConferenceProfile, ConferenceSeed, PersonAppearance, PersonCard } from "@/lib/types";

export function getConferenceSeeds(): ConferenceSeed[] {
  return seeds as ConferenceSeed[];
}

export function getConferences(): ConferenceProfile[] {
  return conferences as ConferenceProfile[];
}

function toRoleKey(roleLabel: string) {
  const normalized = roleLabel.toLowerCase();
  if (normalized.includes("reviewer")) return "reviewers";
  if (normalized.includes("senior area")) return "seniorAreaChairs";
  if (normalized.includes("area chair")) return "areaChairs";
  if (normalized.includes("program chair")) return "programChairs";
  if (normalized.includes("general chair")) return "generalChair";
  if (normalized.includes("workshop chair")) return "workshopChairs";
  return roleLabel.replace(/\s+/g, "_");
}

function computeVerifiedLinkRatio(knowledge: any) {
  const people = [
    ...knowledge.committeeRoles.flatMap((role: any) => role.members),
    ...knowledge.workshops.flatMap((workshop: any) => workshop.organizers)
  ];
  if (people.length === 0) return 0;
  let total = 0;
  let verified = 0;
  for (const p of people) {
    for (const key of ["linkedIn", "github", "gScholar"]) {
      total += 1;
      if (p.links?.[key]?.status === "verified") verified += 1;
    }
  }
  return total === 0 ? 0 : Number((verified / total).toFixed(3));
}

function buildIclrConference(base: ConferenceProfile): ConferenceProfile {
  const knowledge = iclrKnowledge as any;
  const review = iclrReviewQueue as any[];
  if (!knowledge?.conferenceId) return base;

  return {
    ...base,
    committeeRoles: knowledge.committeeRoles.map((role: any) => {
      const isReviewer = /reviewer/i.test(role.roleLabel);
      const members = isReviewer ? [] : role.members;
      const sourceMembers = role.members || [];
      return {
        roleKey: toRoleKey(role.roleLabel),
        roleLabel: role.roleLabel,
        members,
        source: {
          sourceUrl: sourceMembers?.[0]?.sourceUrls?.[0] || knowledge.officialUrl,
          fetchedAt: knowledge.generatedAt,
          confidence: Math.min(
            0.99,
            Number(
              (
                sourceMembers.reduce((sum: number, m: any) => sum + (m.confidence || 0.78), 0) /
                Math.max(1, sourceMembers.length)
              ).toFixed(3)
            )
          )
        }
      };
    }),
    workshops: knowledge.workshops.map((workshop: any) => ({
      workshopId: workshop.workshopId,
      name: workshop.name,
      description: workshop.organizerExtractionSource
        ? `Organizer source: ${workshop.organizerExtractionSource}`
        : "Organizer extraction completed",
      organizers: workshop.organizers,
      url: workshop.officialSiteUrl || workshop.openreviewVenueUrl,
      source: {
        sourceUrl:
          workshop.officialSiteUrl ||
          workshop.openreviewVenueUrl ||
          knowledge.sources?.workshopHub ||
          knowledge.officialUrl,
        fetchedAt: knowledge.generatedAt,
        confidence: 0.9
      },
      openreviewVenueUrl: workshop.openreviewVenueUrl,
      officialSiteUrl: workshop.officialSiteUrl,
      organizerExtractionSource: workshop.organizerExtractionSource
    })),
    source: {
      sourceUrl: knowledge.officialUrl || base.source.sourceUrl,
      fetchedAt: knowledge.generatedAt || base.source.fetchedAt,
      confidence: 0.92
    },
    dataQuality: {
      hasKnowledgePipeline: true,
      reviewQueueSize: review.length,
      verifiedLinkRatio: computeVerifiedLinkRatio(knowledge)
    },
    reviewerSummary: {
      total:
        knowledge.committeeRoles.find((role: any) => /reviewer/i.test(role.roleLabel))?.members
          .length || 0,
      renderMode: "summary_only"
    }
  };
}

export function getConferenceById(id: string): ConferenceProfile | undefined {
  const found = getConferences().find((conference) => conference.conferenceId === id);
  if (!found) return undefined;
  if (id === "ICLR2026") {
    return buildIclrConference(found);
  }
  return found;
}

export function getWorkshop(conferenceId: string, workshopId: string) {
  const conference = getConferenceById(conferenceId);
  return conference?.workshops.find((workshop) => workshop.workshopId === workshopId);
}

export function getPersonById(pid: string) {
  const appearances: PersonAppearance[] = [];

  let profile: PersonCard | undefined;

  const conferencesForLookup = getConferences().map((conference) =>
    conference.conferenceId === "ICLR2026" ? buildIclrConference(conference) : conference
  );

  conferencesForLookup.forEach((conference) => {
    conference.committeeRoles.forEach((roleGroup) => {
      roleGroup.members.forEach((person) => {
        if (person.personId === pid) {
          profile = person;
          appearances.push({
            conferenceId: conference.conferenceId,
            conferenceName: conference.shortName,
            year: conference.year,
            role: roleGroup.roleLabel
          });
        }
      });
    });

    conference.workshops.forEach((workshop) => {
      workshop.organizers.forEach((person) => {
        if (person.personId === pid) {
          profile = person;
          appearances.push({
            conferenceId: conference.conferenceId,
            conferenceName: `${conference.shortName} / ${workshop.name}`,
            year: conference.year,
            role: "Workshop Organizer"
          });
        }
      });
    });
  });

  return profile ? { profile, appearances } : null;
}

export function getFilterOptions() {
  const data = getConferences();
  return {
    domains: [...new Set(data.map((item) => item.domain))],
    subTracks: [...new Set(data.map((item) => item.subTrack))],
    years: [...new Set(data.map((item) => String(item.year)))],
    cities: [...new Set(data.map((item) => item.city))]
  };
}

export function getReviewQueue() {
  return [
    ...(queue as Array<{
      conferenceId: string;
      reason: string;
      createdAt: string;
      status: "pending" | "approved" | "rejected";
    }>),
    ...((iclrReviewQueue as any[]) || [])
  ];
}
