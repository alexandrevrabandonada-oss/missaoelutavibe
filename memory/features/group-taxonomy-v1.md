 # Memory: features/group-taxonomy-v1
 Updated: now
 
 ## Taxonomia de Grupos v1 — Definições Oficiais (CONGELADO)
 
 Este documento define oficialmente os tipos de agrupamento no sistema para evitar drift conceitual e duplicação de funcionalidades.
 
 ---
 
 ### Definições SSOT
 
 | Termo | Tipo | SSOT | Definição |
 |-------|------|------|-----------|
 | **CÉLULA** | Grupo Operacional | ✅ `cells` | Unidade operacional permanente vinculada a uma cidade. Agrupa voluntários para ação local. Única forma de agrupamento com permissões e coordenação. |
 | **SQUAD** | Derivado Opcional | ⚠️ `squad_tasks` | Equipe temporária para tarefas específicas de um ciclo. NÃO é SSOT — deriva de célula ou ciclo. Congelado: não expandir funcionalidade. |
 | **SKILLS/TALENTOS** | Atributo | ✅ `chamados_talentos` | Habilidades/disponibilidades declaradas. NÃO é grupo — é atributo do voluntário. Usado para matching de chamados. |
 | **DEBATE/PLENÁRIA** | Conteúdo | ✅ `posts` | Fórum de discussão. NÃO é grupo operacional — é conteúdo/conversa. Não confundir com células. |
 | **EQUIPE** | Alias | ⚠️ UI only | Termo coloquial para "coordenadores da célula/cidade". Não é entidade de banco. |
 
 ---
 
 ### Regras de Uso
 
 #### CÉLULA é o único grupo operacional SSOT
 - ✅ Voluntários pertencem a células via `cell_memberships`
 - ✅ Coordenadores de célula via `coord_roles.role = 'CELL_COORD'`
 - ✅ CRUD em `/coordenador/territorio` (aba Células)
 - ❌ NÃO criar outros tipos de "grupos operacionais"
 
 #### SQUAD é congelado
 - Funcionalidade existente de tarefas de ciclo (`squad_tasks`)
 - ⚠️ NÃO expandir para virar "grupo paralelo" a células
 - ⚠️ NÃO adicionar memberships/coordenação a squads
 - Se precisar de sub-grupos, usar tags em células
 
 #### SKILLS/TALENTOS são atributos
 - Declarados pelo voluntário
 - Usados para matching em `chamados_talentos`
 - ❌ NÃO criar "grupos de habilidade"
 - ❌ NÃO permitir "coordenador de skill"
 
 #### DEBATE/PLENÁRIA são conteúdo
 - Tópicos e comentários (`posts`, `comentarios`)
 - ❌ NÃO transformar em "grupo" com memberships
 - ❌ NÃO adicionar coordenação a debates
 
 ---
 
 ### Anti-Padrões (Drift a Evitar)
 
 | Anti-Padrão | Risco | Ação Corretiva |
 |-------------|-------|----------------|
 | Criar tabela `grupos` ou `teams` genérica | Duplicação de células | Usar `cells` com tags |
 | Adicionar `squad_memberships` | Grupos paralelos | Manter squads como tarefas |
 | Criar "coordenador de skill" | Hierarquia falsa | Skills são matching, não coordenação |
 | Debate com "membros" | Confusão conceitual | Debates são públicos por célula/cidade |
 | "Equipe" como entidade | Duplicação | "Equipe" é apenas UI para coord_roles |
 
 ---
 
 ### Diagnóstico de Drift
 
 O card "Taxonomia & Drift" em `/admin/diagnostico` verifica:
 
 | Check | Severidade | Critério |
 |-------|------------|----------|
 | Tabelas paralelas | BLOCKING | Existência de tabelas `grupos`, `teams`, `squads` (exceto `squad_tasks`) |
 | Rotas duplicadas | WARNING | Rotas `/*/squads`, `/*/grupos`, `/*/teams` fora do padrão |
 | Squad expansion | WARNING | `squad_tasks` com campos de membership/coord não previstos |
 
 ---
 
 ### Kit v0 de Células (City Bootstrap)
 
 Ao ativar uma cidade, criar automaticamente:
 
 | Célula | Propósito |
 |--------|-----------|
 | **Geral** | Célula padrão para voluntários sem alocação específica |
 | **Rua & Escuta** | Ações de rua, panfletagem, escuta ativa |
 | **Comunicação** | Redes sociais, materiais, divulgação |
 | **Formação** | Capacitação, cursos, multiplicadores |
 | **CRM & Base** | Gestão de contatos, follow-ups, apoio |
 
 **Regras**:
 - Só COORD_GLOBAL ou COORD_CITY pode ativar
 - Se cidade já tem células, mostrar "Ver kit" (não recriar)
 - Cada célula é criada via `upsert_cell` com log de auditoria
 
 ---
 
 ### Arquivos Relacionados
 
 | Arquivo | Propósito |
 |---------|-----------|
 | `src/components/admin/TaxonomyDriftCard.tsx` | Card de verificação de drift |
 | `src/components/coordinator/CityBootstrapSection.tsx` | Botão "Ativar cidade" |
 | `memory/SSOT_REGISTRY.md` | Mapa completo de domínios |
 | `memory/LOVABLE_CONTRATO.md` | Regras congeladas |