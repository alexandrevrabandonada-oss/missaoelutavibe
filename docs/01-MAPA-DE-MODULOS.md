# Mapa de Módulos do Projeto

## 1. Núcleo (Core)
Módulos essenciais para o funcionamento do loop V1. Devem ter prioridade máxima de desenvolvimento e manutenção.

## 2. Suporte
Módulos que auxiliam a operação core, mas cuja ausência não interrompe o fluxo básico de missão.

## 3. Incubação
Funcionalidades que competem por atenção e superfície, devendo ser congeladas ou tratadas como extensões secundárias.

## 4. Legado / aliases / rotas antigas
Herança de versões anteriores ou redirecionamentos mantidos para compatibilidade.

## 5. Riscos de dispersão
- **Superfície Admin**: Muitas abas e painéis que podem diluir o foco do coordenador.
- **Domínios Sobrepostos**: Áreas como "Squads" e "Formação" competem com o fluxo de "Missão".
- **Navegação Ampla**: Menu com muitos itens para o voluntário de base.

## 6. Recomendação de poda operacional
- Ocultar links para "Debates", "Formação" e "Talentos" do menu principal do voluntário até que o Core esteja 100% estabilizado.
- Unificar "Fábrica" e "Materiais" em um único domínio de suporte de conteúdo.

## Tabela de Mapeamento

| Módulo | Rotas/Áreas | Status | Motivo | Ação Recomendada |
| :--- | :--- | :--- | :--- | :--- |
| **Auth & Convites** | `/auth`, `/aceitar-convite`, `/r/:code` | Core | Porta de entrada e controle de acesso. | Manter como prioridade de segurança. |
| **Onboarding** | `/voluntario/primeiros-passos` | Core | Garante alocação territorial (Cidade/Céula). | Simplificar para 2 passos rápidos. |
| **Mural Hoje** | `/voluntario/hoje` | Core | Hub central de ações do dia. | Consolidar como "página inicial" oficial. |
| **Gestão de Missões** | `/voluntario/missoes`, `/voluntario/missao/*` | Core | Funcionalidade central do produto. | Evitar novas variações de tipo de missão. |
| **Evidências** | `/voluntario/evidencia/*` | Core | Fechamento do loop de ativismo. | Facilitar upload mobile (compressão). |
| **Coordenação** | `/coordenador/*` | Core | Governança territorial e gestão de base. | Unificar painéis dispersos. |
| **Validação** | `/admin/validar` | Core | Garantia de qualidade das missões. | Melhorar UX de aprovação em lote. |
| **CRM de Apoio** | `/voluntario/crm` | Suporte | Apoio a missões de conversa/referral. | Manter apenas funcionalidades que suportam missões. |
| **Fábrica/Materiais** | `/admin/fabrica`, `/materiais` | Suporte | Repositório de peças para ativismo. | Organizar por tags vinculadas a missões. |
| **Debates** | `/debates/*` | Incubação | Interação social paralela ao fluxo de ação. | Congelar desenvolvimento; remover do menu. |
| **Formação** | `/formacao/*` | Incubação | Treinamento teórico. | Relacionar como suporte a missões específicas. |
| **Squads/Talentos** | `/voluntario/talentos`, `/admin/talentos` | Incubação | Gestão de jobs técnicos/especializados. | Tratar como missões de "dados" ou "mobilização". |
| **Legado (Ref)** | `/missao` (redirect) | Legado | Rota antiga movida para `/voluntario`. | Manter apenas como redirect definitivo. |
| **Legado (Admin)** | `/admin/ops` (redirect) | Legado | Movido para `/coordenador/hoje`. | Limpar links internos remanescentes. |
