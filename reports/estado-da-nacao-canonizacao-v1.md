# Estado da Nação — Canonização do V1

## O que foi lido
- **`README.md`**: Template genérico do Lovable.
- **`docs/diag/*`**: Diagnóstico de missões e importação de pacotes (especialmente `DIAG_MISSOES.md`).
- **`memory/*`**: Contratos SSOT e regras de governança (`LOVABLE_CONTRATO.md`, `SSOT_REGISTRY.md`).
- **`reports/project-status.md`**: Status geral do repositório em 18/03/2026.
- **Estrutura de Rotas**: Mapeamento via manifestos internos e arquivos de página.

## O que foi concluído
- **Tese do Produto**: Definida como plataforma de missões territoriais coordenada.
- **Loop Central**: Mapeado do convite à validação da evidência.
- **Mapa de Módulos**: Classificação completa do que é Core, Suporte, Incubação e Legado.
- **Protocolo de Desenvolvimento**: Estabelecidas regras para "Vibe Coding" controlado via prompts (DIAG -> PATCH -> VERIFY -> REPORT).

## Qual é o núcleo oficial proposto
O núcleo (Core) é composto pelos fluxos de **Autenticação, Onboarding Territorial (Cidade/Céula), Mural "Hoje", Execução de Missões (Rua/Conversa/Genéricas) e Validação de Evidências**.

## Quais áreas ficaram fora do V1
- **Debates/Plenária**: Congelados para reduzir ruído social.
- **Formação/Cursos**: Tratados como extensão secundária.
- **Squads/Talentos**: Movidos para uma lógica de missões pontuais se necessário.
- **CRM Completo**: Restrito ao suporte imediato às missões de conversa.

## Quais riscos estruturais foram identificados
- **Dispersão de Superfície**: O projeto possui rotas e painéis admin que não contribuem diretamente para o loop de missões (ex: "Fábrica" vs "Materiais").
- **Redirecionamentos Legados**: Existem rotas deprecadas (ex: `/missao`) que ainda são referenciadas em links internos.
- **Interdependência de Domínios**: A taxonomia de Célula/Squad pode gerar confusão se não for rigorosamente seguida.

## Quais próximos 3 tijolos recomendados
1. **Limpeza de Navegação**: Ocultar itens de "Incubação" do menu principal para focar o voluntário no loop V1.
2. **Correção de Links Deprecados**: Atualizar todos os links que apontam para `/missao` em favor de `/voluntario/hoje` ou rotas canônicas.
3. **Unificação de Admin**: Consolidar as abas de "Fábrica" e "Materiais" em um único painel de suporte operacional.

## Lista dos arquivos criados
- **`docs/00-V1-CANONICO.md`**: A tese e o loop do produto.
- **`docs/01-MAPA-DE-MODULOS.md`**: O guia de redução de dispersão.
- **`docs/02-PROTOCOLO-VIBE-CODING.md`**: As regras para o futuro do desenvolvimento.
- **`reports/estado-da-nacao-canonizacao-v1.md`**: Este relatório de síntese.
