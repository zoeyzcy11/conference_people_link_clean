import Link from "next/link";
import { notFound } from "next/navigation";
import { CardGrid } from "@/components/CardGrid";
import { PersonCard } from "@/components/PersonCard";
import { getConferenceById, getWorkshop } from "@/lib/data";

type Params = {
  params: Promise<{ id: string; wsId: string }>;
};

export default async function WorkshopDetailPage({ params }: Params) {
  const { id, wsId } = await params;
  const conference = getConferenceById(id);
  const workshop = getWorkshop(id, wsId);

  if (!conference || !workshop) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <Link href={`/conf/${id}`} className="inline-flex rounded-full border border-line bg-panel px-4 py-2 text-sm text-slate-600">
        返回会议详情
      </Link>
      <article className="rounded-3xl border border-line bg-panel p-6 shadow-panel">
        <p className="font-display text-sm uppercase tracking-[0.18em] text-slate-500">
          {conference.shortName} / Workshop
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{workshop.name}</h1>
        <p className="mt-3 text-slate-600">{workshop.description}</p>
        <a href={workshop.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-accent px-4 py-2 text-sm text-accent">
          访问 Workshop 页面
        </a>
      </article>

      <article className="rounded-3xl border border-line bg-panel p-6 shadow-panel">
        <h2 className="font-display text-2xl font-semibold">Organizer 列表</h2>
        <CardGrid>
          {workshop.organizers.map((organizer) => (
            <PersonCard key={organizer.personId} person={organizer} />
          ))}
        </CardGrid>
      </article>
    </section>
  );
}
