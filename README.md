# 学术会议知识库网站（AI 首版）

一个中文界面的学术会议资源网站，支持：

- 沙盘总览（领域/方向/年份/城市过滤）
- 会议详情（概览、组委会、Workshops）
- Workshop 详情（Organizer 展示）
- 人物档案页（跨会议角色履历）
- seed + profile 双层数据结构与半自动富化管线
- ICLR 2026 自动浏览器抓取流水线（sources -> extract -> enrich -> publish）

## 1. 技术栈

- Next.js (App Router) + TypeScript
- TailwindCSS
- shadcn/ui 风格组件（自定义实现）
- lucide-react 图标
- SWR（首页数据获取）
- ESLint + Prettier + Husky + lint-staged

## 2. 目录结构

```text
conference-kb-site
├─ app
│  ├─ page.tsx
│  ├─ conf/[id]/page.tsx
│  ├─ conf/[id]/ws/[wsId]/page.tsx
│  ├─ people/[pid]/page.tsx
│  └─ api
│     ├─ conferences/route.ts
│     ├─ conferences/[id]/route.ts
│     ├─ conferences/[id]/workshops/[wsId]/route.ts
│     ├─ people/[pid]/route.ts
│     ├─ seeds/route.ts
│     └─ review-queue/route.ts
├─ components
│  ├─ DataTable.tsx
│  ├─ FilterDrawer.tsx
│  ├─ PersonCard.tsx
│  ├─ Timeline.tsx
│  ├─ CardGrid.tsx
│  └─ ConferenceTabs.tsx
├─ config/crawl.templates.json
├─ data
│  ├─ conferences.json
│  ├─ conferences.seeds.json
│  ├─ review.queue.json
│  ├─ conferences.seeds.generated.json
│  └─ conferences.profiles.generated.json
├─ lib
│  ├─ data.ts
│  ├─ types.ts
│  └─ utils.ts
└─ scripts
   ├─ normalize-conference-table.mjs
   └─ enrich-conference-profiles.mjs
```

## 3. 安装与运行

```bash
npm install
npm run dev
```

默认访问：

- 首页：`/`
- 会议详情：`/conf/CVPR2026`
- 人物档案：`/people/p_06f4a53f`

## 4. 数据说明

### 4.1 发布数据（前端直接使用）

- `data/conferences.json`
  - `ConferenceProfile[]`，包含会议信息、committeeRoles、workshops、source 与 status。

### 4.2 seed 数据（来自 CSV 结构化）

- `data/conferences.seeds.json`
  - 保存 `RU/BU + Domain + SubTrack + ConferenceLabel` 的基础映射。

### 4.3 审核队列

- `data/review.queue.json`
  - 自动抓取结果进入发布前审核队列。

## 5. 半自动富化流程

1. CSV 标准化（前两行表头继承 + RU/BU 行归并）：

```bash
npm run normalize:csv
```

2. 根据模板生成待审核 profile：

```bash
npm run enrich:profiles
```

3. 人工复核生成文件 `data/conferences.profiles.generated.json`，确认后同步到 `data/conferences.json` 发布。

## 6. ICLR 2026 高精度抓取流水线

```bash
npm run crawl:iclr2026:sources
npm run crawl:iclr2026:extract
npm run enrich:iclr2026:links
npm run publish:iclr2026
```

或一键执行：

```bash
npm run scrape:iclr2026
```

产物文件：

- `data/iclr2026.source_manifest.json`
- `data/iclr2026.extracted.json`
- `data/iclr2026.enriched.json`
- `data/iclr2026.knowledge.json`
- `data/iclr2026.review_queue.json`
- `data/iclr2026.review_queue.jsonl`
- `data/iclr2026.manual_overrides.json`

说明：

- 链接采用高精度阈值（`confidence >= 0.92`）自动发布。
- 未达阈值、缺单位、登录受限页面等会进入 review queue。
- 人工补录遵循 `manual > auto`，并保留来源追溯。

## 7. API 列表

- `GET /api/conferences?domain=&subTrack=&year=&city=`
- `GET /api/conferences/:id`
- `GET /api/conferences/:id/workshops/:wsId`
- `GET /api/people/:pid`
- `GET /api/seeds`
- `GET /api/review-queue`

## 8. PersonCard 字段

```json
{
  "personId": "p_xxxxxxxx",
  "name": "张三",
  "title": "教授",
  "affiliation": "清华大学",
  "linkedIn": "https://linkedin.com/in/zhangsan",
  "github": "https://github.com/zhangsan",
  "gScholar": "https://scholar.google.com/citations?user=ZHANGSAN",
  "email": "optional",
  "photo": "optional"
}
```
