# NYC 311 Operations Dashboard

Interactive operations dashboard built with NYC 311 Open Data.

## Live Demo

[View the live dashboard](https://nycservices26-static.vercel.app/)

This project analyzes 318,411 NYC 311 service requests created between August 2 and August 31, 2026.

## Overview

The dashboard provides a compact operational view of NYC 311 request volume and performance, including:

- Total service requests
- Closed request rate
- Median resolution time
- Average daily request volume
- Daily request trends
- Top problem categories
- Requests by borough
- Requests by agency
- Request channel distribution

## Key metrics

- 318,411 total requests
- 82.8% closed
- 3.9 hours median resolution time
- 10,613.7 average requests per day

## Data pipeline

The original NYC 311 dataset contained more than 300,000 raw service request records.

A Python preprocessing script using pandas:

1. filters the dataset to the selected date range;
2. cleans timestamps and categorical fields;
3. calculates resolution time;
4. aggregates the data;
5. exports compact JSON files used by the frontend.

The raw CSV is intentionally excluded from the repository.

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Python
- pandas

## Data source

NYC Open Data — 311 Service Requests from 2020 to Present.

Dataset ID: `erm2-nwe9`

## Project status

This repository contains the static MVP of the dashboard.

A future version will connect directly to the NYC Open Data API to support dynamic date ranges and live data updates.
