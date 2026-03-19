# Memory: features/missoes-conversa-v0
Updated: now

## Missões de Conversa v0

Sistema de missões diárias de conversa integrado ao CRM e Roteiros de Conversa.

### Objetivo
Voluntário tem uma missão diária simples: "fazer 3 conversas" usando roteiro aprovado e registrar resultado sem coletar PII extra.

### Banco de Dados

**Tabela: conversa_mission_contacts**
- id, mission_id (FK missions), contact_id (FK crm_contatos)
- outcome: convite_enviado | topou | talvez_depois | nao_agora | numero_errado | sem_resposta
- notes: text (max 240 chars, sanitizado - telefones/emails removidos)
- UNIQUE (mission_id, contact_id)

**Mission meta_json (kind: conversa_v0)**
```json
{
  "kind": "conversa_v0",
  "target_count": 3,
  "actual_count": 2,
  "objective": "convidar|explicar|objecao|fechamento",
  "channel": "whatsapp|presencial|telefone",
  "roteiro_id": "uuid",
  "contact_ids": ["uuid"],
  "cidade": "text",
  "bairro": "text",
  "generated_at": "timestamp"
}
```

### RPCs (SECURITY DEFINER, SET search_path = public)

**generate_conversation_mission(_objective, _channel, _target_count)**
- Dedupe 1/dia por usuário (America/Sao_Paulo timezone)
- Seleciona roteiro aprovado no território matching objetivo
- Puxa até target_count contatos do CRM (atribuido_a = user, status in novo/contatar/em_conversa)
- Cria missão tipo 'conversa' com meta_json.kind='conversa_v0'
- Popular conversa_mission_contacts
- Log growth_event: conversation_mission_generated

**complete_conversation_mission(_mission_id, _results JSONB)**
- Valida ownership (assigned_to = auth.uid())
- Atualiza outcomes na join table
- Sanitiza notes (remove telefones/emails)
- Exige pelo menos 1 outcome != sem_resposta
- Log growth_event: conversation_mission_completed (sem PII)

**get_conversation_mission_metrics(_days, _scope_cidade)**
- Métricas agregadas para Admin
- generated, completed, completion_rate
- outcomes counts, by_objective, top_cities

### RLS
- conversa_mission_contacts: SELECT/UPDATE/INSERT se dono da missão ou admin/coordenador

### Growth Events
- conversation_mission_generated
- conversation_mission_opened  
- conversation_mission_completed
- conversation_script_copied
- conversation_whatsapp_opened

### UI Voluntário

**/voluntario/hoje**
- ConversationMissionCard (compact)
- Select objetivo, botão [Gerar missão] ou [Abrir missão]

**/voluntario/missao-conversa/:id**
- Mostra roteiro (curta/média/longa toggle)
- Botões Copiar/WhatsApp (com tracking)
- Lista de contatos (só primeiro nome + bairro)
- Picker de outcome + notes (240 chars, sanitizado)
- Botão Concluir (exige 1+ outcome)

### UI Admin

**AdminOps**
- ConversationMissionMetricsCard (7d)
- Geradas, concluídas, taxa
- Outcomes agregados, por objetivo, top cidades

### Hooks
- useConversationMission() - today's mission, generate, status
- useConversationMissionDetails(id) - mission + contacts
- useCompleteConversationMission() - complete mutation
- useConversationTracking() - growth event logging
- useConversationMissionMetrics(days, scope) - admin metrics

### Integrações
- Reusa roteiros_conversa (Roteiros de Conversa v0)
- Reusa crm_contatos (CRM v1)
- Tracking via growth_events (Growth Funnel v0)
- Link de convite incluído no WhatsApp

### Checks Implementados
1. ✅ Gera missão (dedupe 1/dia SP)
2. ✅ Seleciona roteiro aprovado por objetivo
3. ✅ Puxa contatos do CRM no escopo
4. ✅ Copiar/WhatsApp trackeiam sem PII
5. ✅ Concluir exige pelo menos 1 outcome
6. ✅ Persistência outcomes em conversa_mission_contacts
7. ✅ RLS impede ver missão/contatos fora do escopo
8. ✅ Admin vê métricas agregadas
9. ✅ Build ok
10. ✅ Doc em memory/features/missoes-conversa-v0.md
