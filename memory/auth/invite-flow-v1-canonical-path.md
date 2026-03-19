# Memory: auth/invite-flow-v1-canonical-path
Updated: 2026-02-03

Invite flow canonical path: Public invite links point to /aceitar-convite?ref=XXXX (not /auth). This page validates the ref and routes: valid+unlogged → /auth?ref=XXXX&next=/voluntario; valid+logged → applies invite role/scope and redirects to /voluntario or /onboarding; invalid/expired → friendly UI with CTAs to request new invite or proceed to login. Auth page shows "Verificando convite..." state and only soft warnings for invalid invites. Ref and next params are persisted in localStorage (30 min) to survive page reloads. This consolidates invite handling into a single predictable flow without creating duplicate auth paths.
