"use client";

import { useState } from "react";
import Link from "next/link";
import { ConferenceProfile } from "@/lib/types";
import { Timeline } from "@/components/Timeline";
import { CardGrid } from "@/components/CardGrid";
import { PersonCard } from "@/components/PersonCard";
import { ConferenceLandingInfo } from "@/lib/conference-presenter";
import { formatDateRangeShort } from "@/lib/utils";

type Props = {
  conference: ConferenceProfile;
  landing: ConferenceLandingInfo;
};

const tabs = [
  { key: "overview", label: "概览" },
  { key: "committee", label: "组委会" },
  { key: "workshops", label: "Workshops" }
] as const;

export function ConferenceTabs({ conference, landing }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("overview");
  const reviewerTotal = conference.reviewerSummary?.total ?? 0;
  const committeePeople = conference.committeeRoles
    .filter((role) => !role.roleLabel.toLowerCase().includes("reviewer"))
    .reduce((sum, role) => sum + role.members.length, 0);

  return (
    <section className="mt-6 space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm ${
              activeTab === tab.key ? "border-accent bg-accent text-white" : "border-line bg-panel text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
          <article className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
            <h3 className="font-display text-2xl font-semibold">参会概览</h3>
            <p className="mt-2 text-slate-600">{landing.summary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">会议时间</p>
                <p className="mt-1 font-semibold">{formatDateRangeShort(conference.dates.conferenceStart, conference.dates.conferenceEnd)}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">地点</p>
                <p className="mt-1 font-semibold">{conference.location}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">会场</p>
                <p className="mt-1 font-semibold">{landing.venue}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">时区</p>
                <p className="mt-1 font-semibold">{landing.timezone}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">参会资源入口</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {landing.resources.map((resource) => (
                  <a
                    key={`overview-${resource.label}`}
                    href={resource.url}
                    className="inline-flex rounded-full border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-accent hover:text-accent"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {resource.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">重点方向</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {landing.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-line px-3 py-1 text-sm text-slate-600">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
            <h3 className="font-display text-xl font-semibold">关键时间轴</h3>
            <div className="mt-4">
              <Timeline dates={conference.dates} />
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">本届规模</p>
              <p className="mt-2 text-sm text-slate-700">
                组委会（不含 Reviewer）：{committeePeople} 人
              </p>
              <p className="mt-1 text-sm text-slate-700">Workshops：{conference.workshops.length} 个</p>
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === "committee" ? (
        <div className="space-y-6">
          {conference.committeeRoles.map((role) => (
            <article key={role.roleKey} className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
              <h3 className="font-display text-xl font-semibold">{role.roleLabel}</h3>
              {role.roleLabel.toLowerCase().includes("reviewer") ? (
                <div className="mt-4 rounded-2xl border border-line bg-white p-4">
                  <p className="text-sm text-slate-700">
                    Reviewer 规模较大（{reviewerTotal || role.members.length} 人），默认仅展示统计与检索入口，避免页面性能下降。
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    如需全量导出，请使用 `data/iclr2026.knowledge.json` 或 review 队列文件。
                  </p>
                </div>
              ) : (
                <CardGrid>
                  {role.members.map((member) => (
                    <PersonCard key={member.personId} person={member} />
                  ))}
                </CardGrid>
              )}
            </article>
          ))}
        </div>
      ) : null}

      {activeTab === "workshops" ? (
        <div className="space-y-3">
          {conference.workshops.map((workshop) => (
            <details key={workshop.workshopId} className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{workshop.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{workshop.description}</p>
                  </div>
                  <span className="rounded-full border border-line bg-white px-3 py-1 text-xs text-slate-500">
                    {workshop.organizers.length} organizers
                  </span>
                </div>
              </summary>
              <div className="mt-5 space-y-4">
                <Link
                  href={`/conf/${conference.conferenceId}/ws/${workshop.workshopId}`}
                  className="inline-flex rounded-full border border-accent px-3 py-1 text-sm text-accent"
                >
                  进入 Workshop 详情
                </Link>
                <CardGrid>
                  {workshop.organizers.map((organizer) => (
                    <PersonCard key={organizer.personId} person={organizer} />
                  ))}
                </CardGrid>
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}
