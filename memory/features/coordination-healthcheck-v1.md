# Memory: features/coordination-healthcheck-v1
Updated: 2026-02-04

## Healthcheck de Coordenação v1

Atualização do sistema de diagnóstico para classificar erros por severidade e degradar graciosamente.

### Mudanças desde v0

1. **Classificação de Severidade**: Cada check agora tem `severity: "blocking" | "warning"`
2. **UI Separada**: Diagnóstico exibe Bloqueantes vs Avisos em seções distintas
3. **Degradação Graciosa**: `/coordenador/hoje` não mostra "Erro ao carregar" como falha fatal

### Classificação Atual

| RPC | Severidade | Justificativa |
|-----|------------|---------------|
| `get_cell_ops_kpis` | blocking | Core do painel de células |
| `list_city_assignment_requests` | blocking | Triagem de alocações |
| `list_city_cells` | blocking | CRUD de células |
| `get_coordinator_inbox_metrics` | warning | Métricas inbox |
| `get_coordinator_overdue_followups` | warning | Follow-ups |
| `get_coordinator_at_risk_volunteers` | warning | Voluntários em risco |
| `get_coordinator_stalled_missions` | warning | Missões paradas |

### Componentes

1. **CoordinationHealthCard** (`src/components/admin/CoordinationHealthCard.tsx`)
   - Localização: `/admin/diagnostico`, seção "Saúde da Coordenação"
   - Exibe contagens: X bloqueantes / Y avisos / Z OK
   - Duas seções visuais:
     - "Bloqueantes (Operação de Células)" — vermelho
     - "Avisos (não bloqueantes)" — âmbar
   - Items `warning` que falham mostram badge "AVISO" e styling suave

2. **CoordinationErrorBanner** (`src/components/coordinator/CoordinationErrorBanner.tsx`)
   - Localização: `/coordenador/hoje`
   - Mensagem principal: "Métricas temporariamente indisponíveis"
   - Ações:
     - CTA primário: "Operação de Células" → `/coordenador/territorio`
     - Admin: "Ver Diagnóstico" → `/admin/diagnostico`
     - Não-admin: "Copiar erro" (clipboard)
     - Todos: "Tentar novamente"
   - Detalhes técnicos via `<details>` toggle

### Comportamento UX

**Degradação Graciosa**:
- Erros em fontes `warning` não bloqueiam a página
- Usuário pode acessar Operação de Células mesmo com métricas falhando
- Texto amigável explica que "não impede" funcionalidade core

**Detalhes Técnicos**:
- Acessíveis via toggle para debugging
- Incluem mensagem de erro truncada (100 chars)
- Copy-to-clipboard para suporte

### Segurança

- Nenhuma alteração em RPCs ou regras de negócio
- Nenhum PII exposto nos diagnósticos
- Erros são sanitizados antes de exibição

### Arquivos

- `src/components/admin/CoordinationHealthCard.tsx` — diagnóstico admin
- `src/components/coordinator/CoordinationErrorBanner.tsx` — banner gracioso
- `src/hooks/useCoordinatorInbox.tsx` — expõe erros individuais
- `memory/LOVABLE_CONTRATO.md` — ANEXO 2 documenta classificação

### Critérios de Aceite

- [x] `/admin/diagnostico` separa Bloqueantes de Avisos
- [x] RPCs antigas (inbox) aparecem como AVISO, não erro fatal
- [x] `/coordenador/hoje` mostra "temporariamente indisponível" + CTA
- [x] Nenhuma rota nova criada
- [x] Contrato A-G intacto; anexos adicionados
- [x] Sem PII em diagnósticos
