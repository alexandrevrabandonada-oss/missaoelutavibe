# Memory: features/cell-coordinators-v0
Updated: 2026-02-04

## Coordenadores de Célula v0

Sistema para promover voluntários a coordenadores de célula no momento da alocação.

### Tabela: cell_coordinators

```sql
CREATE TABLE public.cell_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cidades(id),
  cell_id UUID NOT NULL REFERENCES public.cells(id),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(cell_id, profile_id)
);
```

**Características**:
- Sem PII: apenas IDs de relacionamento
- Auditável: `created_by` registra quem promoveu
- Escopo: um coordenador está associado a uma célula específica

### RLS Policies

| Operação | Quem pode |
|----------|-----------|
| SELECT | Admins e coordenadores |
| INSERT | Admins e coordenadores da cidade |
| DELETE | Admins e coordenadores da cidade |

### RPCs Atualizadas

#### approve_and_assign_request

Novo parâmetro: `p_make_cell_coordinator BOOLEAN DEFAULT FALSE`

Quando `true` e `p_cell_id` é fornecido:
1. Insere registro em `cell_coordinators`
2. Concede role `coordenador_celula` em `user_roles`

```sql
SELECT approve_and_assign_request(
  p_request_id := '...',
  p_cell_id := '...',
  p_coordinator_note := 'Promovido a coordenador',
  p_make_cell_coordinator := TRUE
);
```

Retorno atualizado:
```json
{
  "success": true,
  "status": "assigned",
  "promoted_to_coordinator": true
}
```

#### list_city_cells

Novo campo no retorno: `coordinator_count INTEGER`

```json
[
  {
    "id": "...",
    "name": "Centro",
    "member_count": 15,
    "pending_requests": 2,
    "coordinator_count": 2
  }
]
```

### Frontend

#### Tela: /coordenador/territorio

**Aba "Pedidos de Alocação" → Modal de Aprovação**:
- Checkbox: "Tornar coordenador desta célula" (visível apenas quando célula selecionada)
- Ícone: Crown (coroa) âmbar
- Texto explicativo: "O voluntário receberá permissões de coordenação"
- Botão muda para "Aprovar e Promover" quando checkbox marcado

**Aba "Células"**:
- Exibe `coordinator_count` com ícone Crown
- Estado vazio: CTA "Criar célula inicial (Geral)" para cidades sem células

### Hooks Atualizados

#### useCellOps.tsx

- `CityCell` interface: adicionado `coordinator_count: number`
- `approveRequest`: novo parâmetro `makeCellCoordinator?: boolean`

### Diagnóstico

Novos checks em `/admin/diagnostico` → "Saúde da Coordenação":
1. `list_city_cells` retorna `coordinator_count`
2. `approve_and_assign_request` aceita `p_make_cell_coordinator`

### Segurança

- Promoção só funciona via RPC com SECURITY DEFINER
- Não há SELECT direto em `cell_coordinators` nas telas
- PII nunca exposta: apenas contagens e IDs
- Escopo respeitado: coordenadores só promovem em suas cidades

### Arquivos

- `supabase/migrations/` — criação da tabela e atualização de RPCs
- `src/hooks/useCellOps.tsx` — hook atualizado
- `src/pages/CoordenadorTerritorio.tsx` — UI de promoção
- `src/components/admin/CoordinationHealthCard.tsx` — novos checks

### Limitações v0

- Não há UI para remover coordenador (apenas via SQL)
- Não há notificação ao voluntário promovido
- Sem histórico de promoções (futuro: audit log)
