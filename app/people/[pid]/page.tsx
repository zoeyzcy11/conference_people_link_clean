import { notFound } from "next/navigation";
import { Github, GraduationCap, Linkedin } from "lucide-react";
import { getPersonById } from "@/lib/data";

type Params = {
  params: Promise<{ pid: string }>;
};

export default async function PeopleDetailPage({ params }: Params) {
  const { pid } = await params;
  const data = getPersonById(pid);
  if (!data) {
    notFound();
  }

  const { profile, appearances } = data;
  const linkedInUrl = profile.links?.linkedIn?.url || profile.linkedIn;
  const githubUrl = profile.links?.github?.url || profile.github;
  const scholarUrl = profile.links?.gScholar?.url || profile.gScholar;

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-line bg-panel p-6 shadow-panel">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 font-display text-2xl font-bold text-accent">
            {profile.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold">{profile.name}</h1>
            <p className="mt-1 text-slate-600">
              {profile.title} · {profile.affiliation}
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2 text-slate-600">
          {linkedInUrl ? (
            <a className="rounded-full border border-line p-2 hover:bg-accent/5" href={linkedInUrl} target="_blank" rel="noreferrer">
              <Linkedin className="h-4 w-4" />
            </a>
          ) : null}
          {githubUrl ? (
            <a className="rounded-full border border-line p-2 hover:bg-accent/5" href={githubUrl} target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" />
            </a>
          ) : null}
          {scholarUrl ? (
            <a className="rounded-full border border-line p-2 hover:bg-accent/5" href={scholarUrl} target="_blank" rel="noreferrer">
              <GraduationCap className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </article>

      <article className="rounded-3xl border border-line bg-panel p-6 shadow-panel">
        <h2 className="font-display text-2xl font-semibold">跨会议任职记录</h2>
        <div className="mt-4 space-y-3">
          {appearances.map((item, index) => (
            <div key={`${item.conferenceId}-${item.role}-${index}`} className="rounded-2xl border border-line bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.year}</p>
              <p className="mt-1 font-semibold">{item.conferenceName}</p>
              <p className="text-sm text-slate-600">{item.role}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-3xl border border-line bg-panel p-6 shadow-panel">
        <h2 className="font-display text-2xl font-semibold">Scholar 入口</h2>
        <p className="mt-2 text-slate-600">点击下方按钮访问 Google Scholar 主页（iframe 可按需求后续开启）。</p>
        {scholarUrl ? (
          <a href={scholarUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-accent px-4 py-2 text-sm text-accent">
            打开 Scholar
          </a>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Scholar 链接待补充</p>
        )}
      </article>
    </section>
  );
}
