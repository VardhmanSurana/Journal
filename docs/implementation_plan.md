# Delta Journal Hardening & UX Elevation Plan

## Phase 1 — Security Hardening (P0)

### 1. Input validation and safe mutation boundaries
- Replace free-form trade update payloads with a typed Pydantic model.
- Reject unknown/invalid field types at API boundary.
- Acceptance: malformed payloads return 422 automatically.

### 2. Eliminate broad exception swallowing in critical paths
- Replace bare `except` with targeted exceptions and safe fallback behavior.
- Acceptance: no silent failures in positions aggregation and risk calculations.

### 3. Operational safety metadata for client decisions
- Add server-side sync/health metadata model (`last_sync_at`, status, stale flags).
- Acceptance: frontend can detect stale data and disable risky actions.

### 4. Security posture visibility
- Add endpoint exposing non-secret operational safety posture:
  - deadman switch configured (from env flag)
  - webhook configured
  - key-present checks (never values)
- Acceptance: UI can prompt users to finish safety setup.

## Phase 2 — Functional UX Features (P1)

### 5. Connection health endpoint
- Add `/api/health/connection` endpoint returning:
  - API status
  - last sync status/time
  - stale thresholds
  - safety posture
- Acceptance: endpoint always returns deterministic schema.

### 6. Sync lifecycle tracking
- Track sync state transitions in memory for current process:
  - `idle` → `running` → `success|failed`.
- Acceptance: failed sync errors are surfaced as safe messages.

## Phase 3 — UI/UX Enhancements (P1)

### 7. Health & safety panel in dashboard shell
- Show live status, last sync recency, stale banner, and safety checklist.
- Acceptance: user can identify unhealthy connection state within one glance.

### 8. Action safety gating
- Disable sync/risk-sensitive actions when stale/failed state is active.
- Acceptance: controls are visibly disabled with rationale tooltip/text.

### 9. Trust-oriented microcopy
- Add clear labels: "Live", "Degraded", "Stale", "Last successful sync".
- Acceptance: no ambiguous status indicators.

## Delivery Sequence
1. Backend schema and exception hardening.
2. Health/sync metadata endpoints.
3. Frontend health data wiring.
4. UI status card + stale warnings + action gating.
5. Validation checks and regression tests.
