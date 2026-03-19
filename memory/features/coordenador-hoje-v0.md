# Memory: features/coordenador-hoje-v0
Updated: now

Coordenador Hoje v0: Daily coordinator inbox panel (/coordenador/hoje) accessible only to coordinator+ roles. Displays three KPI cards: overdue follow-ups (proxima_acao_em < now), at-risk volunteers (first_action done but no bring+1 in 48h), and stalled missions (em_andamento > 2 days). Actions include "copy careful reminder message" and "open WhatsApp" with tracking. Delegation feature assigns contacts to other volunteers via 'assignee_id' column. RPCs: get_coordinator_inbox_metrics, get_coordinator_overdue_followups, get_coordinator_at_risk_volunteers, get_coordinator_stalled_missions, assign_followup_to_volunteer. Tracking events: coordinator_inbox_viewed, coordinator_whatsapp_opened, coordinator_followup_assigned.
