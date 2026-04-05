import { ReactNode } from "react";

type CardGridProps = {
  children: ReactNode;
};

export function CardGrid({ children }: CardGridProps) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4">{children}</div>;
}
