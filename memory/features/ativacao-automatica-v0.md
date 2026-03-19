# Memory: features/ativacao-automatica-v0
Updated: now

Ativação Automática v0.1: Auto-assigns a first mission when a volunteer is approved, using database triggers. Mission types are contextual: "Convide 1 pessoa" for users who haven't shared yet, or "Fazer check-in do dia" for users who already shared. Missions are linked to the active cycle (cell > city > global scope priority) with dedupe logic (1 per user).

A "5 minutes" modal (FirstActivationModal) appears once after approval with 2 CTAs:
1. "Fazer agora" - navigates to mission or check-in page
2. "Compartilhar agora" - opens SharePackModal with first available template

Tracking events: `first_mission_assigned`, `first_share_opened`, `first_share_completed`. Admin Ops displays conversion metrics (approved → first_action rate).

Key files: `useFirstActivation.tsx`, `FirstActivationModal.tsx`, `FirstActivationMetricsCard.tsx`. Database: `assign_first_mission_on_approval` RPC, `on_approval_assign_first_mission` trigger.
