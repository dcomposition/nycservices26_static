import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
};

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <header className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}
