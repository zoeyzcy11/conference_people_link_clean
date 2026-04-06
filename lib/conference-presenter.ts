import { ConferenceProfile } from "@/lib/types";

export type ConferenceLandingInfo = {
  summary: string;
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
    summary:
      "ICLR 是机器学习与表征学习领域的顶级国际会议，聚焦深度学习、生成模型、优化与可信 AI 等方向。本页用于快速导航参会所需资源与组织信息。",
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
    summary: override.summary || defaultSummary(conference),
    venue: override.venue || conference.city || "待官网公布",
    timezone: override.timezone || "待官网公布",
    keywords: override.keywords || [conference.domain, conference.subTrack],
    resources: override.resources || fallbackResources
  };
}
