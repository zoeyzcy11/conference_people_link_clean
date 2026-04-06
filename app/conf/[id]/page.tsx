import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceTabs } from "@/components/ConferenceTabs";
import { getConferenceById } from "@/lib/data";
import { getConferenceLandingInfo } from "@/lib/conference-presenter";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ConferenceDetailPage({ params }: Params) {
  const { id } = await params;
  const conference = getConferenceById(id);
  if (!conference) {
    notFound();
  }
  const landing = getConferenceLandingInfo(conference);

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
        <p className="mt-3 text-slate-600">
          {conference.location} · {conference.year}
        </p>
        <p className="mt-4 max-w-4xl text-[15px] leading-7 text-slate-700">{landing.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {landing.resources.map((resource) => (
            <a
              key={resource.label}
              href={resource.url}
              className="inline-flex rounded-full border border-line bg-white px-4 py-1.5 text-sm text-slate-700 transition hover:border-accent hover:text-accent"
              target="_blank"
              rel="noreferrer"
            >
              {resource.label}
            </a>
          ))}
        </div>
      </header>

      <ConferenceTabs conference={conference} landing={landing} />
    </section>
  );
}
