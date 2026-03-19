# Today Orchestrator v0

## Purpose
Manages module rendering on `/voluntario/hoje` to keep the UI clean, prioritized, and focused (max 3 primary modules visible).

## Architecture

### Hook: `useTodayOrchestrator`
Location: `src/hooks/useTodayOrchestrator.tsx`

Returns:
- `primary: TodayModule[]` - Up to 3 visible modules
- `more: TodayModule[]` - Remaining modules (shown in bottom sheet)
- `dismissModule(key)` - Dismiss a module for 24h
- `isDismissed(key)` - Check if module is dismissed
- `trackMoreOpened(count)` - Track "Ver mais" opened
- `hasMore: boolean` - Whether there are overflow modules
- `moreCount: number` - Count of overflow modules

### Module Priority (lower = more important):
```typescript
0: primary_cta       // "COMEÇAR AGORA" / execution
1: micro_banner      // Micro completion feedback
2: return_complete   // Return mode completion
3: event_followup    // Overdue/pending followups
4: event_cycle       // Event within 36h
5: return_mode       // 48h+ inactive
6: validation_feedback
7: daily_plan        // 3 steps ritual
8: streak            // Habit streak
9: weekly_share      // Weekly share pack
10: first_action
11: bring1
12: quick_capture
13: impact
```

### Dismissal Persistence
Location: `src/lib/todayDismiss.ts`

- Uses localStorage with daily keys: `today_dismiss:YYYY-MM-DD:module_key`
- Auto-expires at midnight (new day = new keys)
- Cleanup runs on mount (removes keys older than 7 days)

### Component: `TodayStack`
Location: `src/components/today/TodayStack.tsx`

- Renders primary modules inline (up to `maxPrimary`, default 3)
- Shows "Ver mais (N)" button when overflow exists
- Opens bottom Sheet with remaining modules
- Supports dismissible modules with X button (hover reveal)

## Tracking Events (no PII)
All events use `log_growth_event` RPC:

| Event | Meta |
|-------|------|
| `today_module_shown` | `{ key, slot: "primary"|"more", position: number, reason?: string }` |
| `today_more_opened` | `{ count }` |
| `today_module_dismissed` | `{ key }` |

Deduplication: Events are tracked once per key per session (using refs).

## Usage

```tsx
const modules: ModuleConfig[] = [
  {
    key: "primary_cta",
    component: <DailyActionCTA />,
    visible: true,
    dismissible: false,
  },
  {
    key: "return_mode",
    component: <ReturnModeBanner />,
    visible: returnMode.isAtRisk,
    dismissible: true,
    reason: "48h_inactive",
  },
  // ... more modules
];

<TodayStack modules={modules} maxPrimary={3} />
```

## UX Rules
1. Max 3 modules visible by default
2. "Ver mais (N)" bottom sheet for overflow
3. "Agora não" (X button) dismisses for 24h
4. Dismissals reset at midnight
5. No PII in tracking
6. Priority ensures urgent items (return_mode, event_followup) surface
