# Memory: features/ssot-method-v1
Updated: 2026-02-04

## Metodologia Anti-Deriva (SSOT)

Sistema de garantia de consistência para evitar "segunda verdade" e deriva arquitetural.

### Princípios Fundamentais

**1. Uma Verdade** — Cada conceito tem uma única tabela/RPC responsável
**2. Uma Rota Canônica** — Cada fluxo tem um entry point definido
**3. Um Healthcheck** — Cada feature crítica tem verificação no diagnóstico

### SSOT de Permissões de Coordenação

| Conceito | SSOT | Legados (não usar) |
|----------|------|-------------------|
| COORD_GLOBAL | `coord_roles.role = 'COORD_GLOBAL'` | - |
| COORD_CITY | `coord_roles.role = 'COORD_CITY' + city_id` | - |
| CELL_COORD | `coord_roles.role = 'CELL_COORD' + cell_id` | `cell_coordinators`, `user_roles.coordenador_celula` |

### RPC Canônica

```sql
-- ÚNICA função para verificar permissão de coordenação
SELECT can_operate_coord(_target_city_id, _target_cell_id);
```

**Regras:**
- ❌ **NUNCA** fazer `SELECT * FROM coord_roles WHERE...` no frontend
- ❌ **NUNCA** checar `user_roles.role = 'coordenador_celula'` para autorização
- ✅ **SEMPRE** usar `can_operate_coord()` como helper
- ✅ **SEMPRE** usar RPCs `list_coord_roles`, `grant_coord_role`, `revoke_coord_role`

### Procedimento DIAG → PATCH → VERIFY → REPORT

Ciclo de manutenção para correções que afetam SSOT:

#### 1. DIAG (Diagnóstico)
- Acessar `/admin/diagnostico`
- Verificar seção "Deriva de SSOT"
- Identificar warnings de tabelas legadas ativas

#### 2. PATCH (Correção)
- Migrar dados de legados para SSOT (se necessário)
- Atualizar código para usar RPCs canônicas
- Remover referências diretas a tabelas legadas

#### 3. VERIFY (Verificação)
- Re-executar DIAG
- Confirmar que warnings foram resolvidos
- Testar fluxos de coordenação afetados

#### 4. REPORT (Documentação)
- Atualizar `memory/features/*.md` relevante
- Registrar mudança no changelog do contrato
- Notificar equipe se breaking change

### Checks de Deriva no Diagnóstico

Localizados em `/admin/diagnostico` → "Deriva de SSOT (roles)":

| Check | Status Esperado | Ação se Falha |
|-------|-----------------|---------------|
| `coord_roles` existe | OK | Rodar migration inicial |
| `coord_roles` tem dados | OK | Migrar de legados |
| `cell_coordinators` não existe OU vazia | OK | Se ativa: WARNING - migrar dados |
| RPCs `can_operate_coord` funciona | OK | Verificar deployment da function |
| Frontend usa RPCs (não SELECT) | OK | Refatorar hooks/componentes |

### Nomenclatura de UI

| Contexto | Label | Reservado para |
|----------|-------|----------------|
| COORD_GLOBAL | "Coordenação Global" | coord_roles |
| COORD_CITY | "Coordenador de Cidade" | coord_roles |
| CELL_COORD | "Coordenador de Célula" | coord_roles |
| Admin em `/admin/*` | "Admin Master" | admins + user_roles.admin |

### Arquivos Relacionados

- `src/hooks/useCoordRoles.tsx` — Hook principal de coord_roles
- `src/components/coordinator/CoordTeamTab.tsx` — UI de gestão de equipe
- `src/components/admin/SSOTDriftCard.tsx` — Card de verificação de deriva
- `memory/LOVABLE_CONTRATO.md` — Contrato com regra SSOT congelada

### Limitações

- Não há migração automática de legados — requer intervenção manual
- Diagnóstico é passivo (não corrige, apenas reporta)
- Histórico de mudanças em `audit_logs`, não em tabela dedicada
