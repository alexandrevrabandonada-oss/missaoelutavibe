# Memory: features/growth-funnel-v0
Updated: now

Growth Funnel v0: Conversion tracking from content discovery to active engagement. Captures events: `visit_comecar`, `signup`, `approved`, `onboarding_complete`, `first_action`, `active_7d`. Origin attribution via `template_id` (Fábrica), `invite_code` (referral), and UTM params. Auto-triggers via DB triggers on profile approval, onboarding completion, and first check-in/mission. Admin dashboard shows funnel visualization, conversion rates, top templates, top referrers, and actionable alerts. Stored in `growth_events` table with indexes for performance. RPCs: `log_growth_event` (SECURITY DEFINER, allows anonymous visit), `get_growth_funnel_metrics` (admin-only with scope filtering).
