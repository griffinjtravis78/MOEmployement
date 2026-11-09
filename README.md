# MOEmployment: State of Missouri Skills-Based HCM Platform

A government-grade, skills-based talent and intelligence platform for Missouri state agencies. Replaces legacy degree-gated civil service systems with automated AI skill parsing, semantic vector matching (`pgvector`), regional economic benchmarking, and OEO/veterans' preference compliance.

## Tech Stack
- **Backend:** Supabase (PostgreSQL, `pgvector`, PostGIS, Row-Level Security)
- **Frontend:** GitHub Pages, Tailwind CSS, Alpine.js (Single Page Application)

## Architecture Overview
- Multi-tenant data partitioning across state agencies.
- Regional economic zones (`NW`, `NE`, `CENTRAL`, `SW`, `SE`, `RURAL`).
- Employment tiers supporting Full-Time (W-2), Part-Time (W-2), and 1099 Gig contracts.
