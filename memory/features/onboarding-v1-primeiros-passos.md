# Memory: features/onboarding-v1-primeiros-passos
Updated: 2026-01-23

**Onboarding v1 "Primeiros 10 minutos"**: A guided post-approval flow at `/voluntario/primeiros-passos` with 4 progressive steps:
1. **Confirmar Território**: Verify city/neighborhood/cell
2. **Check-in do Dia**: Navigate to daily check-in
3. **Escolher Ação**: Pick a mission or CRM conversation
4. **Postar no Mural** (optional): Create a post without PII

**Database**: `onboarding_steps` table with step1-4_done booleans, completed_at timestamp. RLS ensures user can only access their own record.

**RPCs**: `get_onboarding_status()`, `mark_onboarding_step_done(step)`, `get_onboarding_metrics(scope)` for Ops dashboard.

**Integration**:
- `OnboardingBanner` component shows in Volunteer Hub when onboarding incomplete
- Ops card shows approved/completed/in-progress counts and completion rate
- Notification "🎉 Você entrou na engrenagem!" created on completion

**Files**: `useOnboardingSteps.tsx`, `VoluntarioPrimeirosPassos.tsx`, `OnboardingBanner.tsx`
