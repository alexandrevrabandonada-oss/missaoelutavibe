# Estado da Nação — CI Core V1

Este documento registra a implementação da integração contínua para o Core V1 do projeto Missão ÉLuta.

## Infra atual encontrada
- Scripts de verificação em `package.json`: `lint`, `build`, `test`, `test:smoke` e `verify:core`.
- Testes unitários com Vitest e E2E com Playwright.
- Ambiente Node.js 20 configurado.

## Workflow criado
Foi criado/refinado o arquivo [.github/workflows/verify-core.yml](file:///c:/Projetos/missaoelutavibe/missaoelutavibecode/.github/workflows/verify-core.yml). Ele é dividido em dois blocos lógicos:
1. **check-core**: Executa Lint, Build e Unit Tests. Se qualquer um falhar, o processo para aqui.
2. **smoke-tests**: Executa os testes E2E do Playwright. Depende do sucesso do `check-core`.

## Comandos executados pelo CI
- `npm ci`: Instalação limpa de dependências.
- `npm run lint`: Verificações de estilo e integridade.
- `npm run build`: Validação de compilação.
- `npm run test`: Testes unitários vitais.
- `npm run test:smoke`: Testes E2E do fluxo canonizado.

## Ajustes feitos para estabilidade
- **Separação de Jobs**: Facilitando a visualização de que etapa falhou diretamente na interface do GitHub.
- **Artifacts**: Configuração de upload do diretório `playwright-report/` em caso de erro ou sucesso parcial, permitindo inspeção visual de falhas em CI.
- **Foco em Chromium**: Instalação apenas do browser necessário para o smoke, reduzindo tempo de execução.

## Como o CI dispara
- Em cada `push` nas branches `main` e `master`.
- Em cada `pull_request` mirando as branches `main` e `master`.

## Resultado da validação local
- O comando `npm run verify:core` (que agrega todos os passos do CI) executa com **Exit Code 0** no ambiente local.
- Sintaxe do YAML validada contra padrões de GitHub Actions.

## Pendências e fragilidades restantes
- Segredos (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) precisam estar configurados no repositório GitHub para o `smoke-tests` completo.
- Cache de Playwright Browsers não foi implementado para manter o workflow simples e fácil de manter (pragmático).

## Arquivos alterados
- [.github/workflows/verify-core.yml](file:///c:/Projetos/missaoelutavibe/missaoelutavibecode/.github/workflows/verify-core.yml)

## Próximos 2 tijolos sugeridos
1. **Sanitização de Warnings**: Reduzir a carga de ESLint warnings que poluem o log do CI.
2. **Setup de Environments**: Configurar ambientes de Preview no CI para deploy automático pós-sucesso do Verify.

---
**Status Final**: ✅ CI Core V1 Primitivo e Funcional.
