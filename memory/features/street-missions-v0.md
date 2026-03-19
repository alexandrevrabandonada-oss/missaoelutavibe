# Memory: features/street-missions-v0
Updated: now

## Missões de Rua v0 - Street Micro-Actions

Sistema de micro-ações presenciais/territoriais integrado com Território e /r/:code.

### Conceito
Missões de rua são ações presenciais rápidas (10/20/40 min) que voluntários podem gerar diariamente para realizar panfletagem, rodinhas de conversa, visitas domiciliares ou ao comércio no seu território.

### Banco de Dados
- Usa tabela `missions` existente com `type = 'rua'`
- `meta_json` padronizado: `{ kind: "street_micro", acao, tempo_estimado, bairro, cidade, cta_qr, generated_at, completed_at, completion_checkboxes, has_photo }`
- Dedupe 1/dia por voluntário via RPC

### RPCs (SECURITY DEFINER, SET search_path = public)
- `generate_street_mission(_acao, _tempo_estimado, _bairro)` - Gera missão com dedupe diário, associa ao ciclo ativo do escopo (célula > cidade > global)
- `complete_street_mission(_mission_id, _checkboxes, _photo_url)` - Conclui missão com prova leve (checkboxes + foto opcional), loga growth_event `street_mission_done`
- `get_street_mission_metrics(_period_days, _scope_cidade)` - Métricas para Ops: geradas/concluídas, por ação, top bairros/cidades (sem PII)

### Tipos de Ação
- `panfletar` - Panfletagem
- `rodinha` - Rodinha de Conversa
- `visitar` - Visita Domiciliar
- `comercio` - Visita ao Comércio

### Tempo Estimado
- 10 min (padrão)
- 20 min
- 40 min

### UI Voluntário
- `/voluntario/hoje` - Botão/card "Gerar Missão de Rua (10 min)"
- `/voluntario/missao-rua/:id` - Página da missão com:
  - Info da missão (ação, tempo, bairro)
  - QR Code do convite do próprio voluntário
  - 2 scripts curtos (abrir conversa / fechar convite)
  - Formulário de conclusão (checkboxes + foto opcional SEM rosto)

### Prova Leve
- Checkboxes obrigatórios (pelo menos 1):
  - "Iniciei conversas com pessoas"
  - "Mostrei meu QR Code de convite"
  - "Entreguei materiais/panfletos"
- Foto opcional do local (sem rostos por padrão)
- Não requer validação manual (auto-concluída)

### Growth Event
- `street_mission_done` com meta: `{ acao, tempo_estimado, bairro, checkboxes, has_photo }`
- Sem PII (não inclui nomes ou IDs de pessoas abordadas)

### Ops Dashboard
- `StreetMissionMetricsCard` no AdminOps:
  - Total geradas/concluídas + taxa de conclusão
  - Em andamento
  - Breakdown por tipo de ação
  - Top 5 bairros
  - Top 5 cidades (escopo global)

### Hooks
- `useStreetMission()` - Gerar/concluir missão, check diário
- `useStreetMissionMetrics(periodDays, scopeCidade)` - Métricas para Ops

### Integrações
- Território: usa bairro/cidade do perfil do voluntário
- /r/:code: QR exibido na missão é o link de convite pessoal
- Ciclos: missão gerada associada ao ciclo ativo do escopo
- Growth Funnel: evento `street_mission_done` para tracking

### 10 Checks
1. ✅ Dedupe 1/dia por voluntário
2. ✅ QR do convite pessoal exibido
3. ✅ Sem PII nos logs/métricas
4. ✅ Associação ao ciclo ativo
5. ✅ Métricas por ação/bairro/cidade
6. ✅ Mobile-first UI
7. ✅ Prova leve (checkboxes)
8. ✅ Foto opcional sem rosto
9. ✅ Scripts de conversa integrados
10. ✅ Growth event logado
