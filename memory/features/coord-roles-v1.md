# Memory: features/coord-roles-v1
Updated: 2026-02-04

## Coord Roles v1: Coordenação Geral/Cidade sem virar Admin

⚠️ **SSOT (Fonte Única de Verdade)** para papéis de coordenação. Ver `memory/features/ssot-method-v1.md`.

Sistema de papéis de coordenação separado dos roles administrativos. Permite escalonar acessos de coordenação (COORD_GLOBAL, COORD_CITY, CELL_COORD) sem conceder permissões de admin.

### Problema Resolvido

Antes: promover alguém a coordenador exigia dar role `admin` ou `coordenador_estadual`, concedendo acesso administrativo completo.

Agora: papéis de coordenação são gerenciados via `coord_roles`, independente de `user_roles`. Um COORD_GLOBAL pode operar toda a coordenação mas não acessa painéis administrativos.

### Schema

```sql
-- Enum
CREATE TYPE coord_role_type AS ENUM ('COORD_GLOBAL', 'COORD_CITY', 'CELL_COORD');

-- Tabela
CREATE TABLE coord_roles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  role coord_role_type NOT NULL,
  city_id uuid NULL,        -- obrigatório para COORD_CITY
  cell_id uuid NULL,        -- obrigatório para CELL_COORD
  created_at timestamptz,
  created_by uuid,
  CONSTRAINT uq_coord_role UNIQUE (user_id, role, city_id, cell_id),
  CONSTRAINT chk_coord_role_scope CHECK (...)
);
```

### RPCs

| RPC | Descrição |
|-----|-----------|
| `can_operate_coord(city_id, cell_id)` | Helper boolean: verifica se usuário pode operar no escopo |
| `list_coord_roles(scope_city_id)` | Lista coordenadores sem PII (user_code V#XXXXXX) |
| `grant_coord_role(user_id, role, city_id, cell_id)` | Concede papel |
| `revoke_coord_role(user_id, role, city_id, cell_id)` | Revoga papel |

### Hierarquia de Permissões

```
ADMIN_MASTER (admins table) ou ADMIN (user_roles.role = 'admin')
  └── COORD_GLOBAL (coord_roles.role = 'COORD_GLOBAL')
        └── Acesso a todas cidades/células na coordenação
  
COORD_CITY (coord_roles com city_id específico)
  └── Acesso apenas à cidade especificada
  
CELL_COORD (coord_roles com cell_id específico)
  └── Acesso apenas à célula especificada
```

### Helper `can_operate_coord`

Retorna `true` se:
1. Usuário está em `admins` (master admin)
2. Usuário tem `user_roles.role IN ('admin', 'coordenador_estadual')`
3. Usuário tem `coord_roles.role = 'COORD_GLOBAL'`
4. Usuário tem `coord_roles.role = 'COORD_CITY'` para o `city_id` alvo
5. Usuário tem `coord_roles.role = 'CELL_COORD'` para o `cell_id` alvo
6. (Para células) COORD_CITY da cidade da célula também tem acesso

### Frontend

#### Aba "Equipe" em /coordenador/territorio

- Lista coordenadores (V#XXXXXX, papel, escopo)
- Formulário para adicionar por UUID
- Dropdown de papéis disponíveis (COORD_GLOBAL só para admins)
- Botão revogar com confirmação

#### "Meu código" em /voluntario/eu

- Exibe código V#XXXXXX
- Botão "Copiar UUID" para compartilhar com coordenadores
- Instrução para uso

### Integração com Cell Ops

A RPC `approve_and_assign_request` com `p_make_cell_coordinator = true` agora:
1. Insere em `coord_roles` com role `CELL_COORD`
2. Mantém backward compat com `cell_coordinators` (se existir)
3. Adiciona `user_roles.role = 'coordenador_celula'`

A RPC `list_city_cells` usa `coord_roles` para contar coordenadores por célula.

### Diagnóstico

Checks adicionados em `/admin/diagnostico` → "Saúde da Coordenação":
- `can_operate_coord` - helper existe
- `list_coord_roles` - RPC funciona
- `grant_coord_role` - validação de parâmetros
- `revoke_coord_role` - validação de parâmetros

### Sem PII

- Listas exibem apenas `user_code` (V#XXXXXX)
- UUIDs completos só via botão "Copiar"
- Nenhum email/telefone/nome em listas

### Arquivos

- `src/hooks/useCoordRoles.tsx` - hook principal
- `src/components/coordinator/CoordTeamTab.tsx` - UI de gestão
- `src/components/admin/SSOTDriftCard.tsx` - verificação de deriva SSOT
- `src/pages/CoordenadorTerritorio.tsx` - aba "Equipe"
- `src/pages/VoluntarioEu.tsx` - "Meu código"
- `src/components/admin/CoordinationHealthCard.tsx` - health checks

### Limitações v1

- Não há expiração automática de papéis (pode ser adicionado futuramente)
- COORD_GLOBAL não pode ser concedido por outro COORD_GLOBAL, apenas por admin
- Não há UI para ver histórico de mudanças (disponível via audit_logs)

### LEGADOS DEPRECADOS

| Tabela/Campo | Status | Motivo |
|--------------|--------|--------|
| `cell_coordinators` | ❌ DEPRECADO | Substituído por `coord_roles.CELL_COORD` |
| `user_roles.coordenador_celula` | ⚠️ COMPAT | Mantido para apps legados, preferir `coord_roles` |

**Regra:** Código novo DEVE usar `coord_roles` e `can_operate_coord()`. Ver `memory/features/ssot-method-v1.md`.
