# V1 Canônico do Projeto

## 1. Tese do produto em 1 parágrafo
Plataforma de mobilização, organização e execução de missões territoriais para o projeto Missão ÉLuta, focada em transformar vontade política em ação coordenada de base através de fluxos validados de ativismo.

## 2. Problema principal que o produto resolve agora
Dispersão operacional e falta de coordenação entre voluntários de diferentes territórios, garantindo que cada ação contribua para um objetivo central mensurável.

## 3. Persona principal do V1
**Voluntário de Base**: Cidadão engajado que atua em sua cidade/célula, executando missões e reportando evidências para fortalecer o movimento localmente.

## 4. Loop central do produto
`convite -> auth/signup -> aprovação -> entrada/check-in -> missão -> evidência -> validação -> share/referral`

## 5. O que está DENTRO do V1
- **Autenticação**: Fluxo seguro via convite e referenciamento.
- **Onboarding**: Definição obrigatória de Cidade e Célula.
- **Hub de Ação**: Tela "Hoje" com acesso rápido a missões.
- **Execução de Missões**: Fluxos para missões de Rua, Conversa e Genéricas.
- **Prova de Ação**: Envio de evidências (fotos/dados) para cada missão.
- **Governança Territorial**: Painéis de coordenação para gestão de voluntários e células.

## 6. O que está FORA do V1 agora
- **Debates/Plenária**: Fóruns de discussão e interação social ampla.
- **Formação/Cursos**: Sistema de trilhas de aprendizado e certificados.
- **Squads/Talentos**: Recrutamento técnico e gestão de tarefas especializadas.
- **CRM Avançado**: Gestão de contatos fora do suporte direto às missões.
- **Gamificação Completa**: Rankings e sistema de XP (campos existem, mas lógica está congelada).

## 7. Métricas principais do V1
- **Voluntários Ativos**: Usuários aprovados que realizaram check-in.
- **Missões Concluídas**: Total de missões com evidência enviada.
- **Eficiência Territorial**: Taxa de alocação de voluntários em células.
- **Loop de Referral**: Número de convites gerados e convertidos.

## 8. Critérios de decisão para novos prompts
- **Impacto no Loop**: A proposta fortalece o loop central? (Se não, descartar).
- **Consumo de Superfície**: A mudança cria novas rotas ou componentes complexos? (Se sim, evitar).
- **Legitimação**: A alteração resolve um gargalo operacional já identificado no diagnóstico?
- **Preservação**: A mudança mantém a integridade dos contratos em `memory/`?
