import { formatDate } from "@/lib/utils";

type TimelineProps = {
  dates: {
    paperDeadline: string;
    notification: string;
    conferenceStart: string;
    conferenceEnd: string;
  };
};

const items = [
  { key: "paperDeadline", label: "投稿截止" },
  { key: "notification", label: "结果通知" },
  { key: "conferenceStart", label: "会议开始" },
  { key: "conferenceEnd", label: "会议结束" }
] as const;

export function Timeline({ dates }: TimelineProps) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.key} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-accent" />
            {index < items.length - 1 ? <div className="mt-2 h-full min-h-12 w-px bg-line" /> : null}
          </div>
          <div className="pb-3">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <p className="mt-1 font-semibold text-ink">{formatDate(dates[item.key])}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
