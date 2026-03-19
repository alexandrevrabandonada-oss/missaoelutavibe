# North Star Metrics + Alerts v0

## Objetivo
Painel unificado de métricas "North Star" para monitorar o funil de engajamento → voto, com alertas automáticos quando métricas caem abaixo dos targets.

## RPCs

### `get_north_star_metrics(_window_days, _scope)`
Retorna métricas agregadas do funil:
- **Counts**: signup, approved, active, actions, share, CRM, qualified, hot_support, events
- **Rates**: activation_rate, action_per_active, share_rate, crm_rate, qualify_rate, hot_support_rate, event_conversion
- **Scope**: global, city, cell

### `get_north_star_deltas(_window_days, _scope)`
Mesmo que metrics, mas inclui `delta_*` para cada rate (comparação com período anterior).

### `get_north_star_alerts(_window_days, _scope)`
Gera alertas baseados em thresholds:

| Métrica | Target | Critical |
|---------|--------|----------|
| activation_rate | 30% | <15% |
| share_rate | 20% | <10% |
| crm_rate | 15% | <5% |
| qualify_rate | 50% | <25% |
| hot_support_rate | 30% | <15% |
| event_conversion | 40% | <20% |

## Frontend

### Components
- `NorthStarCard`: KPIs com toggle 7d/30d, deltas, counts summary
- `NorthStarAlertsCard`: Lista de alertas com hints e ações recomendadas
- `NorthStarPulseCard`: Versão compacta para CoordenadorHoje

### Hooks
- `useNorthStarMetrics(windowDays, scope?)`: Métricas com cache 5min
- `useNorthStarAlerts(windowDays, scope?)`: Alertas com observabilidade

### Observabilidade
- `NORTH_STAR_METRICS_FAIL`: Erro ao buscar métricas
- `NORTH_STAR_ALERTS_FAIL`: Erro ao buscar alertas
- `NORTH_STAR_ALERT`: Quando alertas existem (severity=warn)

### Tracking (growth_events)
- `north_star_viewed`
- `north_star_alerts_shown`
- `north_star_copy_clicked`
- `north_star_recommended_action_clicked`

## Integração
- `/admin/ops`: NorthStarCard + NorthStarAlertsCard no topo
- `/coordenador/hoje`: NorthStarPulseCard compacto

## Segurança
- Auth: admin/coordenador apenas
- Zero PII nos payloads
- Escopo respeitado (cidade/célula)
