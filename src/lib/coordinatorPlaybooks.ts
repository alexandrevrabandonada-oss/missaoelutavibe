/**
 * Coordinator Playbooks v0
 * 
 * Mode-aware messages and action links for each alert type.
 */

import type { AppMode } from "./brand";

export interface PlaybookMessage {
  short: string;
  mid: string;
  leader: string;
}

export interface PlaybookAction {
  label: string;
  path: string;
}

export interface Playbook {
  title: string;
  subtitle: string;
  messages: {
    pre: PlaybookMessage;
    campaign: PlaybookMessage;
  };
  actions: PlaybookAction[];
  announcementTitle: string;
  announcementBody: string;
}

// Alert key → Playbook mapping
export const PLAYBOOKS: Record<string, Playbook> = {
  activation: {
    title: "Ativação baixa",
    subtitle: "Voluntários aprovados não estão completando sua primeira ação",
    messages: {
      pre: {
        short: "Oi! 🙌 Já deu pra fazer sua primeira ação hoje? Leva só 30 segundos!",
        mid: "Ei! 💪 Vi que você já entrou no app. Que tal dar o primeiro passo agora? É super rápido — 30 segundos — e já te coloca no ritmo. Bora construir juntos?",
        leader: "Olá, coordenador! Nossa ativação está baixa. Sugestão: enviar mensagens de boas-vindas personalizadas para os voluntários recém-aprovados, destacando a primeira ação do dia.",
      },
      campaign: {
        short: "Oi! 🗳️ Sua primeira ação de campanha está esperando — leva 30 segundos!",
        mid: "Ei! 💪 Faltam poucos dias pro voto. Que tal fazer sua primeira ação agora? 30 segundos e você já está contribuindo diretamente!",
        leader: "Atenção coordenador! Ativação crítica para campanha. Priorize contato direto com voluntários aprovados que ainda não agiram.",
      },
    },
    actions: [
      { label: "Abrir Hoje", path: "/voluntario/hoje" },
      { label: "Painel Ativação", path: "/admin/ops?focus=activation" },
    ],
    announcementTitle: "🚀 Primeira ação: comece agora!",
    announcementBody: "Você já fez sua primeira ação hoje? Leva apenas 30 segundos e faz toda a diferença. Acesse o app e complete os 3 passos do dia!",
  },

  share: {
    title: "Share baixo",
    subtitle: "Poucos voluntários estão convidando amigos",
    messages: {
      pre: {
        short: "Ei! 🔗 Conhece alguém que ia curtir participar? Manda o convite pelo app!",
        mid: "Olá! 🌟 Nosso movimento cresce de pessoa pra pessoa. Você pode convidar 1 amigo agora mesmo — é só compartilhar seu link no app!",
        leader: "Coordenador, o engajamento em convites está baixo. Sugiro reforçar o Share Pack nas conversas e destacar o +1 pós-ação.",
      },
      campaign: {
        short: "Cada voto conta! 🗳️ Convide 1 pessoa agora pelo app!",
        mid: "Falta pouco! 🔥 Cada pessoa que você traz pode fazer a diferença no resultado. Compartilhe seu link de convite agora!",
        leader: "URGENTE: Taxa de convites baixa em período crítico. Ativar campanha de convite +1 imediatamente.",
      },
    },
    actions: [
      { label: "Convidar", path: "/voluntario/convite" },
      { label: "Ver Share Pack", path: "/voluntario/hoje?highlight=sharepack" },
    ],
    announcementTitle: "🤝 Traga +1 pro time!",
    announcementBody: "Nosso movimento cresce de pessoa pra pessoa. Que tal convidar um amigo hoje? Use seu link de convite no app!",
  },

  crm: {
    title: "CRM baixo",
    subtitle: "Poucos contatos estão sendo cadastrados",
    messages: {
      pre: {
        short: "Oi! 📱 Conversou com alguém hoje? Salva o contato no app — é rápido!",
        mid: "Ei! Cada conversa importa. Se você falou com alguém interessado, salva o contato no app pra gente manter o relacionamento!",
        leader: "Coordenador, a captação de contatos está baixa. Reforce o CTA de 'Salvar contato' após cada conversa e no fallback diário.",
      },
      campaign: {
        short: "Cada contato é um voto em potencial! 🗳️ Salve no app!",
        mid: "Reta final! 🔥 Cada pessoa que você conhece pode definir a eleição. Salve os contatos no app para acompanhar!",
        leader: "PRIORIDADE: Captação de contatos crítica. Ativar blitz de cadastro em todos os territórios.",
      },
    },
    actions: [
      { label: "Novo Contato", path: "/voluntario/crm/novo" },
      { label: "Minha Rede", path: "/voluntario/crm" },
    ],
    announcementTitle: "📱 Salve seus contatos!",
    announcementBody: "Conversou com alguém interessado? Cadastre no app para manter o relacionamento e acompanhar o apoio!",
  },

  qualify: {
    title: "Qualificação baixa",
    subtitle: "Contatos não estão sendo qualificados com nível de apoio",
    messages: {
      pre: {
        short: "Oi! 🎯 Dá pra qualificar seus contatos? Só marcar o nível de apoio!",
        mid: "Ei! Seus contatos precisam de uma atualização — só marcar se apoiam, estão indecisos ou não apoiam. Ajuda muito na organização!",
        leader: "Coordenador, muitos contatos sem qualificação. Reforce o uso dos chips de apoio (Apoia/Indeciso/Não apoia) no CRM.",
      },
      campaign: {
        short: "Qualifique seus contatos agora! 🗳️ Precisamos saber quem vota!",
        mid: "Reta final! 📊 Precisamos saber exatamente quem está conosco. Atualize o nível de apoio dos seus contatos!",
        leader: "CRÍTICO: Precisamos de dados de qualificação para a operação de GOTV. Mutirão de qualificação agora!",
      },
    },
    actions: [
      { label: "Qualificar", path: "/voluntario/crm?filter=nao_qualificados" },
      { label: "Painel CRM", path: "/admin/crm" },
    ],
    announcementTitle: "🎯 Atualize seus contatos!",
    announcementBody: "Seus contatos precisam de qualificação! Marque o nível de apoio de cada um para organizarmos melhor nossa rede.",
  },

  hot_support: {
    title: "Apoio forte caiu",
    subtitle: "Menos contatos estão sendo marcados como apoiadores firmes",
    messages: {
      pre: {
        short: "Oi! 💪 Tem alguém que apoia de verdade? Marca como 'Apoia' no CRM!",
        mid: "Ei! Conhece gente que realmente apoia? Importante marcar no app pra sabermos nossa base firme!",
        leader: "Coordenador, a taxa de apoio forte está baixa. Reforce o script de qualificação e os critérios para marcar 'Apoia'.",
      },
      campaign: {
        short: "Quem vota? 🗳️ Marque seus apoiadores firmes agora!",
        mid: "Precisamos saber: quem vai votar com certeza? Atualize seus apoiadores firmes no app!",
        leader: "GOTV: Precisamos de apoiadores confirmados. Foco em converter indecisos e confirmar votos.",
      },
    },
    actions: [
      { label: "Ver Rede", path: "/voluntario/crm" },
      { label: "Painel Apoio", path: "/admin/crm" },
    ],
    announcementTitle: "💪 Confirme seus apoiadores!",
    announcementBody: "Precisamos saber nossa base firme! Atualize no app quem realmente apoia e está comprometido.",
  },

  event_conversion: {
    title: "Conversão em evento baixa",
    subtitle: "Poucos confirmados estão comparecendo nos eventos",
    messages: {
      pre: {
        short: "Oi! 📅 Lembra do evento? Conta com você lá!",
        mid: "Ei! Vi que você confirmou presença no evento. Estamos te esperando! Qualquer dúvida, é só falar.",
        leader: "Coordenador, a taxa de comparecimento está baixa. Reforce os lembretes 24h antes e no dia do evento.",
      },
      campaign: {
        short: "O evento é HOJE! 🗓️ Contamos com você!",
        mid: "Reta final! 🔥 O evento de hoje é crucial. Confirme sua presença e traga mais 1 pessoa!",
        leader: "CRÍTICO: Conversão em eventos baixa. Ativar operação de confirmação telefônica e transporte.",
      },
    },
    actions: [
      { label: "Ver Agenda", path: "/voluntario/agenda" },
      { label: "Gerenciar Eventos", path: "/admin/agenda" },
    ],
    announcementTitle: "📅 Não perca o evento!",
    announcementBody: "Temos eventos importantes chegando! Confirme sua presença e venha participar. Sua presença faz a diferença!",
  },

  return: {
    title: "Retorno baixo",
    subtitle: "Voluntários não estão voltando ao app após período de inatividade",
    messages: {
      pre: {
        short: "Oi! 👋 Sentimos sua falta! Bora voltar pro movimento?",
        mid: "Ei! Faz um tempinho que não te vemos por aqui. Que tal dar uma passada? Tem novidades te esperando!",
        leader: "Coordenador, a taxa de retorno está baixa. Ative o Return Mode e envie mensagens personalizadas de reengajamento.",
      },
      campaign: {
        short: "Falta pouco! 🗳️ Precisamos de você de volta agora!",
        mid: "Reta final e você faz falta! 🔥 Volte ao app — cada ação conta nesse momento decisivo!",
        leader: "URGENTE: Reativar voluntários inativos. Operação de resgate com mensagens diretas.",
      },
    },
    actions: [
      { label: "Ver Inativos", path: "/coordenador/hoje" },
      { label: "Painel Ops", path: "/admin/ops" },
    ],
    announcementTitle: "👋 Sentimos sua falta!",
    announcementBody: "Faz um tempo que não te vemos por aqui! Volte ao app e veja as novidades. Sua participação é muito importante!",
  },
};

// Get playbook for an alert key
export function getPlaybook(alertKey: string): Playbook | null {
  return PLAYBOOKS[alertKey] || null;
}

// Get messages for current mode
export function getPlaybookMessages(alertKey: string, mode: AppMode): PlaybookMessage | null {
  const playbook = getPlaybook(alertKey);
  if (!playbook) return null;
  
  // "campanha" mode uses campaign messages, all others use pre-campaign
  return mode === "campanha" ? playbook.messages.campaign : playbook.messages.pre;
}

// Get alert display title
export function getAlertTitle(alertKey: string): string {
  const playbook = getPlaybook(alertKey);
  return playbook?.title || alertKey;
}

// Get alert subtitle/hint
export function getAlertSubtitle(alertKey: string): string {
  const playbook = getPlaybook(alertKey);
  return playbook?.subtitle || "";
}

// Build announcement prefill URL
export function buildAnnouncementPrefillUrl(
  alertKey: string,
  scopeKind: string,
  scopeValue: string
): string {
  const params = new URLSearchParams({
    prefill: "1",
    kind: "ALERT",
    key: alertKey,
    scope_kind: scopeKind,
    scope_value: scopeValue,
  });
  return `/admin/anuncios/novo?${params.toString()}`;
}
