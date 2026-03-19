# Observabilidade v0 (PII-free Error Tracking)

## Overview
Privacy-safe error tracking system without storing PII (no message/stack traces). Logs sanitized error codes, routes, and allowlisted metadata with rate limiting.

## Database Schema

### Table: `app_errors`
- `id` (uuid, PK)
- `occurred_at` (timestamptz)
- `user_id` (uuid, nullable, FK → auth.users)
- `session_id` (text, nullable)
- `scope_city` (text, nullable - auto-populated from profile)
- `route` (text, max 120 chars)
- `error_code` (text, max 64 chars, alphanumeric only)
- `source` (enum: 'client', 'server', 'rpc')
- `severity` (enum: 'warn', 'error', 'fatal')
- `meta` (jsonb - allowlisted keys only)

### RLS
- SELECT: admins and coordinators only
- INSERT/UPDATE/DELETE: blocked (only via SECURITY DEFINER RPC)

## RPCs

### `log_app_error(_route, _error_code, _source, _severity, _meta, _session_id)`
- **Rate limited**: 30 logs/hour per (user OR session) per error_code
- **Sanitization**:
  - Route: truncated to 120 chars
  - Code: alphanumeric + `_-:.` only, max 64 chars
  - Meta allowlist: `rpc`, `status`, `stage`, `component`, `hint`, `mode`
- **Grants**: anon, authenticated

### `get_app_health_metrics(_period_days, _scope_city)`
- Returns aggregated metrics (total, by_day, top_codes, top_routes, by_source)
- **Auth**: admin/coordinator only
- **Grants**: authenticated

## Frontend Components

### `useObservability()` hook
- `report({ code, source?, severity?, route?, meta? })` - log any error
- `reportRpcError(rpc, status?, stage?, hint?)` - convenience for RPC failures

### `AppErrorBoundary`
- Catches unhandled errors and rejections
- Logs `UNHANDLED_ERROR` / `UNHANDLED_REJECTION` codes
- Shows user-friendly reload UI
- Wraps entire app in `App.tsx`

### `AppHealthCard`
- Dashboard card for `/admin/ops`
- Shows 7d/30d aggregated error metrics
- Top error codes, affected routes, source breakdown
- Mini trend chart

## Security Notes
1. ✅ No PII stored (no message, stack, or raw error text)
2. ✅ Rate limiting prevents log flooding
3. ✅ Only allowlisted meta keys are stored
4. ✅ No direct table inserts (SECURITY DEFINER only)
5. ✅ `SET search_path = public` on all functions

## Usage Examples

```typescript
// In any component
const { report, reportRpcError } = useObservability();

// Generic error
report({ 
  code: 'VALIDATION_FAILED',
  severity: 'warn',
  meta: { component: 'UploadForm', stage: 'parsing' }
});

// RPC failure
try {
  await supabase.rpc('some_function', { ... });
} catch (e) {
  reportRpcError('some_function', e.code, 'execution');
}
```
