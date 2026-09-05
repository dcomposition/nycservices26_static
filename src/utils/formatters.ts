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

function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}
