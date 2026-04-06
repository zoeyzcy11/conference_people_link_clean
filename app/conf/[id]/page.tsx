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
      <header className="relative mt-4 overflow-hidden rounded-[32px] border border-[#89b4ad]/25 bg-gradient-to-br from-[#0e2a40] via-[#184562] to-[#31725e] p-6 text-white shadow-[0_32px_72px_rgba(6,24,38,0.26)] lg:p-9">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#87d4c8]/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-60px] left-1/4 h-36 w-96 rounded-full bg-[#6ac6ff]/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:items-end">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-white/70">
              {conference.domain} / {conference.subTrack}
            </p>
            <h1 className="mt-3 max-w-4xl font-display text-3xl font-semibold leading-tight lg:text-5xl">
              {conference.conferenceName}
            </h1>
            <p className="mt-4 text-base text-white/85 lg:text-lg">
              {conference.location} · {conference.year}
            </p>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/85">{landing.summary}</p>
          </div>

          <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-md lg:p-5">
            <p className="font-display text-xs uppercase tracking-[0.22em] text-white/70">参会快速入口</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {landing.resources.map((resource) => (
                <a
                  key={resource.label}
                  href={resource.url}
                  className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:border-white hover:bg-white/20"
                  target="_blank"
                  rel="noreferrer"
                >
                  {resource.label}
                </a>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {landing.keywords.slice(0, 4).map((keyword) => (
                <span
                  key={`hero-${keyword}`}
                  className="inline-flex rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-xs text-white/80"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <ConferenceTabs conference={conference} landing={landing} />
    </section>
  );
}
