# Roadmap Gaps

## Action Queue (Fila Unificada)
**Status**: ✅ Implemented (Tijolo Action Queue v0)
**Backend**: Reuses existing hooks (useFollowups, useStreetMission, useConversationMission, useMyTasks, useRoteiroDoDia)
**Frontend**:
- NextActionCard shows priority-1 action
- ActionQueueCard shows top 3 preview
- ActionQueueList at /voluntario/acoes for full view
- Integrated into /voluntario/hoje with collapsible detailed cards

## Certificate Display & Share UI
**Status**: ✅ Implemented (Tijolo 4 + 5)  
**Backend**: Exists (`formacao_certificates` table with RLS, privacy columns, RPCs)  
**Frontend**: 
- CourseCompletionModal with certificate preview, share, and mission suggestions
- CertificateRenderer generates 1:1 and 4:5 images in #ÉLUTA identity
- **NEW**: Public verification page at `/s/cert/:code`
- **NEW**: Privacy settings (full/initials/anon + toggle public)
- **NEW**: OG meta tags for social sharing
- Tracking: certificate_viewed, certificate_shared (with stage meta), post_course_mission_started/completed

**Completed in Tijolo 4**:
- Ver certificado button when progress=100%
- Share via native share or WhatsApp text fallback
- "Aplicar na prática" suggests street or conversation missions
- Hardening: fallback copy text if image export fails

**Completed in Tijolo 5**:
- Public verification route `/s/cert/:code` (anon access)
- Privacy controls in CourseCompletionModal
- RPC `get_certificate_public` (no PII leak)
- RPC `set_certificate_privacy` (owner-only)
- OG tags with react-helmet-async
- Fallback OG image at `/og-default.png`
