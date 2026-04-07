"use client";

import { useEffect, useMemo, useState } from "react";

type AttendanceItem = {
  id: string;
  name: string;
  team: string;
  status: "计划参会" | "已报名" | "已参会";
  note: string;
  createdAt: string;
};

type InsightItem = {
  id: string;
  title: string;
  workshop: string;
  takeaway: string;
  action: string;
  author: string;
  createdAt: string;
};

type OutreachItem = {
  id: string;
  person: string;
  affiliation: string;
  owner: string;
  status: "未联系" | "已联系" | "跟进中" | "已建立合作";
  nextStep: string;
  lastContact: string;
  createdAt: string;
};

type CollaborationState = {
  attendance: AttendanceItem[];
  insights: InsightItem[];
  outreach: OutreachItem[];
};

const EMPTY_STATE: CollaborationState = {
  attendance: [],
  insights: [],
  outreach: []
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  conferenceId: string;
};

export function CollaborationPanel({ conferenceId }: Props) {
  const storageKey = useMemo(() => `collab:${conferenceId}`, [conferenceId]);
  const [state, setState] = useState<CollaborationState>(EMPTY_STATE);
  const [attendanceForm, setAttendanceForm] = useState({
    name: "",
    team: "",
    status: "计划参会" as AttendanceItem["status"],
    note: ""
  });
  const [insightForm, setInsightForm] = useState({
    title: "",
    workshop: "",
    takeaway: "",
    action: "",
    author: ""
  });
  const [outreachForm, setOutreachForm] = useState({
    person: "",
    affiliation: "",
    owner: "",
    status: "未联系" as OutreachItem["status"],
    nextStep: "",
    lastContact: ""
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CollaborationState;
        setState({
          attendance: parsed.attendance || [],
          insights: parsed.insights || [],
          outreach: parsed.outreach || []
        });
      } else {
        setState(EMPTY_STATE);
      }
    } catch {
      setState(EMPTY_STATE);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  function addAttendance() {
    if (!attendanceForm.name.trim()) return;
    setState((prev) => ({
      ...prev,
      attendance: [
        {
          id: uid("att"),
          name: attendanceForm.name.trim(),
          team: attendanceForm.team.trim(),
          status: attendanceForm.status,
          note: attendanceForm.note.trim(),
          createdAt: new Date().toISOString()
        },
        ...prev.attendance
      ]
    }));
    setAttendanceForm({ name: "", team: "", status: "计划参会", note: "" });
  }

  function addInsight() {
    if (!insightForm.title.trim() || !insightForm.takeaway.trim()) return;
    setState((prev) => ({
      ...prev,
      insights: [
        {
          id: uid("ins"),
          title: insightForm.title.trim(),
          workshop: insightForm.workshop.trim(),
          takeaway: insightForm.takeaway.trim(),
          action: insightForm.action.trim(),
          author: insightForm.author.trim(),
          createdAt: new Date().toISOString()
        },
        ...prev.insights
      ]
    }));
    setInsightForm({ title: "", workshop: "", takeaway: "", action: "", author: "" });
  }

  function addOutreach() {
    if (!outreachForm.person.trim() || !outreachForm.owner.trim()) return;
    setState((prev) => ({
      ...prev,
      outreach: [
        {
          id: uid("out"),
          person: outreachForm.person.trim(),
          affiliation: outreachForm.affiliation.trim(),
          owner: outreachForm.owner.trim(),
          status: outreachForm.status,
          nextStep: outreachForm.nextStep.trim(),
          lastContact: outreachForm.lastContact.trim(),
          createdAt: new Date().toISOString()
        },
        ...prev.outreach
      ]
    }));
    setOutreachForm({
      person: "",
      affiliation: "",
      owner: "",
      status: "未联系",
      nextStep: "",
      lastContact: ""
    });
  }

  function removeItem(type: keyof CollaborationState, id: string) {
    setState((prev) => ({
      ...prev,
      [type]: prev[type].filter((item: { id: string }) => item.id !== id)
    }));
  }

  return (
    <section className="space-y-5">
      <article className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
        <h3 className="font-display text-xl font-semibold">参会登记</h3>
        <p className="mt-1 text-sm text-slate-500">记录团队成员是否参会，便于会前协同和现场分工。</p>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="姓名"
            value={attendanceForm.name}
            onChange={(e) => setAttendanceForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="团队/部门"
            value={attendanceForm.team}
            onChange={(e) => setAttendanceForm((p) => ({ ...p, team: e.target.value }))}
          />
          <select
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            value={attendanceForm.status}
            onChange={(e) =>
              setAttendanceForm((p) => ({ ...p, status: e.target.value as AttendanceItem["status"] }))
            }
          >
            <option>计划参会</option>
            <option>已报名</option>
            <option>已参会</option>
          </select>
          <button
            type="button"
            onClick={addAttendance}
            className="rounded-xl border border-accent bg-accent px-3 py-2 text-sm text-white"
          >
            添加登记
          </button>
        </div>
        <input
          className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
          placeholder="备注（可选）"
          value={attendanceForm.note}
          onChange={(e) => setAttendanceForm((p) => ({ ...p, note: e.target.value }))}
        />
        <div className="mt-4 space-y-2">
          {state.attendance.length === 0 ? <p className="text-sm text-slate-400">暂无登记记录</p> : null}
          {state.attendance.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2">
              <p className="text-sm text-slate-700">
                {row.name} · {row.team || "未填团队"} · {row.status}
                {row.note ? ` · ${row.note}` : ""}
              </p>
              <button
                type="button"
                onClick={() => removeItem("attendance", row.id)}
                className="text-xs text-slate-500 hover:text-red-500"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
        <h3 className="font-display text-xl font-semibold">会议洞察</h3>
        <p className="mt-1 text-sm text-slate-500">按模板沉淀结论，后续可复用到团队知识库。</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="洞察标题（必填）"
            value={insightForm.title}
            onChange={(e) => setInsightForm((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="对应 Workshop / Session"
            value={insightForm.workshop}
            onChange={(e) => setInsightForm((p) => ({ ...p, workshop: e.target.value }))}
          />
        </div>
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
          placeholder="关键洞察（必填）"
          value={insightForm.takeaway}
          onChange={(e) => setInsightForm((p) => ({ ...p, takeaway: e.target.value }))}
        />
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr,220px]">
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="后续行动建议（可选）"
            value={insightForm.action}
            onChange={(e) => setInsightForm((p) => ({ ...p, action: e.target.value }))}
          />
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="记录人"
            value={insightForm.author}
            onChange={(e) => setInsightForm((p) => ({ ...p, author: e.target.value }))}
          />
        </div>
        <button
          type="button"
          onClick={addInsight}
          className="mt-2 rounded-xl border border-accent bg-accent px-3 py-2 text-sm text-white"
        >
          添加洞察
        </button>
        <div className="mt-4 space-y-2">
          {state.insights.length === 0 ? <p className="text-sm text-slate-400">暂无洞察记录</p> : null}
          {state.insights.map((row) => (
            <div key={row.id} className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-800">{row.title}</p>
                <button
                  type="button"
                  onClick={() => removeItem("insights", row.id)}
                  className="text-xs text-slate-500 hover:text-red-500"
                >
                  删除
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-600">{row.takeaway}</p>
              <p className="mt-1 text-xs text-slate-500">
                {row.workshop || "未指定会场"} · {row.author || "匿名"}
                {row.action ? ` · 行动：${row.action}` : ""}
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-3xl border border-line bg-panel p-5 shadow-panel">
        <h3 className="font-display text-xl font-semibold">人脉跟进</h3>
        <p className="mt-1 text-sm text-slate-500">记录谁在跟进谁，避免重复触达并共享关系进展。</p>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="目标姓名（必填）"
            value={outreachForm.person}
            onChange={(e) => setOutreachForm((p) => ({ ...p, person: e.target.value }))}
          />
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="单位/公司"
            value={outreachForm.affiliation}
            onChange={(e) => setOutreachForm((p) => ({ ...p, affiliation: e.target.value }))}
          />
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="负责人（必填）"
            value={outreachForm.owner}
            onChange={(e) => setOutreachForm((p) => ({ ...p, owner: e.target.value }))}
          />
          <select
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            value={outreachForm.status}
            onChange={(e) =>
              setOutreachForm((p) => ({ ...p, status: e.target.value as OutreachItem["status"] }))
            }
          >
            <option>未联系</option>
            <option>已联系</option>
            <option>跟进中</option>
            <option>已建立合作</option>
          </select>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="下一步动作"
            value={outreachForm.nextStep}
            onChange={(e) => setOutreachForm((p) => ({ ...p, nextStep: e.target.value }))}
          />
          <input
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="最近联系时间（例如 2026-04-08）"
            value={outreachForm.lastContact}
            onChange={(e) => setOutreachForm((p) => ({ ...p, lastContact: e.target.value }))}
          />
        </div>
        <button
          type="button"
          onClick={addOutreach}
          className="mt-2 rounded-xl border border-accent bg-accent px-3 py-2 text-sm text-white"
        >
          添加跟进
        </button>
        <div className="mt-4 space-y-2">
          {state.outreach.length === 0 ? <p className="text-sm text-slate-400">暂无跟进记录</p> : null}
          {state.outreach.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2">
              <p className="text-sm text-slate-700">
                {row.person} · {row.affiliation || "未填单位"} · 负责人: {row.owner} · 状态: {row.status}
                {row.nextStep ? ` · 下一步: ${row.nextStep}` : ""}
                {row.lastContact ? ` · 最近联系: ${row.lastContact}` : ""}
              </p>
              <button
                type="button"
                onClick={() => removeItem("outreach", row.id)}
                className="text-xs text-slate-500 hover:text-red-500"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
