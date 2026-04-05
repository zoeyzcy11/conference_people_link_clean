import Link from "next/link";

export default function NotFound() {
  return (
    <section className="rounded-3xl border border-line bg-panel p-8 shadow-panel">
      <h1 className="font-display text-3xl font-semibold">页面未找到</h1>
      <p className="mt-3 text-slate-600">请检查会议 ID / 人物 ID 是否正确，或返回首页继续浏览。</p>
      <Link href="/" className="mt-5 inline-flex rounded-full border border-accent px-4 py-2 text-accent">
        返回首页
      </Link>
    </section>
  );
}
