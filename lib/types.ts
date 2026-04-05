export type PersonCard = {
  personId: string;
  conferenceId?: string;
  name: string;
  title: string;
  role?: string;
  affiliation: string;
  linkedIn: string;
  github: string;
  gScholar: string;
  sourceUrls?: string[];
  evidenceText?: string;
  confidence?: number;
  links?: {
    linkedIn: LinkField;
    github: LinkField;
    gScholar: LinkField;
  };
  source?: "auto" | "manual";
  email?: string;
  photo?: string;
};

export type LinkField = {
  url: string;
  status: "verified" | "pending" | "empty";
  confidence: number;
  matchReason: string;
  verifiedBy: "auto" | "manual";
  sourceUrls: string[];
};

export type SourceMeta = {
  sourceUrl: string;
  fetchedAt: string;
  confidence: number;
};

export type CommitteeRole = {
  roleKey: string;
  roleLabel: string;
  members: PersonCard[];
  source: SourceMeta;
};

export type Workshop = {
  workshopId: string;
  name: string;
  description: string;
  organizers: PersonCard[];
  url: string;
  source: SourceMeta;
  openreviewVenueUrl?: string;
  officialSiteUrl?: string;
  organizerExtractionSource?: string;
};

export type ConferenceSeed = {
  seedId: string;
  ruBu: string;
  domain: string;
  subTrack: string;
  conferenceLabel: string;
  sourceRow: number;
};

export type ConferenceProfile = {
  domain: string;
  subTrack: string;
  conferenceId: string;
  conferenceName: string;
  shortName: string;
  year: number;
  location: string;
  city: string;
  url: string;
  dates: {
    paperDeadline: string;
    notification: string;
    conferenceStart: string;
    conferenceEnd: string;
  };
  ruBus: string[];
  seedIds: string[];
  committeeRoles: CommitteeRole[];
  workshops: Workshop[];
  source: SourceMeta;
  status: "published" | "review_pending" | "seed_only";
  dataQuality?: {
    hasKnowledgePipeline: boolean;
    reviewQueueSize: number;
    verifiedLinkRatio: number;
  };
  reviewerSummary?: {
    total: number;
    renderMode: "summary_only";
  };
};

export type ConferenceFilters = {
  domain: string[];
  subTrack: string[];
  year: string[];
  city: string[];
};

export type PersonAppearance = {
  conferenceId: string;
  conferenceName: string;
  year: number;
  role: string;
};
