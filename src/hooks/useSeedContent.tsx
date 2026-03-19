import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ContentCounts {
  topicos: number;
  missions: number;
  materiais: number;
  cursos: number;
}

type SeedingModule = "debates" | "missions" | "materiais" | "formacao" | null;

export function useSeedContent() {
  const { user } = useAuth();
  const [seedingModule, setSeedingModule] = useState<SeedingModule>(null);

  const countsQuery = useQuery({
    queryKey: ["seed-content-counts"],
    queryFn: async (): Promise<ContentCounts> => {
      const [topicos, missions, materiais, cursos] = await Promise.all([
        supabase.from("topicos").select("id", { count: "exact", head: true }),
        supabase.from("missions").select("id", { count: "exact", head: true }),
        supabase.from("materiais_base").select("id", { count: "exact", head: true }),
        supabase.from("cursos_formacao").select("id", { count: "exact", head: true }),
      ]);

      return {
        topicos: topicos.count ?? 0,
        missions: missions.count ?? 0,
        materiais: materiais.count ?? 0,
        cursos: cursos.count ?? 0,
      };
    },
    enabled: !!user?.id,
  });

  const seedDebates = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSeedingModule("debates");

    try {
      // Idempotent check: look for existing seed topic by unique title
      const { data: existing } = await supabase
        .from("topicos")
        .select("id")
        .eq("tema", "Bem-vindos ao Fórum de Debates!")
        .maybeSingle();

      if (existing) {
        toast.info("Debate de boas-vindas já existe!");
        countsQuery.refetch();
        return;
      }

      const { data: topico, error: topicoError } = await supabase
        .from("topicos")
        .insert({
          tema: "Bem-vindos ao Fórum de Debates!",
          descricao: "Este é o espaço para discutir ideias, compartilhar experiências e construir juntos. Apresente-se e conte como você quer contribuir para a luta!",
          escopo: "global",
          tags: ["boas-vindas", "apresentação", "comunidade"],
          criado_por: user.id,
          oculto: false,
        })
        .select()
        .single();

      if (topicoError) throw topicoError;

      const { error: postError } = await supabase
        .from("posts")
        .insert({
          topico_id: topico.id,
          autor_id: user.id,
          texto: "Olá, companheiros! Este é o primeiro post do nosso fórum. Sintam-se à vontade para se apresentar e compartilhar suas ideias. Juntos somos mais fortes! ✊",
          oculto: false,
        });

      if (postError) throw postError;

      toast.success("Debate de exemplo criado!");
      countsQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao criar debate:", error);
      toast.error(`Erro ao criar debate: ${error.message}`);
    } finally {
      setSeedingModule(null);
    }
  };

  const seedMissions = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSeedingModule("missions");

    try {
      // Idempotent check: look for existing seed mission by unique title
      const { data: existing } = await supabase
        .from("missions")
        .select("id")
        .eq("title", "Primeira Escuta: Converse com um vizinho")
        .maybeSingle();

      if (existing) {
        toast.info("Missão de exemplo já existe!");
        countsQuery.refetch();
        return;
      }

      const { error: missionError } = await supabase
        .from("missions")
        .insert({
          title: "Primeira Escuta: Converse com um vizinho",
          description: "Converse com um vizinho ou familiar sobre os problemas do bairro. Anote os principais pontos levantados.",
          instructions: "1. Escolha uma pessoa próxima (vizinho, familiar, colega)\n2. Pergunte: 'Quais são os maiores problemas do nosso bairro?'\n3. Escute com atenção e anote as respostas\n4. Tire uma foto do local ou selfie (opcional)\n5. Submeta sua evidência com um resumo da conversa",
          type: "escuta",
          status: "publicada",
          points: 15,
          requires_validation: true,
          created_by: user.id,
        });

      if (missionError) throw missionError;

      toast.success("Missão de exemplo criada!");
      countsQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao criar missão:", error);
      toast.error(`Erro ao criar missão: ${error.message}`);
    } finally {
      setSeedingModule(null);
    }
  };

  const seedMateriais = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSeedingModule("materiais");

    try {
      // Idempotent check: look for existing seed material by unique title
      const { data: existing } = await supabase
        .from("materiais_base")
        .select("id")
        .eq("titulo", "Guia de Boas-Vindas ao Voluntariado")
        .maybeSingle();

      if (existing) {
        toast.info("Material de exemplo já existe!");
        countsQuery.refetch();
        return;
      }

      const { error: materialError } = await supabase
        .from("materiais_base")
        .insert({
          titulo: "Guia de Boas-Vindas ao Voluntariado",
          descricao: "Material introdutório para novos voluntários com dicas de como começar sua jornada de mobilização comunitária.",
          categoria: "texto",
          formato: "pdf",
          status: "aprovado",
          arquivo_url: "https://example.com/placeholder-guia-voluntariado.pdf",
          legenda_pronta: "📚 Acabei de ler o Guia de Boas-Vindas! Pronto para começar minha jornada como voluntário. #Voluntariado #Mobilização #ÉLuta",
          tags: ["introdução", "boas-vindas", "guia", "voluntariado"],
          criado_por: user.id,
        });

      if (materialError) throw materialError;

      toast.success("Material de exemplo criado!");
      countsQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao criar material:", error);
      toast.error(`Erro ao criar material: ${error.message}`);
    } finally {
      setSeedingModule(null);
    }
  };

  const seedFormacao = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSeedingModule("formacao");

    try {
      // Check for existing courses by unique titles
      const { data: existingCurso1 } = await supabase
        .from("cursos_formacao")
        .select("id")
        .eq("titulo", "Introdução à Mobilização Popular")
        .maybeSingle();

      const { data: existingCurso2 } = await supabase
        .from("cursos_formacao")
        .select("id")
        .eq("titulo", "Direitos Trabalhistas e Jornada 6x1 (Mini)")
        .maybeSingle();

      if (existingCurso1 && existingCurso2) {
        toast.info("Cursos de formação de exemplo já existem!");
        countsQuery.refetch();
        return;
      }

      // Create Course 1: Introdução à Mobilização Popular (if not exists)
      if (!existingCurso1) {
        const { data: curso1, error: cursoError1 } = await supabase
          .from("cursos_formacao")
          .insert({
            titulo: "Introdução à Mobilização Popular",
            descricao: "Curso básico para novos voluntários aprenderem os fundamentos da organização de base e mobilização comunitária.",
            nivel: "INTRO",
            status: "PUBLICADO",
            tags: ["introdução", "mobilização", "fundamentos"],
            recomendado: true,
            estimativa_min: 30,
          })
          .select()
          .single();

        if (cursoError1) throw cursoError1;

        // Create lessons for course 1
        const { data: aulas1, error: aulasError1 } = await supabase
          .from("aulas_formacao")
          .insert([
            {
              curso_id: curso1.id,
              titulo: "O que é Mobilização Popular?",
              conteudo_texto: `# O que é Mobilização Popular?

Mobilização popular é o processo de engajar pessoas comuns na luta por seus direitos e na construção de uma sociedade mais justa.

## Por que é importante?

- **Força coletiva**: Juntos somos mais fortes
- **Democracia participativa**: O povo decide seu próprio destino
- **Transformação social**: Mudanças reais vêm de baixo para cima

## Os três pilares

1. **Escuta ativa**: Entender as demandas reais da comunidade
2. **Organização**: Criar estruturas que sustentem a luta
3. **Ação**: Transformar ideias em conquistas concretas

Lembre-se: toda grande mudança começou com pessoas comuns se organizando!`,
              ordem: 1,
              status: "PUBLICADO",
            },
            {
              curso_id: curso1.id,
              titulo: "Como fazer uma Escuta Ativa",
              conteudo_texto: `# Como fazer uma Escuta Ativa

A escuta ativa é a base de toda mobilização efetiva. Antes de propor soluções, precisamos entender profundamente os problemas.

## Técnicas de Escuta

### 1. Prepare-se
- Escolha um local tranquilo
- Tenha um caderno para anotações
- Deixe o celular no silencioso

### 2. Durante a conversa
- Faça perguntas abertas: "O que você acha sobre...?"
- Não interrompa
- Demonstre interesse genuíno
- Repita o que entendeu para confirmar

### 3. Depois
- Organize suas anotações
- Identifique padrões nas respostas
- Compartilhe com sua célula

## Perguntas-chave

- "Qual é o maior problema do bairro?"
- "O que você gostaria de ver diferente?"
- "Já tentou resolver? O que aconteceu?"

A escuta transforma reclamações em demandas organizadas!`,
              ordem: 2,
              status: "PUBLICADO",
            },
          ])
          .select();

        if (aulasError1) throw aulasError1;

        // Create quizzes for course 1
        await createQuizzesForCourse1(aulas1);
      }

      // Create Course 2: Direitos Trabalhistas e Jornada 6x1 (if not exists)
      if (!existingCurso2) {
        const { data: curso2, error: cursoError2 } = await supabase
          .from("cursos_formacao")
          .insert({
            titulo: "Direitos Trabalhistas e Jornada 6x1 (Mini)",
            descricao: "Mini-curso sobre direitos trabalhistas básicos e o debate sobre a jornada 6x1. Aprenda a orientar e registrar demandas trabalhistas.",
            nivel: "BASICO",
            status: "PUBLICADO",
            tags: ["direitos trabalhistas", "jornada 6x1", "CLT", "trabalho"],
            recomendado: true,
            estimativa_min: 15,
          })
          .select()
          .single();

        if (cursoError2) throw cursoError2;

        // Create lessons for course 2
        const { data: aulas2, error: aulasError2 } = await supabase
          .from("aulas_formacao")
          .insert([
            {
              curso_id: curso2.id,
              titulo: "O que é 6x1 e quais os impactos",
              conteudo_texto: `# O que é a Jornada 6x1?

A jornada 6x1 é o regime de trabalho em que o trabalhador trabalha 6 dias consecutivos e folga apenas 1 dia por semana.

## Impactos na vida do trabalhador

### Saúde
- **Exaustão física e mental**: Pouco tempo para recuperação
- **Estresse crônico**: Falta de tempo para lazer e descanso
- **Problemas de sono**: Dificuldade em manter rotina saudável

### Vida pessoal
- **Família**: Menos tempo com filhos e cônjuge
- **Educação**: Dificuldade para estudar ou fazer cursos
- **Lazer**: Sem tempo para atividades de bem-estar

### Comparação internacional

| País | Jornada comum |
|------|---------------|
| Brasil | 6x1 (44h semanais) |
| Alemanha | 5x2 (35-40h) |
| França | 5x2 (35h) |
| Portugal | 5x2 (40h) |

## O debate atual

O movimento pelo fim da jornada 6x1 defende:
- Jornada 5x2 como padrão
- Redução para 40h semanais sem redução salarial
- Mais qualidade de vida para trabalhadores

A luta é por dignidade! ✊`,
              ordem: 1,
              status: "PUBLICADO",
            },
            {
              curso_id: curso2.id,
              titulo: "Direitos básicos + como orientar e registrar",
              conteudo_texto: `# Direitos Trabalhistas Básicos

Todo trabalhador com carteira assinada tem direitos garantidos pela CLT.

## Direitos fundamentais

### Jornada de trabalho
- **Máximo**: 8 horas diárias / 44 horas semanais
- **Hora extra**: Adicional de pelo menos 50%
- **Intervalo**: Mínimo 1 hora para jornadas acima de 6h

### Remuneração
- **13º salário**: Obrigatório, pago em duas parcelas
- **Férias**: 30 dias + 1/3 adicional após 12 meses
- **FGTS**: 8% depositado mensalmente pelo empregador

### Descanso
- **DSR**: Descanso semanal remunerado (1 dia)
- **Feriados**: Folga ou pagamento em dobro
- **Férias**: Direito irrenunciável

## Como orientar um trabalhador

### Passo a passo

1. **Escute** a situação com calma
2. **Anote** os fatos: datas, valores, testemunhas
3. **Documente** tudo que puder (holerites, cartão ponto, mensagens)
4. **Oriente** a procurar o sindicato da categoria
5. **Registre** a demanda no app para acompanhamento

## Onde buscar ajuda

- **Sindicato da categoria**: Primeira opção!
- **Ministério do Trabalho**: Denúncias anônimas
- **Defensoria Pública**: Ação judicial gratuita
- **MPT**: Ministério Público do Trabalho

Conhecer seus direitos é o primeiro passo para defendê-los!`,
              ordem: 2,
              status: "PUBLICADO",
            },
          ])
          .select();

        if (aulasError2) throw aulasError2;

        // Create quizzes for course 2
        await createQuizzesForCourse2(aulas2);
      }

      toast.success("Cursos de formação criados com sucesso!");
      countsQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao criar formação:", error);
      toast.error(`Erro ao criar formação: ${error.message}`);
    } finally {
      setSeedingModule(null);
    }
  };

  // Helper function for Course 1 quizzes
  const createQuizzesForCourse1 = async (aulas: any[]) => {
    for (const aula of aulas) {
      const questionsData = aula.ordem === 1
        ? [
            {
              enunciado: "Qual é a definição de mobilização popular?",
              explicacao: "Mobilização popular é engajar pessoas na luta por direitos e transformação social.",
              opcoes: [
                { texto: "Processo de engajar pessoas na luta por seus direitos", correta: true },
                { texto: "Fazer propaganda política nas redes sociais", correta: false },
                { texto: "Organizar festas comunitárias", correta: false },
                { texto: "Distribuir panfletos nas ruas", correta: false },
              ],
            },
            {
              enunciado: "Quais são os três pilares da mobilização popular mencionados no texto?",
              explicacao: "Os três pilares são: Escuta ativa, Organização e Ação.",
              opcoes: [
                { texto: "Escuta ativa, Organização e Ação", correta: true },
                { texto: "Dinheiro, Poder e Influência", correta: false },
                { texto: "Redes sociais, Mídia e Política", correta: false },
                { texto: "Protesto, Greve e Ocupação", correta: false },
              ],
            },
            {
              enunciado: "Por que a força coletiva é importante na mobilização?",
              explicacao: "Juntos somos mais fortes para conquistar mudanças.",
              opcoes: [
                { texto: "Porque juntos somos mais fortes", correta: true },
                { texto: "Porque é mais barato organizar em grupo", correta: false },
                { texto: "Porque a lei exige participação coletiva", correta: false },
                { texto: "Porque sozinho não é permitido protestar", correta: false },
              ],
            },
          ]
        : [
            {
              enunciado: "O que deve ser feito ANTES de uma escuta ativa?",
              explicacao: "A preparação inclui escolher local tranquilo e ter material para anotações.",
              opcoes: [
                { texto: "Preparar-se com local tranquilo e caderno para anotações", correta: true },
                { texto: "Decorar todas as perguntas possíveis", correta: false },
                { texto: "Avisar a pessoa que será avaliada", correta: false },
                { texto: "Gravar tudo sem permissão", correta: false },
              ],
            },
            {
              enunciado: "Qual é uma técnica correta durante a escuta ativa?",
              explicacao: "Fazer perguntas abertas estimula respostas mais completas.",
              opcoes: [
                { texto: "Fazer perguntas abertas e não interromper", correta: true },
                { texto: "Falar mais do que ouvir para mostrar conhecimento", correta: false },
                { texto: "Responder o celular durante a conversa", correta: false },
                { texto: "Dar sua opinião antes de ouvir a pessoa", correta: false },
              ],
            },
            {
              enunciado: "O que fazer após uma escuta ativa?",
              explicacao: "Após a escuta, organize as anotações e compartilhe com a célula.",
              opcoes: [
                { texto: "Organizar anotações e compartilhar com a célula", correta: true },
                { texto: "Esquecer tudo e partir para próxima escuta", correta: false },
                { texto: "Publicar tudo nas redes sociais imediatamente", correta: false },
                { texto: "Guardar as informações só para si", correta: false },
              ],
            },
          ];

      await createQuizQuestions(aula.id, questionsData);
    }
  };

  // Helper function for Course 2 quizzes (6x1)
  const createQuizzesForCourse2 = async (aulas: any[]) => {
    for (const aula of aulas) {
      const questionsData = aula.ordem === 1
        ? [
            {
              enunciado: "O que significa jornada 6x1?",
              explicacao: "6x1 significa trabalhar 6 dias e folgar 1 dia por semana.",
              opcoes: [
                { texto: "Trabalhar 6 dias e folgar 1 dia por semana", correta: true },
                { texto: "Trabalhar 6 horas por dia", correta: false },
                { texto: "Ter 6 intervalos de 1 hora no trabalho", correta: false },
                { texto: "Receber 6 salários por 1 mês de trabalho", correta: false },
              ],
            },
            {
              enunciado: "Qual é um dos principais impactos da jornada 6x1 na saúde do trabalhador?",
              explicacao: "A jornada 6x1 causa exaustão física e mental devido ao pouco tempo de recuperação.",
              opcoes: [
                { texto: "Exaustão física e mental", correta: true },
                { texto: "Aumento de produtividade", correta: false },
                { texto: "Melhora no condicionamento físico", correta: false },
                { texto: "Maior disposição para estudar", correta: false },
              ],
            },
            {
              enunciado: "Quantas horas semanais é a jornada comum no Brasil atualmente?",
              explicacao: "No Brasil, a jornada 6x1 equivale a 44 horas semanais.",
              opcoes: [
                { texto: "44 horas semanais", correta: true },
                { texto: "35 horas semanais", correta: false },
                { texto: "30 horas semanais", correta: false },
                { texto: "50 horas semanais", correta: false },
              ],
            },
            {
              enunciado: "O movimento pelo fim da jornada 6x1 defende principalmente:",
              explicacao: "O movimento defende a jornada 5x2 sem redução salarial.",
              opcoes: [
                { texto: "Jornada 5x2 sem redução salarial", correta: true },
                { texto: "Trabalho sem carteira assinada", correta: false },
                { texto: "Aumento da jornada para 48h", correta: false },
                { texto: "Fim do salário mínimo", correta: false },
              ],
            },
          ]
        : [
            {
              enunciado: "Qual é o adicional mínimo para hora extra segundo a CLT?",
              explicacao: "O adicional mínimo de hora extra é de 50% sobre o valor da hora normal.",
              opcoes: [
                { texto: "50%", correta: true },
                { texto: "25%", correta: false },
                { texto: "100%", correta: false },
                { texto: "10%", correta: false },
              ],
            },
            {
              enunciado: "Qual é o primeiro passo ao orientar um trabalhador com problemas no emprego?",
              explicacao: "O primeiro passo é escutar a situação com calma.",
              opcoes: [
                { texto: "Escutar a situação com calma", correta: true },
                { texto: "Mandar processar a empresa imediatamente", correta: false },
                { texto: "Postar a situação nas redes sociais", correta: false },
                { texto: "Ignorar e dizer que vai passar", correta: false },
              ],
            },
            {
              enunciado: "Qual órgão deve ser procurado primeiro em caso de problema trabalhista?",
              explicacao: "O sindicato da categoria é a primeira opção para buscar ajuda.",
              opcoes: [
                { texto: "Sindicato da categoria", correta: true },
                { texto: "Polícia militar", correta: false },
                { texto: "Câmara de vereadores", correta: false },
                { texto: "Receita Federal", correta: false },
              ],
            },
            {
              enunciado: "Qual é o percentual do FGTS depositado mensalmente pelo empregador?",
              explicacao: "O empregador deve depositar 8% do salário no FGTS do trabalhador.",
              opcoes: [
                { texto: "8%", correta: true },
                { texto: "5%", correta: false },
                { texto: "13%", correta: false },
                { texto: "20%", correta: false },
              ],
            },
            {
              enunciado: "Quantos dias de férias um trabalhador CLT tem direito após 12 meses?",
              explicacao: "São 30 dias de férias mais 1/3 adicional.",
              opcoes: [
                { texto: "30 dias + 1/3 adicional", correta: true },
                { texto: "15 dias sem adicional", correta: false },
                { texto: "20 dias + 1/4 adicional", correta: false },
                { texto: "45 dias sem adicional", correta: false },
              ],
            },
          ];

      await createQuizQuestions(aula.id, questionsData);
    }
  };

  // Shared helper to create quiz questions and options
  const createQuizQuestions = async (aulaId: string, questionsData: any[]) => {
    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];

      const { data: pergunta, error: perguntaError } = await supabase
        .from("quiz_perguntas")
        .insert({
          aula_id: aulaId,
          enunciado: q.enunciado,
          explicacao: q.explicacao,
          ordem: i + 1,
        })
        .select()
        .single();

      if (perguntaError) throw perguntaError;

      const opcoesWithPerguntaId = q.opcoes.map((op: any, idx: number) => ({
        pergunta_id: pergunta.id,
        texto: op.texto,
        correta: op.correta,
        ordem: idx + 1,
      }));

      const { error: opcoesError } = await supabase
        .from("quiz_opcoes")
        .insert(opcoesWithPerguntaId);

      if (opcoesError) throw opcoesError;
    }
  };

  return {
    counts: countsQuery.data,
    isLoading: countsQuery.isLoading,
    seedingModule,
    seedDebates,
    seedMissions,
    seedMateriais,
    seedFormacao,
    refetch: countsQuery.refetch,
  };
}
