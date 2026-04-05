import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceTabs } from "@/components/ConferenceTabs";
import { getConferenceById } from "@/lib/data";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ConferenceDetailPage({ params }: Params) {
  const { id } = await params;
  const conference = getConferenceById(id);
  if (!conference) {
    notFound();
  }

  return (
    <section>
      <Link href="/" className="inline-flex rounded-full border border-line bg-panel px-4 py-2 text-sm text-slate-600">
        返回沙盘总览
      </Link>
      <header className="mt-4 rounded-3xl border border-line bg-panel p-6 shadow-panel">
        <p className="font-display text-sm uppercase tracking-[0.18em] text-slate-500">
          {conference.domain} / {conference.subTrack}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{conference.conferenceName}</h1>
        <p className="mt-3 text-slate-600">{conference.location} · {conference.year}</p>
        {conference.dataQuality ? (
          <div className="mt-3 inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs text-slate-600">
            数据质量: {conference.dataQuality.hasKnowledgePipeline ? "已验证流水线" : "基础数据"}
          </div>
        ) : null}
        {conference.url ? (
          <a href={conference.url} className="mt-2 inline-flex text-accent underline underline-offset-2" target="_blank" rel="noreferrer">
            访问官方网站
          </a>
        ) : (
          <p className="mt-2 text-sm text-slate-400">官网链接待补充</p>
        )}
      </header>

      <ConferenceTabs conference={conference} />
    </section>
  );
}
