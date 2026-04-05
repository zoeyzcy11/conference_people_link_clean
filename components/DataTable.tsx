"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { ConferenceFilters, ConferenceProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type DataTableProps = {
  data: ConferenceProfile[];
  onQuickFilter?: (group: "domain" | "subTrack" | "year" | "city", value: string) => void;
  filters?: ConferenceFilters;
  options?: {
    domains: string[];
    subTracks: string[];
    years: string[];
    cities: string[];
  };
  onToggleFilter?: (group: keyof ConferenceFilters, value: string) => void;
  onSetGroup?: (group: "domain" | "subTrack" | "year" | "city", values: string[]) => void;
};

export function DataTable({
  data,
  onQuickFilter,
  filters,
  options,
  onToggleFilter,
  onSetGroup
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [openFilter, setOpenFilter] = useState<keyof ConferenceFilters | null>(null);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openFilter) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openFilter]);

  const columns = useMemo<ColumnDef<ConferenceProfile>[]>(
    () => [
      {
        accessorKey: "conferenceName",
        header: "会议名称",
        cell: ({ row }) => <span className="font-medium text-accent">{row.original.shortName}</span>
      },
      {
        accessorKey: "domain",
        header: "领域",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickFilter?.("domain", row.original.domain);
            }}
            className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-accent hover:text-accent"
          >
            {row.original.domain}
          </button>
        )
      },
      {
        accessorKey: "subTrack",
        header: "方向",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickFilter?.("subTrack", row.original.subTrack);
            }}
            className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-accent hover:text-accent"
          >
            {row.original.subTrack}
          </button>
        )
      },
      {
        accessorKey: "year",
        header: "年份",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickFilter?.("year", String(row.original.year));
            }}
            className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-accent hover:text-accent"
          >
            {row.original.year}
          </button>
        )
      },
      {
        accessorKey: "location",
        header: "地点",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickFilter?.("city", row.original.city);
            }}
            className="w-full truncate text-left text-slate-700 hover:text-accent"
            title={row.original.location}
          >
            {row.original.location}
          </button>
        )
      },
      {
        id: "conferenceDate",
        header: "会议时间",
        accessorFn: (row) => {
          const { conferenceStart, conferenceEnd } = row.dates;
          if (!conferenceStart || !conferenceEnd) {
            return "待官网公布";
          }
          const start = conferenceStart.slice(5).replace("-", "/");
          const end = conferenceEnd.slice(5).replace("-", "/");
          return `${start}-${end}`;
        }
      },
      {
        id: "officialUrl",
        header: "官网",
        accessorFn: (row) => row.url,
        cell: ({ row }) => {
          const url = row.original.url;
          return url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              官方站
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="text-slate-400">待补充</span>
          );
        }
      }
    ],
    [onQuickFilter]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const rows = table.getRowModel().rows;

  const filterableColumns: Record<string, { key: keyof ConferenceFilters; label: string; values: string[] }> = {
    domain: { key: "domain", label: "领域", values: options?.domains ?? [] },
    subTrack: { key: "subTrack", label: "方向", values: options?.subTracks ?? [] },
    year: { key: "year", label: "年份", values: options?.years ?? [] },
    location: { key: "city", label: "地点", values: options?.cities ?? [] }
  };

  return (
    <div className="rounded-3xl border border-line bg-panel shadow-panel">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold">学术顶会列表</h2>
            <p className="mt-1 text-sm text-slate-500">点击会议行进入详情，按列头可排序。</p>
          </div>
          <div className="rounded-full border border-line bg-white px-3 py-1 text-xs text-slate-600">
            共 {rows.length} 条
          </div>
        </div>
      </div>
      <div className="max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[940px] table-fixed text-sm">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[26%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50/90 text-sm font-semibold text-slate-600 backdrop-blur">
            <tr className="border-b border-line">
              {table.getFlatHeaders().map((header) => {
                const filterMeta = filterableColumns[header.id];
                const selectedCount = filterMeta ? filters?.[filterMeta.key]?.length ?? 0 : 0;

                return (
                  <th key={header.id} className="relative px-5 py-3 text-left">
                    <div className="inline-flex items-center gap-1">
                      {filterMeta ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenFilter((prev) => (prev === filterMeta.key ? null : filterMeta.key))}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition",
                              selectedCount > 0
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-transparent text-slate-700 hover:border-line hover:bg-white"
                            )}
                          >
                            {filterMeta.label}
                            {selectedCount > 0 ? ` (${selectedCount})` : ""}
                          </button>
                          {openFilter === filterMeta.key ? (
                            <div
                              ref={menuRef}
                              className="absolute left-0 top-9 z-20 w-56 rounded-xl border border-line bg-white p-3 shadow-lg"
                            >
                              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                                <span>筛选 {filterMeta.label}</span>
                                <button
                                  type="button"
                                  className="text-accent"
                                  onClick={() => onSetGroup?.(filterMeta.key, [])}
                                >
                                  清空
                                </button>
                              </div>
                              <div className="max-h-56 space-y-1 overflow-auto pr-1">
                                {filterMeta.values.map((value) => {
                                  const checked = filters?.[filterMeta.key]?.includes(value) ?? false;
                                  return (
                                    <label key={`${filterMeta.key}-${value}`} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggleFilter?.(filterMeta.key, value)}
                                      />
                                      <span className="text-xs text-slate-700">{value}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                                <button
                                  type="button"
                                  className="text-xs text-slate-600"
                                  onClick={() => onSetGroup?.(filterMeta.key, filterMeta.values)}
                                >
                                  全选
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-accent"
                                  onClick={() => setOpenFilter(null)}
                                >
                                  完成
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      )}
                      <button type="button" onClick={header.column.getToggleSortingHandler()}>
                        <ArrowUpDown className="h-4 w-4 opacity-60" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-line even:bg-slate-50/35 hover:bg-accent/5"
                onClick={() => router.push(`/conf/${row.original.conferenceId}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-3 align-middle text-slate-800">
                    <div
                      className={cn(
                        "truncate whitespace-nowrap",
                        cell.column.id === "conferenceDate" && "font-mono text-[13px] text-slate-700",
                        cell.column.id === "location" && "font-medium text-slate-700"
                      )}
                      title={String(cell.getValue() ?? "")}
                    >
                      {cell.column.columnDef.cell
                        ? flexRender(cell.column.columnDef.cell, cell.getContext())
                        : String(cell.getValue() ?? "")}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="border-t border-line px-5 py-8 text-center text-sm text-slate-500">
            当前筛选条件下没有结果，建议清空部分筛选后重试。
          </div>
        ) : null}
      </div>
    </div>
  );
}
