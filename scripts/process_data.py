#!/usr/bin/env python3
"""Preprocess NYC 311 service requests into aggregated JSON for the dashboard."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "311_Service_Requests_from_2020_to_Present_20260905.csv"
OUTPUT_DIR = ROOT / "public" / "data"

PERIOD_START = pd.Timestamp("2026-08-02 00:00:00")
PERIOD_END_EXCLUSIVE = pd.Timestamp("2026-09-01 00:00:00")
PERIOD_LAST_DAY = pd.Timestamp("2026-08-31")
N_DAYS = 30

COLUMNS = [
    "Unique Key",
    "Created Date",
    "Closed Date",
    "Agency",
    "Agency Name",
    "Problem (formerly Complaint Type)",
    "Problem Detail (formerly Descriptor)",
    "Status",
    "Borough",
    "Open Data Channel Type",
]


def round1(value) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value), 1)


def safe_share(count: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(count / total * 100, 1)


def clean_text(series: pd.Series, missing: str) -> pd.Series:
    text = series.astype("string").str.strip()
    return text.mask(text.isna() | (text == ""), missing)


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def load_and_filter() -> pd.DataFrame:
    df = pd.read_csv(
        CSV_PATH,
        usecols=COLUMNS,
        dtype=str,
        keep_default_na=True,
        na_values=["", "NA", "N/A", "NULL", "null", "NaN"],
    )

    df["Created Date"] = pd.to_datetime(df["Created Date"], errors="coerce")
    df["Closed Date"] = pd.to_datetime(df["Closed Date"], errors="coerce")
    df = df.dropna(subset=["Created Date"])
    df = df[
        (df["Created Date"] >= PERIOD_START)
        & (df["Created Date"] < PERIOD_END_EXCLUSIVE)
    ].copy()

    for column in (
        "Agency",
        "Agency Name",
        "Problem (formerly Complaint Type)",
        "Problem Detail (formerly Descriptor)",
        "Status",
        "Borough",
        "Open Data Channel Type",
    ):
        df[column] = df[column].astype("string").str.strip()

    valid_close = df["Closed Date"].notna() & (df["Closed Date"] >= df["Created Date"])
    df["resolution_hours"] = pd.NA
    df.loc[valid_close, "resolution_hours"] = (
        df.loc[valid_close, "Closed Date"] - df.loc[valid_close, "Created Date"]
    ).dt.total_seconds() / 3600.0
    df["resolution_hours"] = pd.to_numeric(df["resolution_hours"], errors="coerce")

    df["problem"] = clean_text(df["Problem (formerly Complaint Type)"], "Unknown")
    df["borough"] = clean_text(df["Borough"], "UNSPECIFIED")
    df["channel"] = clean_text(df["Open Data Channel Type"], "UNKNOWN")
    df["agency"] = clean_text(df["Agency"], "UNKNOWN")
    df["agency_name"] = clean_text(df["Agency Name"], "")
    df["status_norm"] = df["Status"].fillna("").str.lower()
    return df


def build_summary(df: pd.DataFrame) -> dict:
    total = int(len(df))
    closed = int((df["status_norm"] == "closed").sum())
    median_hours = round1(df["resolution_hours"].median())
    closed_rate = safe_share(closed, total)
    avg_per_day = round1(total / N_DAYS) if N_DAYS else 0.0
    return {
        "period": {
            "start": PERIOD_START.strftime("%Y-%m-%d"),
            "end": PERIOD_LAST_DAY.strftime("%Y-%m-%d"),
        },
        "totalRequests": total,
        "closedRequests": closed,
        "closedRate": closed_rate if closed_rate is not None else 0.0,
        "medianResolutionHours": median_hours if median_hours is not None else 0.0,
        "avgRequestsPerDay": avg_per_day if avg_per_day is not None else 0.0,
    }


def build_daily_requests(df: pd.DataFrame) -> list[dict]:
    days = pd.date_range(PERIOD_START.normalize(), PERIOD_LAST_DAY.normalize(), freq="D")
    counts = (
        df["Created Date"]
        .dt.normalize()
        .value_counts()
        .reindex(days, fill_value=0)
        .astype(int)
    )
    return [
        {"date": day.strftime("%Y-%m-%d"), "requests": int(count)}
        for day, count in counts.items()
    ]


def build_top_problems(df: pd.DataFrame, total: int) -> list[dict]:
    grouped = (
        df.groupby("problem", dropna=False)
        .agg(
            requests=("problem", "size"),
            medianResolutionHours=("resolution_hours", "median"),
        )
        .sort_values("requests", ascending=False)
        .head(10)
    )
    records = []
    for problem, row in grouped.iterrows():
        median_hours = round1(row["medianResolutionHours"])
        records.append(
            {
                "problem": str(problem),
                "requests": int(row["requests"]),
                "share": safe_share(int(row["requests"]), total),
                "medianResolutionHours": median_hours,
            }
        )
    return records


def build_boroughs(df: pd.DataFrame, total: int) -> list[dict]:
    counts = df["borough"].value_counts(dropna=False)
    return [
        {
            "borough": str(borough),
            "requests": int(count),
            "share": safe_share(int(count), total),
        }
        for borough, count in counts.items()
    ]


def most_common_name(names: pd.Series) -> str:
    names = names[names != ""]
    if names.empty:
        return ""
    return str(names.value_counts().idxmax())


def build_agencies(df: pd.DataFrame, total: int) -> list[dict]:
    grouped = (
        df.groupby("agency", dropna=False)
        .agg(
            requests=("agency", "size"),
            agencyName=("agency_name", most_common_name),
        )
        .sort_values("requests", ascending=False)
        .head(10)
    )
    records = []
    for agency, row in grouped.iterrows():
        agency_code = str(agency)
        agency_name = str(row["agencyName"]) if row["agencyName"] else agency_code
        records.append(
            {
                "agency": agency_code,
                "agencyName": agency_name,
                "requests": int(row["requests"]),
                "share": safe_share(int(row["requests"]), total),
            }
        )
    return records


def build_channels(df: pd.DataFrame, total: int) -> list[dict]:
    counts = df["channel"].value_counts(dropna=False)
    return [
        {
            "channel": str(channel),
            "requests": int(count),
            "share": safe_share(int(count), total),
        }
        for channel, count in counts.items()
    ]


def main() -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Source CSV not found: {CSV_PATH}")

    df = load_and_filter()
    total = int(len(df))
    summary = build_summary(df)
    daily = build_daily_requests(df)
    problems = build_top_problems(df, total)
    boroughs = build_boroughs(df, total)
    agencies = build_agencies(df, total)
    channels = build_channels(df, total)

    outputs = {
        "summary.json": summary,
        "daily_requests.json": daily,
        "top_problems.json": problems,
        "boroughs.json": boroughs,
        "agencies.json": agencies,
        "channels.json": channels,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, payload in outputs.items():
        write_json(OUTPUT_DIR / filename, payload)

    print("NYC 311 preprocessing complete")
    print()
    print(
        f"Filtered period: {PERIOD_START.strftime('%Y-%m-%d')} → "
        f"{PERIOD_LAST_DAY.strftime('%Y-%m-%d')}"
    )
    print(f"Rows processed: {total}")
    print()
    print("Generated:")
    for filename in outputs:
        print(f"✓ public/data/{filename}")
    print()
    print("Validation:")
    print(f"{len(daily)} days in daily_requests.json")
    print(f"{len(problems)} problem categories")
    print(f"{len(agencies)} agencies")
    print()
    print("summary.json")
    print(f"  totalRequests: {summary['totalRequests']}")
    print(f"  closedRequests: {summary['closedRequests']}")
    print(f"  closedRate: {summary['closedRate']}")
    print(f"  medianResolutionHours: {summary['medianResolutionHours']}")
    print(f"  avgRequestsPerDay: {summary['avgRequestsPerDay']}")


if __name__ == "__main__":
    main()
