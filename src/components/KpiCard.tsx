type KpiCardProps = {
  label: string;
  value: string;
  description: string;
};

export function KpiCard({ label, value, description }: KpiCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-3 text-sm leading-5 text-slate-500">{description}</p>
    </article>
  );
}
