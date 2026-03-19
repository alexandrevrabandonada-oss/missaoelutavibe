/**
 * Cell Playbook - Default content for Kit v0 cells
 * 
 * Each cell type has a pre-defined playbook with headline,
 * description, and 3 next actions.
 */

export interface PlaybookNextAction {
  title: string;
  description: string;
  ctaRoute: string;
  ctaLabel: string;
}

export interface CellPlaybook {
  headline: string;
  whatWeDo: string;
  nextActions: PlaybookNextAction[];
  pinnedMaterials?: string[];
}

// Default playbooks for Kit v0 cells
export const KIT_V0_PLAYBOOKS: Record<string, CellPlaybook> = {
  "geral": {
    headline: "Célula de Entrada",
    whatWeDo: "A Célula Geral é o ponto de partida para todos os novos voluntários. Aqui você conhece o movimento, faz suas primeiras missões e descobre como pode contribuir.",
    nextActions: [
      {
        title: "Fazer uma missão",
        description: "Complete sua primeira ação e ganhe experiência",
        ctaRoute: "/voluntario/missoes",
        ctaLabel: "Ver Missões",
      },
      {
        title: "Conhecer o mural",
        description: "Veja o que outros voluntários estão fazendo",
        ctaRoute: "/voluntario/mural",
        ctaLabel: "Abrir Mural",
      },
      {
        title: "Convidar 1 pessoa",
        description: "Traga alguém para o movimento",
        ctaRoute: "/voluntario/convite",
        ctaLabel: "Criar Convite",
      },
    ],
  },
  "rua & escuta": {
    headline: "Ação de Rua",
    whatWeDo: "Somos os olhos e ouvidos nas ruas. Fazemos panfletagem, escuta ativa, e conversamos diretamente com as pessoas. Cada conversa planta uma semente.",
    nextActions: [
      {
        title: "Missão de rua",
        description: "Saia para uma ação de panfletagem ou escuta",
        ctaRoute: "/voluntario/missao-rua",
        ctaLabel: "Ver Missões",
      },
      {
        title: "Registrar contato",
        description: "Salve pessoas interessadas no CRM",
        ctaRoute: "/voluntario/crm/novo",
        ctaLabel: "Novo Contato",
      },
      {
        title: "Convidar 1 pessoa",
        description: "Traga alguém para a próxima ação",
        ctaRoute: "/voluntario/convite",
        ctaLabel: "Criar Convite",
      },
    ],
  },
  "comunicação": {
    headline: "Amplificamos a Mensagem",
    whatWeDo: "Criamos e compartilhamos conteúdo nas redes sociais. Cada post, story e compartilhamento multiplica nosso alcance e fortalece a narrativa do movimento.",
    nextActions: [
      {
        title: "Compartilhar conteúdo",
        description: "Poste o material da semana nas suas redes",
        ctaRoute: "/voluntario/materiais",
        ctaLabel: "Ver Materiais",
      },
      {
        title: "Postar no mural",
        description: "Compartilhe sua ação com a célula",
        ctaRoute: "/voluntario/mural",
        ctaLabel: "Novo Post",
      },
      {
        title: "Convidar 1 pessoa",
        description: "Indique alguém que manda bem em redes",
        ctaRoute: "/voluntario/convite",
        ctaLabel: "Criar Convite",
      },
    ],
  },
  "formação": {
    headline: "Preparamos Multiplicadores",
    whatWeDo: "Organizamos cursos, debates e formações. Quanto mais preparados estivermos, mais efetivo será nosso trabalho. Conhecimento é nossa maior ferramenta.",
    nextActions: [
      {
        title: "Fazer um curso",
        description: "Complete uma formação e ganhe certificado",
        ctaRoute: "/voluntario/aprender",
        ctaLabel: "Ver Cursos",
      },
      {
        title: "Compartilhar aprendizado",
        description: "Poste o que você aprendeu no mural",
        ctaRoute: "/voluntario/mural",
        ctaLabel: "Novo Post",
      },
      {
        title: "Convidar 1 pessoa",
        description: "Traga alguém para estudar junto",
        ctaRoute: "/voluntario/convite",
        ctaLabel: "Criar Convite",
      },
    ],
  },
  "crm & base": {
    headline: "Construímos Relacionamentos",
    whatWeDo: "Gerenciamos contatos, fazemos follow-ups e cultivamos apoiadores. Cada conversa continuada transforma um interessado em um aliado ativo.",
    nextActions: [
      {
        title: "Fazer follow-up",
        description: "Retome contato com alguém da sua lista",
        ctaRoute: "/voluntario/crm",
        ctaLabel: "Ver Contatos",
      },
      {
        title: "Cadastrar contato",
        description: "Adicione novas pessoas à base",
        ctaRoute: "/voluntario/crm/novo",
        ctaLabel: "Novo Contato",
      },
      {
        title: "Convidar 1 pessoa",
        description: "Traga alguém para ajudar com a base",
        ctaRoute: "/voluntario/convite",
        ctaLabel: "Criar Convite",
      },
    ],
  },
};

// Get playbook for a cell name (case-insensitive)
export function getDefaultPlaybook(cellName: string): CellPlaybook | null {
  const normalized = cellName.toLowerCase().trim();
  return KIT_V0_PLAYBOOKS[normalized] || null;
}

// Fallback playbook for cells without specific content
export const FALLBACK_PLAYBOOK: CellPlaybook = {
  headline: "Sua Célula",
  whatWeDo: "Esta célula está se organizando. Em breve teremos mais informações sobre nossas atividades e próximos passos.",
  nextActions: [
    {
      title: "Ver o mural",
      description: "Acompanhe as novidades da célula",
      ctaRoute: "/voluntario/mural",
      ctaLabel: "Abrir Mural",
    },
    {
      title: "Fazer uma missão",
      description: "Contribua com o movimento",
      ctaRoute: "/voluntario/missoes",
      ctaLabel: "Ver Missões",
    },
    {
      title: "Convidar 1 pessoa",
      description: "Traga alguém para o movimento",
      ctaRoute: "/voluntario/convite",
      ctaLabel: "Criar Convite",
    },
  ],
};

// Generate welcome post content for a new cell
export function generateWelcomePost(cellName: string): string {
  const playbook = getDefaultPlaybook(cellName) || FALLBACK_PLAYBOOK;
  
  return `# Bem-vindo(a) à célula ${cellName}! 🎉

${playbook.whatWeDo}

## 3 Próximos Passos

1. **${playbook.nextActions[0].title}** - ${playbook.nextActions[0].description}
2. **${playbook.nextActions[1].title}** - ${playbook.nextActions[1].description}  
3. **${playbook.nextActions[2].title}** - ${playbook.nextActions[2].description}

Vamos juntos! 💪`;
}
