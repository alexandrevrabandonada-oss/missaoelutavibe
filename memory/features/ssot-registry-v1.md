# Memory: features/ssot-registry-v1
Updated: 2026-02-04

## SSOT Registry - Sistema de Governança por Domínio

### O que é

O SSOT Registry (`memory/SSOT_REGISTRY.md`) é um mapa completo de todos os domínios funcionais do app, definindo para cada um:

- **SSOT**: Tabela/RPC que é a fonte única de verdade
- **Legados**: Padrões antigos que não devem ser usados
- **Rotas canônicas**: URLs oficiais do domínio
- **Hooks/Componentes canônicos**: Código a ser reutilizado
- **Anti-padrões**: O que NÃO fazer

### Domínios Cobertos

1. **Coordenação** — `coord_roles`, `can_operate_coord`
2. **Células** — `cells`, `cell_memberships`
3. **Convites/Auth** — `convites`, fluxo `/aceitar-convite`
4. **Onboarding** — `profiles.city_id`, guard obrigatório
5. **Alocação de Célula** — `cell_assignment_requests`
6. **Fábrica/Materiais** — `content_items`, `assets`
7. **Formação** — `cursos_formacao`, `certificates`
8. **Debates** — `posts`, `comentarios`
9. **Squads/Skills** — `squad_tasks`, `chamados_talentos`
10. **CRM/Contatos** — `crm_contatos`, `crm_event_invites`
11. **Missões** — `missions`, `evidences`

### Verificação Automática

O componente `SSOTRegistryCard` em `/admin/diagnostico` executa checks automáticos:

| Check | Tipo | Descrição |
|-------|------|-----------|
| `coord_roles` em uso | SSOT | Verifica que tabela existe e tem dados |
| Rotas canônicas existem | Routes | Confirma presença no manifest |
| Legacy redirects configurados | Routes | Valida redirects de rotas legadas |
| Guard de onboarding ativo | Guard | Verifica redirect se `city_id` null |
| Tabelas legadas vazias | Legacy | Alerta se tabelas legadas têm dados |

### Níveis de Alerta

| Status | Cor | Significado |
|--------|-----|-------------|
| **OK** | Verde | SSOT em uso, legados inativos |
| **WARNING** | Âmbar | Legado ativo ou rota faltando — risco de deriva |
| **ERROR** | Vermelho | SSOT não funciona — ação imediata |

### Hints de Ação

Quando um WARNING é detectado, o sistema sugere:

- "Deprecar rota" — Rota legada sendo usada
- "Migrar uso para SSOT" — Código usando padrão legado
- "Atualizar redirect" — Redirect faltando
- "Documentar no contrato" — Mudança precisa ser registrada

### Procedimento DIAG → PATCH → VERIFY → REPORT

1. **DIAG**: Acessar `/admin/diagnostico` → "SSOT Registry & Drift"
2. **PATCH**: Para cada WARNING:
   - Migrar dados de legados para SSOT
   - Atualizar código para usar hooks canônicos
   - Adicionar redirects faltantes
3. **VERIFY**: Re-executar checks para confirmar correção
4. **REPORT**: Atualizar `SSOT_REGISTRY.md` e `LOVABLE_CONTRATO.md`

### Integração com Route Manifest

O manifest (`src/lib/routeManifest.ts`) agora inclui contadores para o Registry:

```typescript
counts: {
  pages: number,
  redirects: number,
  legacyRedirects: number,
  conflicts: number,
  ssoTChecks: number,      // Total de checks do Registry
  driftWarnings: number,   // Warnings detectados
  total: number,
}
```

### Arquivos Relacionados

- `memory/SSOT_REGISTRY.md` — Mapa de domínios
- `memory/LOVABLE_CONTRATO.md` — Contrato com link para Registry
- `src/components/admin/SSOTRegistryCard.tsx` — UI de verificação
- `src/pages/AdminDiagnostico.tsx` — Integração na página
- `memory/features/ssot-method-v1.md` — Metodologia anti-deriva

### Manutenção

- **Ao criar novo domínio**: Adicionar seção no Registry
- **Ao deprecar tabela**: Marcar como legado no Registry
- **Ao criar nova rota**: Verificar se está no Registry do domínio
- **Ao detectar drift**: Seguir procedimento DIAG→PATCH→VERIFY→REPORT
