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
    <div className="space-y-5">
      {items.map((item, index) => (
        <div key={item.key} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3.5 w-3.5 rounded-full border-2 border-accent bg-white" />
            {index < items.length - 1 ? <div className="mt-2 h-full min-h-12 w-px bg-gradient-to-b from-accent/40 to-line" /> : null}
          </div>
          <div className="pb-3">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold leading-none text-ink">{formatDate(dates[item.key])}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
