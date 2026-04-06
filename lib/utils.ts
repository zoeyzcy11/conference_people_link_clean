import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string) {
  if (!value) {
    return "待官网公布";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "待官网公布";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatMonthDay(value: string) {
  if (!value) return "待公布";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "待公布";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

export function formatDateRangeShort(start: string, end: string) {
  if (!start && !end) return "待官网公布";
  if (!start) return `待定-${formatMonthDay(end)}`;
  if (!end) return formatMonthDay(start);
  return `${formatMonthDay(start)}-${formatMonthDay(end)}`;
}
