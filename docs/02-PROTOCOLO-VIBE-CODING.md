# Protocolo de Vibe Coding do Projeto

## 1. Regra-mãe
Toda mudança deve preservar a coerência global do projeto, respeitar os contratos estabelecidos em `memory/` e evitar a expansão desnecessária da superfície do produto (feature creep).

## 2. Tipos oficiais de prompt

### Diagnóstico (DIAG)
- **Objetivo**: Mapear o estado atual de um componente, rota ou lógica de banco.
- **Quando usar**: Antes de qualquer correção ou nova implementação.
- **O que pode tocar**: Leituras (`list_dir`, `view_file`, `grep_search`).
- **O que não pode tocar**: Escritas em arquivos de produção (`src/`, `supabase/`).
- **Saída esperada**: Relatório técnico em `reports/` ou `docs/diag/`.

### Patch (PATCH)
- **Objetivo**: Corrigir um bug específico ou implementar uma melhoria pontual dentro do escopo V1.
- **Quando usar**: Após um diagnóstico validado.
- **O que pode tocar**: Arquivos específicos identificados no diagnóstico.
- **O que não pode tocar**: Novas rotas, novos domínios ou refatores globais.
- **Saída esperada**: Código funcional + `verify` obrigatório.

### Verify (VERIFY)
- **Objetivo**: Validar que um `PATCH` não quebrou o sistema.
- **Quando usar**: Imediatamente após um `PATCH`.
- **O que pode tocar**: Scripts de teste, lint, smoke tests no navegador.
- **O que não pode tocar**: Lógica de negócio (apenas leitura para validação).
- **Saída esperada**: Relatório de passagem (Success/Fail) em `reports/`.

### Refactor Controlado (REFACTOR)
- **Objetivo**: Melhorar a qualidade do código sem alterar comportamento externo.
- **Quando usar**: Apenas se houver dívida técnica impeditiva para o V1.
- **O que pode tocar**: Estrutura interna de funções e componentes.
- **O que não pode tocar**: Nomes de rotas, nomes de colunas no banco ou interfaces de API (SSOT).
- **Saída esperada**: Código mais limpo mantendo todos os contratos anteriores.

## 3. Estrutura-padrão de todo prompt
Todo prompt futuro deve conter explicitamente:
- **Objetivo**: O que deve ser alcançado.
- **Contexto**: Referência ao diagnóstico prévio e documentos de memória.
- **Escopo permitido**: Domínios e pastas que podem ser alterados.
- **Arquivos proibidos**: Arquivos de núcleo que não devem ser tocados.
- **Critérios de aceite**: Lista de comportamentos esperados.
- **Verify obrigatório**: Comandos ou fluxos de teste exigidos.
- **Relatório final obrigatório**: Registro do que foi feito em `reports/`.

## 4. Regras de segurança de produto
- Não abrir novas frentes ou módulos sem justificativa operacional clara.
- Não criar rotas novas sem checar o `01-MAPA-DE-MODULOS.md`.
- Não duplicar componentes; priorizar o reuso conforme `memory/LOVABLE_CONTRATO.md`.
- Não alterar regras de negócio (queries SQL/migrações) fora do escopo do tijolo atual.
- Não misturar documentação, refactor e novas funcionalidades no mesmo tijolo (manter atômico).

## 5. Regras de qualidade mínima
Todo `patch` deve terminar com:
- `npm run lint` sem erros no domínio afetado.
- Testes unitários (`vitest`) ou E2E (`playwright`) relevantes em verde.
- "Smoke test" visual do fluxo afetado via ferramenta browser.
- Relatório de estado atualizado em `reports/`.

## 6. Critério de Pronto (Definition of Done)
Um "tijolo" é considerado concluído quando:
- Todos os arquivos editados respeitam o `vibe_coding_protocol`.
- O relatório em `reports/` descreve exatamente o que foi mudado.
- O `task.md` está 100% preenchido.
- A aplicação passa em todos os testes de regressão básicos.

## 7. Anti-padrões (Não Fazer)
- **Prompt Genérico**: "Melhore o layout das missões" (Vago demais).
- **Refactor sem Fronteira**: Começar corrigindo um botão e terminar renomeando todo o banco de dados.
- **Combo de Tijolo**: Abrir feature, consertar bug e mudar UX na mesma intervenção.
- **Isolamento de Memória**: Ignorar o `LOVABLE_CONTRATO.md` ao implementar uma feature.
- **Workaround Silencioso**: Criar gambiarras sem registrar o motivo e a dívida técnica gerada.
