import type { Metadata } from "next";
import { ReactNode } from "react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "学术顶会知识库",
  description: "学术会议资源网站：顶会、组委会、Workshop、人物档案"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen w-full max-w-[1960px] px-4 py-6 lg:px-10">
          {children}
        </div>
      </body>
    </html>
  );
}
