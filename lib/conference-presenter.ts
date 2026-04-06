import { ConferenceProfile } from "@/lib/types";

export type ConferenceLandingInfo = {
  introType: "official" | "template";
  introTitle: string;
  summary: string;
  introSourceLabel?: string;
  introSourceUrl?: string;
  introUpdatedAt?: string;
  venue: string;
  timezone: string;
  keywords: string[];
  resources: Array<{
    label: string;
    url: string;
  }>;
};

const landingOverrides: Record<string, Partial<ConferenceLandingInfo>> = {
  ICLR2026: {
    introType: "official",
    introTitle: "官网简介（整理版）",
    summary:
      "根据 ICLR 官方介绍，会议长期聚焦表征学习及其相关机器学习前沿议题，覆盖深度学习、生成建模、优化方法与可信 AI 等方向，是该领域最具影响力的国际会议之一。",
    introSourceLabel: "ICLR 2026 官网",
    introSourceUrl: "https://iclr.cc/Conferences/2026",
    venue: "RioCentro Convention Center",
    timezone: "巴西时间 BRT (UTC-3)",
    keywords: ["Representation Learning", "Foundation Models", "Generative AI", "Optimization", "Trustworthy AI"],
    resources: [
      { label: "会议官网", url: "https://iclr.cc/Conferences/2026" },
      { label: "会务日程", url: "https://iclr.cc/Conferences/2026/Schedule" },
      { label: "注册入口", url: "https://iclr.cc/Conferences/2026/Register" },
      { label: "OpenReview", url: "https://openreview.net/group?id=ICLR.cc/2026/Conference" }
    ]
  }
};

function defaultSummary(conference: ConferenceProfile) {
  return `${conference.shortName} 是 ${conference.subTrack} 方向的重要国际会议。本页聚焦参会资源导航，帮助你快速定位官网入口、会期信息、组委会与 Workshop 组织者。`;
}

export function getConferenceLandingInfo(conference: ConferenceProfile): ConferenceLandingInfo {
  const override = landingOverrides[conference.conferenceId] || {};
  const fallbackResources = conference.url ? [{ label: "会议官网", url: conference.url }] : [];

  return {
    introType: override.introType || "template",
    introTitle: override.introTitle || "会议简介",
    summary: override.summary || defaultSummary(conference),
    introSourceLabel: override.introSourceLabel || "会议官网",
    introSourceUrl: override.introSourceUrl || conference.source?.sourceUrl || conference.url || "",
    introUpdatedAt: override.introUpdatedAt || conference.source?.fetchedAt || "",
    venue: override.venue || conference.city || "待官网公布",
    timezone: override.timezone || "待官网公布",
    keywords: override.keywords || [conference.domain, conference.subTrack],
    resources: override.resources || fallbackResources
  };
}
