# Memory: features/ativacao-primeira-acao-v0
Updated: now

First Action Funnel v0: Ensures every new user completes 1 action within 10 minutes. Uses `profiles.first_action_at` and `first_action_kind` columns. Priority: followups > recommended path (conversa/rua from onboarding prefs) > street mission default. Hook `useFirstAction` provides `needsFirstAction`, `getSuggestedFirstAction`, `startFirstAction`, and `completeFirstAction`. Tracked via `first_action` growth event with `meta.stage` (offer_shown, started, completed, failed). UI: `FirstActionCard` (full in `/primeiros-passos`, compact banner in `/hoje`). Auto-triggers: Mission Rua/Conversa completion and CRM QuickAdd call `completeFirstAction()` if `needsFirstAction` is true.
