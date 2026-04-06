"use client";

import * as Dialog from "@radix-ui/react-dialog";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { DatabaseZap, Filter as FilterIcon, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { cn } from "@/lib/utils";
import { ConferenceFilters, ConferenceProfile } from "@/lib/types";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("加载会议列表失败");
  }
  return (await response.json()) as ConferenceProfile[];
};

const defaultFilters: ConferenceFilters = {
  domain: [],
  subTrack: [],
  year: [],
  city: []
};

export function HomeConsole() {
  const [filters, setFilters] = useState<ConferenceFilters>(defaultFilters);
  const [advancedOpenDesktop, setAdvancedOpenDesktop] = useState(false);
  const { data, isLoading, error } = useSWR("/api/conferences", fetcher);

  const options = useMemo(() => {
    const rows = data ?? [];
    return {
      domains: [...new Set(rows.map((item) => item.domain))].sort(),
      subTracks: [...new Set(rows.map((item) => item.subTrack))].sort(),
      years: [...new Set(rows.map((item) => String(item.year)))].sort(),
      cities: [...new Set(rows.map((item) => item.city))].sort()
    };
  }, [data]);

  const filteredData = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((row) => {
      const okDomain = filters.domain.length === 0 || filters.domain.includes(row.domain);
      const okSubTrack = filters.subTrack.length === 0 || filters.subTrack.includes(row.subTrack);
      const okYear = filters.year.length === 0 || filters.year.includes(String(row.year));
      const okCity = filters.city.length === 0 || filters.city.includes(row.city);
      return okDomain && okSubTrack && okYear && okCity;
    });
  }, [data, filters]);

  const totalCount = data?.length ?? 0;
  const officialReadyCount =
    data?.filter(
      (row) =>
        Boolean(row.url) &&
        row.city !== "待公布" &&
        row.city !== "待补充" &&
        row.location !== "待官网公布" &&
        row.location !== "待补充"
    ).length ?? 0;
  const activeFilterCount =
    filters.domain.length + filters.subTrack.length + filters.year.length + filters.city.length;
  const quickFocusDomains = useMemo(() => {
    const rows = data ?? [];
    const domainCount = new Map<string, number>();
    rows.forEach((row) => {
      domainCount.set(row.domain, (domainCount.get(row.domain) ?? 0) + 1);
    });
    return [...domainCount.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  function onToggle(group: keyof ConferenceFilters, value: string) {
    setFilters((prev) => {
      const exists = prev[group].includes(value);
      return {
        ...prev,
        [group]: exists ? prev[group].filter((item) => item !== value) : [...prev[group], value]
      };
    });
  }

  function onResetFilters() {
    setFilters(defaultFilters);
  }

  function onQuickFilter(group: "domain" | "subTrack" | "year" | "city", value: string) {
    setFilters((prev) => {
      const current = prev[group];
      const isAlreadySingle = current.length === 1 && current[0] === value;
      return {
        ...prev,
        [group]: isAlreadySingle ? [] : [value]
      };
    });
  }

  function onSetGroup(group: "domain" | "subTrack" | "year" | "city", values: string[]) {
    setFilters((prev) => ({
      ...prev,
      [group]: values
    }));
  }

  const filterGroups: Array<{ key: keyof ConferenceFilters; label: string; values: string[] }> = [
    { key: "domain", label: "领域", values: options.domains },
    { key: "subTrack", label: "方向", values: options.subTracks },
    { key: "year", label: "年份", values: options.years },
    { key: "city", label: "城市", values: options.cities }
  ];

  const activeTags = [
    ...filters.domain.map((value) => ({ key: "domain" as const, label: `领域: ${value}`, value })),
    ...filters.subTrack.map((value) => ({ key: "subTrack" as const, label: `方向: ${value}`, value })),
    ...filters.year.map((value) => ({ key: "year" as const, label: `年份: ${value}`, value })),
    ...filters.city.map((value) => ({ key: "city" as const, label: `城市: ${value}`, value }))
  ];

  function renderAdvancedFilterGroups() {
    return (
      <div className="space-y-4">
        {filterGroups.map((group) => (
          <div key={group.key}>
            <p className="mb-2 text-sm font-medium text-slate-700">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const active = filters[group.key].includes(value);
                return (
                  <button
                    key={`${group.key}-${value}`}
                    type="button"
                    onClick={() => onToggle(group.key, value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-line bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-line bg-[#10283c] p-6 text-white shadow-panel lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-12 h-56 w-56 rounded-full bg-[#2e8f7f]/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-72 rounded-full bg-[#1f84a0]/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_46%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr,0.95fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 font-display text-sm font-semibold">A</span>
              <p className="font-display text-xs uppercase tracking-[0.3em] text-white/80">Academic Atlas</p>
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] lg:text-6xl">
              学术顶会资源地图
            </h1>
            <p className="mt-4 max-w-3xl text-base text-white/85 lg:text-lg">
              从领域到方向，从会议到组委会与 Workshop Organizer，一次看清学术组织结构与人物链接网络。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {quickFocusDomains.map((item) => (
                <button
                  key={item.domain}
                  type="button"
                  onClick={() => onQuickFilter("domain", item.domain)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    filters.domain.includes(item.domain)
                      ? "border-white/70 bg-white/20 text-white"
                      : "border-white/20 bg-white/5 text-white/90 hover:bg-white/15"
                  )}
                >
                  {item.domain} · {item.count}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-white/70">会议总数</p>
                <p className="mt-2 text-3xl font-semibold">{totalCount}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-white/70">官方已发布</p>
                <p className="mt-2 text-3xl font-semibold">{officialReadyCount}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-white/70">当前命中</p>
                <p className="mt-2 text-3xl font-semibold">{filteredData.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <DatabaseZap className="h-4 w-4 text-accent" />
            <span>主筛选在表头，点列名可多选；点击会议行进入详情。</span>
          </div>
          <button
            type="button"
            onClick={() => setAdvancedOpenDesktop((prev) => !prev)}
            className="hidden items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 lg:inline-flex"
          >
            <SlidersHorizontal className="h-4 w-4" />
            高级筛选
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">会议筛选与沙盘</h2>
            <p className="mt-1 text-sm text-slate-500">保留一个主入口：表头筛选。高级筛选只在批量选择时使用。</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  高级筛选
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-30 bg-black/35" />
                <Dialog.Content className="fixed right-0 top-0 z-40 h-full w-[88vw] max-w-sm overflow-y-auto bg-panel p-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="font-display text-lg font-semibold">高级筛选</Dialog.Title>
                    <Dialog.Close asChild>
                      <button type="button" className="rounded-full border border-line p-2">
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="mt-4">{renderAdvancedFilterGroups()}</div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              清空筛选
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeTags.length === 0 ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="h-4 w-4 text-accent2" />
              当前未设置筛选条件
            </span>
          ) : null}
          {activeTags.map((tag) => (
            <button
              key={`${tag.key}-${tag.value}`}
              type="button"
              onClick={() => onToggle(tag.key, tag.value)}
              className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-accent"
            >
              {tag.label}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          {activeFilterCount > 0 ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-accent">
              <FilterIcon className="h-3.5 w-3.5" />
              已启用 {activeFilterCount} 个筛选
            </div>
          ) : null}
        </div>

        {advancedOpenDesktop ? (
          <div className="mt-4 hidden rounded-2xl border border-line bg-white p-4 lg:block">
            {renderAdvancedFilterGroups()}
          </div>
        ) : null}

        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-3xl border border-line bg-white p-6">
              <p className="text-slate-500">正在加载会议数据...</p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-600">
              会议列表加载失败，请稍后重试。
            </div>
          ) : (
            <DataTable
              data={filteredData}
              onQuickFilter={onQuickFilter}
              filters={filters}
              options={options}
              onToggleFilter={onToggle}
              onSetGroup={onSetGroup}
            />
          )}
        </div>
      </section>
    </section>
  );
}
