# Memory: tech/legacy-route-redirects
Updated: 2026-02-03

## Sistema de Redirects de Rotas Legadas

Centraliza todos os redirects de rotas antigas (com hífen) para rotas canônicas (com barra).

### Arquitetura
- **Definição**: `src/components/routing/LegacyRouteRedirects.tsx` contém o mapa `LEGACY_ROUTE_MAP`
- **Integração**: `App.tsx` importa `getLegacyRedirects()` e gera `<Route>` com `<Navigate replace />`
- **Diagnóstico**: `/admin/diagnostico` exibe contagem e lista de rotas legadas na aba "Legados"

### Rotas Mapeadas
Formato: `rota-com-hifen` → `/rota/com/barra`

Exemplos:
- `/voluntario-hoje` → `/voluntario/hoje`
- `/voluntario-missoes` → `/voluntario/missoes`
- `/admin-origens` → `/admin/origens`
- `/coordenador-hoje` → `/coordenador/hoje`

### Características
- Usa `replace` para não poluir histórico do navegador
- Preserva query params e hash na navegação
- Todas as rotas são definidas em um único local (DRY)
- Manifest atualizado automaticamente com `counts.legacyRedirects`

### Manutenção
- Para adicionar nova rota legada: editar `LEGACY_ROUTE_MAP` em `LegacyRouteRedirects.tsx`
- Nunca criar links internos para rotas legadas - sempre usar canônicas
- Rodar diagnóstico periodicamente para verificar consistência
