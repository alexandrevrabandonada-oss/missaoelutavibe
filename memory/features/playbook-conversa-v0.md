# Memory: features/playbook-conversa-v0
Updated: now

## Playbook de Conversa v0

Sistema de scripts conversacionais com chips de objeções e respostas copiáveis, integrado à Missão de Conversa e CRM Drawer.

### Banco de Dados
- **roteiros_conversa** (colunas adicionadas):
  - `objections` JSONB: `[{key, label, reply_text}]`
  - `next_steps` JSONB: `[{key, label, action}]`
  - action: whatsapp | schedule_followup | invite_plus1 | save_contact | open_today | open_mission

### Componentes

**PlaybookSection** (Missão de Conversa)
- Bloco "Roteiro + Objeções" com progressive disclosure
- Botão COPIAR ABERTURA (com invite link anexado)
- Chips de objeções: ao clicar mostra resposta + COPIAR
- Próximo passo (1 toque): 3 CTAs configuráveis

**PlaybookMiniCard** (CRM Drawer)
- Collapsible "Sugestão de mensagem"
- Copiar/WhatsApp rápido
- Objeções compactas (3 chips)
- Follow-up scheduling (7d/14d/30d)

### Hooks
- `usePlaybookConversa(roteiroId)` - Dados do playbook com defaults
- `usePlaybookTracking()` - Tracking de eventos

### Tracking (growth_events)
- playbook_opened { source, objective_key }
- playbook_opening_copied { objective_key }
- playbook_objection_clicked { objective_key, objection_key }
- playbook_reply_copied { objective_key, objection_key }
- playbook_nextstep_clicked { action }

### Defaults (se roteiro não tem)
3 objeções padrão:
- "Não tenho tempo"
- "Não confio"
- "Tudo igual"

3 next_steps padrão:
- Agendar follow-up
- Convidar +1
- Salvar contato

### UX Rules
- Nada novo no bottom nav
- Progressive disclosure (abre quando precisa)
- No CRM drawer: só aparece se status indica "precisa contato"
- Objetivo: copiar abertura → lidar objeção → próximo passo em <30s

### Integração
- VoluntarioMissaoConversa: PlaybookSection abaixo do roteiro
- ContactDetailDrawer: PlaybookMiniCard quando status relevante
- AdminRoteiros: campos objections/next_steps no editor

### Checks Implementados
1. ✅ DB: colunas objections/next_steps na roteiros_conversa
2. ✅ Hook: usePlaybookConversa com defaults
3. ✅ UI Mission: PlaybookSection com chips + copy
4. ✅ UI CRM: PlaybookMiniCard collapsible
5. ✅ Tracking: 5 eventos sem PII
6. ✅ Próximo passo: 1 toque schedule/invite/save
7. ✅ Progressive disclosure
8. ✅ Doc: memory/features/playbook-conversa-v0.md
