# Estado da Nação - Poda Operacional de Navegação V1

Este relatório documenta a execução da poda de navegação para alinhar o projeto ao V1 canônico, focando no fluxo principal e removendo dispersões de módulos em incubação.

## Objetivos Alcançados

1.  **Centralização da Governança de Rotas**:
    *   Expandido o mecanismo de `FROZEN_ROUTES` em `src/lib/navScope.ts`.
    *   Todas as rotas de incubação (Debates, Materiais, Formação, Squads, CRM, etc.) foram marcadas como `frozen`.
    *   Essas rotas permanecem acessíveis via URL direta (preservando o código), mas são omitidas de todos os menus gerados dinamicamente.

2.  **Refatoração da Navegação do Voluntário**:
    *   Componente `VoluntarioNavBar.tsx` refatorado para consumir a configuração do `navScope.ts`.
    *   Garantido que apenas as 5 seções canônicas apareçam: **Hoje**, **Território**, **Missões**, **Eu**, **Ajuda**.

3.  **Poda do Dashboard "Hoje" (Voluntário)**:
    *   Ocultados os módulos `QuickCaptureCard` (CRM) e `impact` que fugiam do loop core.
    *   Ocultadas as `LocalSuggestions` que dispersavam o usuário para áreas de incubação.
    *   Removidos os focos de "Squads", "CRM" e "Agenda" do formulário de check-in, priorizando "Missões".

4.  **Poda do Dashboard Admin**:
    *   Removidas métricas e cartões de distribuição de foco relacionados a CRM, Squads/Tarefas e Agenda.

5.  **Correção de Herança Legada**:
    *   Mapeamento e correção de múltiplos links que apontavam para o caminho depreciado `/missao`.
    *   Implementado redirecionamento global no `LegacyRouteRedirects.tsx`: `/missao` -> `/voluntario/hoje`.
    *   Atualizados botões de "Home" e guardas de rota em `AdminSetup`, `AdminTalentos`, `AdminPlaybook` e `AdminModeracao`.

## Arquivos Modificados

*   `src/lib/navScope.ts`: Expansão das rotas congeladas.
*   `src/components/navigation/VoluntarioNavBar.tsx`: Refatoração dinâmica.
*   `src/pages/VoluntarioHoje.tsx`: Limpeza de módulos e focos.
*   `src/pages/AdminHoje.tsx`: Limpeza de métricas.
*   `src/components/routing/LegacyRouteRedirects.tsx`: Redirecionamento de `/missao`.
*   `src/pages/Redirect.tsx`: Correção de link interno.
*   `src/pages/AdminSetup.tsx`, `AdminTalentos.tsx`, `AdminPlaybook.tsx`, `AdminModeracao.tsx`: Correção de `navigate("/missao")`.

## Próximos Passos Recomendados

*   **Validação em Produção**: Verificar se usuários que tinham links salvos para `/missao` estão caindo corretamente no novo hub.
*   **Poda Regional**: Avaliar se seções específicas das cidades (Base, Agir, Aprender) devem ser movidas para o novo padrão de navegação ou se permanecem sob o hub de Território.

**Status Final**: Navegação saneada e alinhada com o V1 canônico.
