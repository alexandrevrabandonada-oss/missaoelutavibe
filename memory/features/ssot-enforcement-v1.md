# Memory: features/ssot-enforcement-v1
Updated: 2026-02-04

## SSOT Enforcement — Ações Corretivas para Deriva

Sistema de diagnóstico acionável que transforma detecção de drift em ações concretas.

### O que é Enforcement

Enforcement é a camada de **ação** sobre o SSOT Registry. Enquanto o Registry define "o que deveria ser", o Enforcement:
1. **Detecta** desvios do padrão definido
2. **Classifica** severidade (BLOCKING vs WARNING)
3. **Sugere** ação corretiva específica
4. **Indica** onde corrigir (arquivo/RPC/tabela)

### Severidades

| Severidade | Descrição | Ação Requerida |
|------------|-----------|----------------|
| **BLOCKING** | Impede funcionamento core da coordenação | Corrigir imediatamente antes de continuar |
| **WARNING** | Desvio do padrão, mas não bloqueia operação | Revisar quando possível, documentar se intencional |
| **OK** | Em conformidade com SSOT | Nenhuma ação necessária |

### Checks Implementados

#### CHECK-1: Legados de coordenação ativos
- **O que verifica**: Se `cell_coordinators` (tabela legada) tem linhas ativas
- **Severidade**: WARNING
- **Ação se falha**: Migrar dados para `coord_roles`; zerar tabela legada; não usar em novas features
- **Onde corrigir**: Supabase migrations

#### CHECK-2: Escopo/Guard único (RPCs críticas)
- **O que verifica**: Se RPCs de coordenação estão funcionando
- **RPCs testadas**:
  - `can_operate_coord` — helper de permissão
  - `list_coord_roles` — lista coordenadores
  - `get_cell_ops_kpis` — métricas de células
  - `list_coord_audit_log` — log de auditoria
- **Severidade**: BLOCKING se RPC não existe; WARNING se erro de execução
- **Ação se falha**: Criar RPC faltante via migration

#### CHECK-3: Entrada única de coordenação
- **O que verifica**: 
  - `/coordenador/hoje` existe no manifest
  - `/admin/ops` redireciona para `/coordenador/hoje` (ou não existe)
- **Severidade**: BLOCKING se rota principal falta; WARNING se redirect incorreto
- **Ação se falha**: Adicionar rota/redirect no manifest e LegacyRouteRedirects

#### CHECK-4: Rotas proibidas (hífen novas)
- **O que verifica**: Se há rotas canônicas com hífen que não são legadas
- **Severidade**: WARNING
- **Ação se falha**: Renomear para formato com barra e criar redirect legado

#### CHECK-5: Legacy redirects válidos
- **O que verifica**: Se todos os redirects legados apontam para rotas existentes
- **Severidade**: WARNING
- **Ação se falha**: Corrigir destino para rota válida (ex: `/formacao` em vez de `/formacao/curso`)

### Procedimento DIAG → PATCH → VERIFY → REPORT

#### 1. DIAG (Diagnóstico)
```
Acessar: /admin/diagnostico
Expandir: "SSOT Enforcement"
Clicar: ▶ (Play)
```

#### 2. PATCH (Correção)
Para cada item com severidade BLOCKING ou WARNING:
1. Ler "Ação recomendada"
2. Ir para "📍 Onde corrigir"
3. Aplicar correção

Exemplos de correções:
- **RPC faltante**: Criar migration com a função SQL
- **Tabela legada ativa**: Migrar dados e zerar tabela
- **Rota com hífen**: Renomear e adicionar redirect
- **Redirect incorreto**: Atualizar `LEGACY_ROUTE_MAP`

#### 3. VERIFY (Verificação)
```
Re-executar: ▶ (Play) no SSOT Enforcement
Confirmar: Todos os checks passando ou classificados corretamente
```

#### 4. REPORT (Documentação)
- Atualizar `memory/features/*.md` relevante
- Se mudança estrutural: atualizar `memory/SSOT_REGISTRY.md`
- Se nova regra: atualizar `memory/LOVABLE_CONTRATO.md`

### Exemplos de Drift

#### Tabela Legada com Linhas
```
❌ DRIFT: cell_coordinators tem 5 registros ativos

AÇÃO:
1. Migrar dados para coord_roles:
   INSERT INTO coord_roles (user_id, role, cell_id, created_by)
   SELECT user_id, 'CELL_COORD', cell_id, created_by FROM cell_coordinators;

2. Zerar tabela legada:
   TRUNCATE cell_coordinators;

3. (Opcional) Deprecar tabela:
   COMMENT ON TABLE cell_coordinators IS 'DEPRECATED - usar coord_roles';
```

#### RPC Ausente
```
❌ DRIFT: list_coord_audit_log não encontrada

AÇÃO:
1. Verificar se migration foi executada
2. Se não, rodar migration pendente
3. Se sim, verificar logs de erro do Supabase
```

#### Rota Fora do Canônico
```
❌ DRIFT: /voluntario-hoje existe como página (deveria ser /voluntario/hoje)

AÇÃO:
1. Renomear componente/rota para /voluntario/hoje
2. Adicionar em LEGACY_ROUTE_MAP:
   "/voluntario-hoje": "/voluntario/hoje"
3. Atualizar routeManifest
```

### Auditoria Mínima

O sistema de enforcement inclui auditoria automática para operações de coordenação:

#### Tabela: coord_audit_log
- Registra: GRANT_ROLE, REVOKE_ROLE, UPSERT_CELL, APPROVE_ASSIGNMENT, CANCEL_ASSIGNMENT
- Campos: actor_profile_id, action, scope_type, city_id, cell_id, target_profile_id, meta_json
- **Sem PII**: Apenas UUIDs, sem nomes/emails/telefones

#### Acesso ao Log
- **Admin Master**: Vê todos os logs
- **COORD_GLOBAL**: Vê todos os logs
- **COORD_CITY**: Vê apenas logs de sua cidade
- **Outros**: Acesso negado

#### UI de Auditoria
- Localização: `/coordenador/hoje` → seção "Auditoria recente"
- Mostra: Últimos 10 eventos (expansível para 20)
- Degradação graciosa: Se RPC falhar, exibe "Auditoria indisponível"

### Arquivos Relacionados

| Arquivo | Propósito |
|---------|-----------|
| `src/components/admin/SSOTEnforcementCard.tsx` | Componente de diagnóstico acionável |
| `src/components/coordinator/CoordAuditSection.tsx` | Seção de auditoria no coordenador/hoje |
| `src/hooks/useCoordAudit.tsx` | Hook para consumir audit log |
| `memory/SSOT_REGISTRY.md` | Definição de SSOT por domínio |
| `memory/LOVABLE_CONTRATO.md` | Regras congeladas do sistema |

### Limitações

- Enforcement é **passivo** — não corrige automaticamente, apenas sugere
- Checks executam queries reais — podem impactar performance se executados muito frequentemente
- Auditoria depende de RPCs logarem corretamente — se RPC não chama `log_coord_audit`, evento não é registrado
