# Estado da Nação: Canonização de Entry Points V1

Este relatório documenta a execução do tijolo de canonização de pontos de entrada do V1, eliminando dispersão de jornada e garantindo que o Hub Central (`/voluntario/hoje`) seja o destino único e consistente para todos os fluxos.

## Objetivos Alcançados

1. **Alinhamento do Hub Canônico**:
   - Atualizados redirecionamentos de `/voluntario` para `/voluntario/hoje` em ~45 arquivos.
   - Garantido que `Index (Home Pública)`, `Auth (Logins)`, `Onboarding` e `Invite loop` convirjam para o mesmo destino.

2. **Poda de Inconsistência**:
   - Removidos links duplos ou apontando para rotas genéricas.
   - Refatorado `inviteConfig.ts` e `Auth.tsx` para garantir que o parâmetro `next` aponte por padrão para o Hub V1.

3. **Verificação de Integridade**:
   - `npm run build` executado com sucesso (16s), validando que não há quebras de rota ou importação.

---

## Guia de Smoke Test: Jornada V1 Core

Para fins de QA ou validação contínua, siga os passos abaixo:

### 1. Convite e Signup (Visitor)
- **Ação**: Acesse `/aceitar-convite?ref=CODIGO` -> Cadastre-se.
- **Resultado Esperado**: O usuário deve ser levado para `/onboarding` ou diretamente para `/voluntario/hoje` conforme o status de aprovação. Jamais para `/` ou `/auth` em loop.

### 2. Login e Retorno (Volunteers)
- **Ação**: Faça Login em `/auth`.
- **Resultado Esperado**: Usuários aprovados **devem** cair em `/voluntario/hoje`. Usuários pendentes **devem** cair em `/aguardando-aprovacao`.

### 3. Navegação em Painéis (Coord/Admin)
- **Ação**: Acesse `/admin` ou `/coordenador/hoje` e clique no botão "Home" (ícone de casa).
- **Resultado Esperado**: O usuário deve ser levado para o Hub do voluntário (`/voluntario/hoje`).

### 4. Redirects Legados
- **Ação**: Tente acessar `/missao`.
- **Resultado Esperado**: Redirecionamento 301/React para `/voluntario/hoje`.

---

## Próximos Passos Recomendados

- **Refactor de Admin**: Agora que os entry points estão limpos, o próximo passo pode ser unificar a visualização de admin com a mesma estética do V1 (`AdminHoje.tsx`).
- **Poda Estrutural**: Alguns arquivos legados podem ser movidos ou deletados apos o V1 estar 100% estabilizado no Hub.
- **Testes E2E Automatizados**: Implementar os cenários de smoke test acima no Playwright para prevenir regressões visuais ou de rota.

---
**Status Final**: ✅ Canonizado e Pronto para Vibe Coding.
