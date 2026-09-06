type KpiCardProps = {
  label: string;
  value: string;
  description: string;
  footnote?: string;
  loading?: boolean;
};

export function KpiCard({ label, value, description, footnote, loading }: KpiCardProps) {
  return (
    <article
      className={`rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm${loading ? " opacity-60" : ""}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-3 text-sm leading-5 text-slate-500">{description}</p>
      {footnote ? <p className="mt-1 text-xs text-slate-400">{footnote}</p> : null}
    </article>
  );
}
