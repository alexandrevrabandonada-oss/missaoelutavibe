# Memory: features/validation-feedback-v0
Updated: now

## Feedback de Validação v0

### Purpose
Closes the evidence → validation → volunteer feedback loop with positive reinforcement and clear guidance. No new main routes.

### Database Changes
**evidences table**:
- Added `rejection_reason_code` (text): Structured codes (foto_ruim|falta_contexto|sem_prova|outro)
- Already had: `validated_by`, `validated_at`, `rejection_reason`, `how_to_fix`

**notificacoes table** (already existed):
- Used for feedback notifications with types: `evidence_approved`, `evidence_rejected`

### RPCs
**validate_evidence_with_feedback(evidence_id, status, reason_code, note)**:
- RBAC: admin or coordinator only
- Updates evidence status and creates notification
- Sanitizes notes (removes phone/email patterns)
- Logs `evidence_validated` growth event (no PII)
- Notification messages based on reason_code

**get_my_validation_feedback(limit)**:
- Returns recent validated evidences (last 7 days)
- Fields: evidence_id, mission_id, mission_title, status, reason_code, reason_text, validated_at, href

### UI Components
**ValidationFeedbackCard** (`src/components/feedback/ValidationFeedbackCard.tsx`):
- Shows on /voluntario/hoje when there are recent validations
- Approved items: Link to view + Share button (if weekly share eligible)
- Rejected items: Reason badge + "Reenviar evidência" button → /voluntario/evidencia/:missionId?reason=code
- Compact and expanded modes

**useValidationFeedback** (`src/hooks/useValidationFeedback.tsx`):
- Fetches `get_my_validation_feedback` RPC
- Tracking: validation_feedback_shown, validation_feedback_opened, evidence_resubmit_clicked
- Dedup view tracking by SP day

### Tracking Events (no PII)
- `validation_feedback_shown`: { count }
- `validation_feedback_opened`: { status }
- `evidence_resubmit_clicked`: { reason_code }
- `evidence_validated`: { status, reason_code } (logged by RPC)

### Integration Points
1. `/voluntario/hoje`: ValidationFeedbackCard after StreakCard
2. `/notificacoes`: Existing page renders evidence_approved/evidence_rejected notifications
3. Admin validation uses new RPC for unified feedback

### Rejection Reason Labels
- `foto_ruim`: "Foto precisa melhorar"
- `falta_contexto`: "Falta contexto"
- `sem_prova`: "Ação não identificada"
- `outro`: "Outro motivo"
