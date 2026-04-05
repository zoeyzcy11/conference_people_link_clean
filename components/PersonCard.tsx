"use client";

import Link from "next/link";
import { Github, GraduationCap, Linkedin, Mail } from "lucide-react";
import { PersonCard as Person } from "@/lib/types";

type PersonCardProps = {
  person: Person;
};

export function PersonCard({ person }: PersonCardProps) {
  const linkedInUrl = person.links?.linkedIn?.url || person.linkedIn;
  const githubUrl = person.links?.github?.url || person.github;
  const scholarUrl = person.links?.gScholar?.url || person.gScholar;

  function statusLabel(status?: string) {
    if (status === "verified") return "已验证";
    if (status === "pending") return "待确认";
    return "待补充";
  }

  const qualityLabel =
    person.links?.linkedIn?.status === "verified" ||
    person.links?.github?.status === "verified" ||
    person.links?.gScholar?.status === "verified"
      ? "已验证"
      : "待确认";

  return (
    <article className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
      <div className="flex items-start gap-4">
        {person.photo ? (
          <img
            src={person.photo}
            alt={person.name}
            className="h-14 w-14 rounded-2xl object-cover object-center"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 font-display text-lg font-bold text-accent">
            {person.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <Link href={`/people/${person.personId}`} className="font-display text-lg font-semibold text-ink">
            {person.name}
          </Link>
          <p className="mt-1 text-sm text-slate-500">{person.title}</p>
          <p className="text-sm text-slate-500">{person.affiliation}</p>
          <div className="mt-2 inline-flex rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-500">
            质量: {qualityLabel}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-slate-600">
        {linkedInUrl ? (
          <a className="rounded-full border border-line p-2 hover:bg-accent/5" href={linkedInUrl} target="_blank" rel="noreferrer" title={`LinkedIn ${statusLabel(person.links?.linkedIn?.status)}`}>
            <Linkedin className="h-4 w-4" />
          </a>
        ) : (
          <span className="rounded-full border border-dashed border-line p-2 text-slate-400" title="LinkedIn 待补充">
            <Linkedin className="h-4 w-4" />
          </span>
        )}
        {githubUrl ? (
          <a className="rounded-full border border-line p-2 hover:bg-accent/5" href={githubUrl} target="_blank" rel="noreferrer" title={`GitHub ${statusLabel(person.links?.github?.status)}`}>
            <Github className="h-4 w-4" />
          </a>
        ) : (
          <span className="rounded-full border border-dashed border-line p-2 text-slate-400" title="GitHub 待补充">
            <Github className="h-4 w-4" />
          </span>
        )}
        {scholarUrl ? (
          <a className="rounded-full border border-line p-2 hover:bg-accent/5" href={scholarUrl} target="_blank" rel="noreferrer" title={`Scholar ${statusLabel(person.links?.gScholar?.status)}`}>
            <GraduationCap className="h-4 w-4" />
          </a>
        ) : (
          <span className="rounded-full border border-dashed border-line p-2 text-slate-400" title="Scholar 待补充">
            <GraduationCap className="h-4 w-4" />
          </span>
        )}
        {person.email ? (
          <a className="rounded-full border border-line p-2 hover:bg-accent/5" href={`mailto:${person.email}`}>
            <Mail className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
