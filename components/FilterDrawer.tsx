"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Filter, X } from "lucide-react";
import { ConferenceFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterOptionSet = {
  domains: string[];
  subTracks: string[];
  years: string[];
  cities: string[];
};

type FilterDrawerProps = {
  options: FilterOptionSet;
  filters: ConferenceFilters;
  onToggle: (group: keyof ConferenceFilters, value: string) => void;
  onReset: () => void;
};

function FilterContent({ options, filters, onToggle }: FilterDrawerProps) {
  const groups: Array<{ key: keyof ConferenceFilters; label: string; values: string[] }> = [
    { key: "domain", label: "领域", values: options.domains },
    { key: "subTrack", label: "方向", values: options.subTracks },
    { key: "year", label: "年份", values: options.years },
    { key: "city", label: "城市", values: options.cities }
  ];

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="font-display text-base font-semibold text-ink">{group.label}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const active = filters[group.key].includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToggle(group.key, value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    active ? "border-accent bg-accent text-white" : "border-line bg-panel text-slate-600"
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function FilterDrawer(props: FilterDrawerProps) {
  const activeCount =
    props.filters.domain.length +
    props.filters.subTrack.length +
    props.filters.year.length +
    props.filters.city.length;

  return (
    <>
      <aside className="hidden rounded-3xl border border-line bg-panel p-5 shadow-panel lg:sticky lg:top-6 lg:block lg:h-fit">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-slate-500">筛选面板</p>
          <button
            type="button"
            onClick={props.onReset}
            className="rounded-full border border-line px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            清空筛选
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">已选择 {activeCount} 个条件</p>
        <div className="mt-5">
          <FilterContent {...props} />
        </div>
      </aside>

      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium shadow-panel lg:hidden">
            <Filter className="h-4 w-4" />
            筛选（{activeCount}）
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed right-0 top-0 h-full w-[88vw] max-w-sm bg-panel p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <Dialog.Title className="font-display text-lg font-semibold">筛选条件</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-full border border-line p-2">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-slate-500">已选择 {activeCount} 个条件</p>
              <button
                type="button"
                onClick={props.onReset}
                className="rounded-full border border-line px-3 py-1 text-xs text-slate-600"
              >
                清空筛选
              </button>
            </div>
            <div className="mt-4 overflow-y-auto">
              <FilterContent {...props} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
