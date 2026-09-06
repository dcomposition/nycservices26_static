const numberFormatter = new Intl.NumberFormat("en-US");

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatInteger(value: number): string {
  return numberFormatter.format(Math.round(value));
}

export function formatNumber(value: number, maxFractionDigits = 1): string {
  const hasFraction = !Number.isInteger(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatHours(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(1)} hrs`;
}

export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(1);
}

export function formatAxisDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatFullDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSelectedRange(start: string, end: string): string {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatAppliedPeriod(start: string, end: string): string {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    const month = startDate.toLocaleDateString("en-US", { month: "short" });
    return `${month} ${startDate.getDate()}–${endDate.getDate()}, ${startDate.getFullYear()}`;
  }

  if (sameYear) {
    const startLabel = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endLabel = endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${startLabel} – ${endLabel}, ${endDate.getFullYear()}`;
  }

  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatAvailableThrough(maxDate: string): string {
  return `Data available through ${parseIsoDate(maxDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
