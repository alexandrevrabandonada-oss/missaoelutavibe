
-- Seed 20 pilot content items for "Fábrica de Base v0.1"
-- Admin user as creator
DO $$
DECLARE
  admin_id UUID := 'debc123a-c7f0-46ed-87f5-0ef0c0a2715f';
BEGIN

-- === 5 CONVITE / POR QUE ENTRAR ===

INSERT INTO public.content_items (type, title, description, status, tags, scope_tipo, created_by, legenda_whatsapp, legenda_instagram, hook, cta, published_at, published_by) VALUES
('MATERIAL', 'Por que entrar no movimento?', 'Você já sentiu que algo no seu bairro precisa mudar, mas não sabe por onde começar? O Missão ÉLuta conecta pessoas comuns que querem cuidar da sua cidade. Sem partido, sem patrão. Só gente que escuta, cuida e organiza. 10 minutos por dia já fazem diferença.', 'PUBLISHED', ARRAY['convite','organizacao','canonical'], 'global', admin_id,
'🔥 Quer fazer algo pelo seu bairro em 10 min/dia? Entra no Missão ÉLuta — escutar, cuidar, organizar. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Você já sentiu que algo no seu bairro precisa mudar? O Missão ÉLuta conecta pessoas comuns que querem cuidar da sua cidade. 10 min/dia já fazem diferença. 🔥 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Quer mudar algo no seu bairro?', 'Entre agora pelo link', now(), admin_id),

('MATERIAL', '10 minutos que mudam tudo', 'Você não precisa de muito tempo pra fazer diferença. Com 10 minutos por dia, você escuta um vizinho, registra um problema, ou convida alguém pro movimento. Pequenas ações todo dia constroem algo grande. É assim que a gente organiza a cidade de verdade.', 'PUBLISHED', ARRAY['convite','cuidado','canonical'], 'global', admin_id,
'⏱️ 10 minutos por dia. É o tempo de um café. Mas é o suficiente pra escutar um vizinho, registrar um problema ou convidar alguém pro movimento. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'10 minutos. É o tempo de um café. ☕ Mas é o suficiente pra escutar, registrar e organizar. Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'10 minutos mudam tudo', 'Comece agora', now(), admin_id),

('MATERIAL', 'Não precisa ser herói', 'Ninguém precisa salvar o mundo sozinho. O que a gente precisa é de gente normal fazendo coisas simples: ouvindo quem tá perto, anotando o que tá errado, chamando mais uma pessoa. Heroísmo é coletivo. E começa com você.', 'PUBLISHED', ARRAY['convite','cuidado'], 'global', admin_id,
'💪 Não precisa ser herói. Precisa ser vizinho. Escutar, anotar, chamar +1. É assim que a cidade muda. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Não precisa ser herói. Precisa ser vizinho. 💪 Escutar, anotar, chamar mais um. Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Não precisa ser herói', 'Chama mais um', now(), admin_id),

('MATERIAL', 'O que você ganha participando?', 'Participar do Missão ÉLuta é ganhar voz, conexão e propósito. Você conhece gente do seu bairro, aprende a escutar de verdade, e faz parte de algo maior. Não é favor — é direito. A cidade é sua também.', 'PUBLISHED', ARRAY['convite','organizacao'], 'global', admin_id,
'🎯 O que você ganha? Voz, conexão e propósito. Conhece gente do bairro, aprende a escutar e faz parte de algo maior. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Voz, conexão e propósito. É isso que você ganha. 🎯 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'O que você ganha?', 'Participe agora', now(), admin_id),

('MATERIAL', 'Chama +1: o movimento cresce assim', 'Cada pessoa que você convida é mais um par de olhos no bairro, mais uma voz na roda, mais um braço na ação. O movimento não cresce por marketing — cresce por confiança. Se você confia em alguém, chama. Simples assim.', 'PUBLISHED', ARRAY['convite','organizacao','canonical'], 'global', admin_id,
'🤝 O movimento cresce por confiança. Se você confia em alguém, chama. Mais um par de olhos, mais uma voz. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'O movimento cresce por confiança. 🤝 Se você confia em alguém, chama. Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Chama +1', 'Convide pelo link', now(), admin_id),

-- === 5 ESCUTA / PERGUNTAS PRONTAS ===

('MATERIAL', 'Escuta rápida: 3 perguntas pro vizinho', 'Quer escutar alguém do bairro mas não sabe como começar? Use estas 3 perguntas: 1) O que mais te incomoda aqui no bairro? 2) Se pudesse mudar uma coisa, o que seria? 3) Você conhece mais alguém que pensa como você? Simples, direto, humano.', 'PUBLISHED', ARRAY['escuta','cuidado','canonical'], 'global', admin_id,
'👂 3 perguntas pra escutar seu vizinho: 1) O que te incomoda no bairro? 2) O que mudaria? 3) Conhece alguém que pensa igual? Simples e humano. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'3 perguntas pra começar uma escuta real. 👂 Simples, direto, humano. Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'3 perguntas pro vizinho', 'Escute alguém hoje', now(), admin_id),

('MATERIAL', 'Como escutar sem julgar', 'Escutar de verdade é difícil. A gente quer responder, corrigir, opinar. Mas na escuta ativa, o mais importante é: deixar a pessoa falar, mostrar que você entendeu, e não tentar resolver na hora. Anotar depois. Isso já é ação.', 'PUBLISHED', ARRAY['escuta','cuidado','canonical'], 'global', admin_id,
'🫶 Escutar de verdade: deixar falar, entender, anotar depois. Não precisa resolver na hora. Isso já é ação. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Escutar de verdade é a primeira ação. 🫶 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Como escutar sem julgar', 'Pratique hoje', now(), admin_id),

('MATERIAL', 'Roteiro: conversa na padaria', 'Tá na fila da padaria? Aproveite. "E aí, como tá o bairro pra você?" — essa frase abre portas. Se a pessoa reclamar de algo, escute até o fim. Depois: "Tem um grupo de gente que tá tentando organizar isso. Posso te passar o link?" Natural. Sem pressão.', 'PUBLISHED', ARRAY['escuta','organizacao'], 'global', admin_id,
'🥖 Na padaria? "Como tá o bairro pra você?" — essa frase abre portas. Escute, anote, convide. Natural, sem pressão. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Na fila da padaria? Uma frase abre portas. 🥖 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Conversa na padaria', 'Tente hoje', now(), admin_id),

('MATERIAL', 'Perguntas de saúde e transporte', 'Dois temas que todo mundo sente: saúde e transporte. Pergunte: "Você consegue atendimento no posto?" e "Como é seu trajeto pro trabalho?". As respostas revelam muito sobre o que precisa mudar. Escute e registre.', 'PUBLISHED', ARRAY['escuta','saude','transporte'], 'global', admin_id,
'🏥🚌 Saúde e transporte: dois temas que todo mundo sente. Pergunte, escute, registre. As respostas mostram o que precisa mudar. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Saúde e transporte: temas que todo mundo sente. 🏥🚌 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Perguntas de saúde e transporte', 'Escute e registre', now(), admin_id),

('MATERIAL', 'Mini-escuta: 5 minutos no ponto de ônibus', 'O ponto de ônibus é o melhor lugar pra escutar. As pessoas estão paradas, esperando, e geralmente com vontade de falar. "Muito ônibus atrasado hoje?" é tudo que você precisa dizer. O resto vem naturalmente.', 'PUBLISHED', ARRAY['escuta','transporte'], 'global', admin_id,
'🚏 O ponto de ônibus é o melhor lugar pra escutar. "Muito ônibus atrasado?" é tudo que precisa dizer. O resto vem. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'O ponto de ônibus é o melhor lugar pra escutar. 🚏 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'5 min no ponto de ônibus', 'Escute alguém hoje', now(), admin_id),

-- === 5 DENÚNCIA COM CUIDADO ===

('MATERIAL', 'Como denunciar sem se expor', 'Denunciar é importante, mas segurança vem primeiro. Nunca acuse nomes diretamente. Foque na estrutura: "Falta iluminação na rua X", não "Fulano é culpado". Use foto sem rostos. Registre data e local. Se possível, faça em grupo.', 'PUBLISHED', ARRAY['denuncia','cidade','canonical'], 'global', admin_id,
'⚠️ Denunciar é importante, mas segurança vem primeiro. Foque na estrutura, não em nomes. Foto sem rostos, data e local. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Denunciar com segurança: foque na estrutura, não em nomes. ⚠️ Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Denuncie sem se expor', 'Registre com segurança', now(), admin_id),

('MATERIAL', 'Modelo: registro de problema no bairro', 'Use este modelo pra registrar: DATA | LOCAL (rua + número aprox.) | PROBLEMA (1 frase) | EVIDÊNCIA (foto/vídeo sem rostos) | RECORRÊNCIA (primeira vez ou repetido?). Quanto mais registros organizados, mais força pra cobrar solução.', 'PUBLISHED', ARRAY['denuncia','cidade','canonical'], 'global', admin_id,
'📋 Modelo pra registro: Data, Local, Problema, Foto, Recorrência. Organizado assim, fica forte pra cobrar. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Registre problemas de forma organizada. 📋 Mais registros = mais força. Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Modelo de registro', 'Registre agora', now(), admin_id),

('MATERIAL', 'O que pode ser denunciado?', 'Buraco na rua, poste apagado, esgoto a céu aberto, ponto de ônibus destruído, mato alto, lixo acumulado, falta dágua recorrente. Tudo isso é responsabilidade pública. Registrar é o primeiro passo pra cobrar. Não é reclamação — é cidadania.', 'PUBLISHED', ARRAY['denuncia','cidade'], 'global', admin_id,
'🏙️ Buraco, poste apagado, esgoto, lixo... Tudo isso é responsabilidade pública. Registrar é cidadania. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Registrar problemas não é reclamação — é cidadania. 🏙️ Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'O que denunciar?', 'Registre hoje', now(), admin_id),

('MATERIAL', 'Denúncia coletiva: mais vozes, mais força', 'Uma pessoa reclamando é "chata". Dez pessoas registrando o mesmo problema é movimento. Combine com vizinhos: todo mundo registra o mesmo buraco, o mesmo poste. Números falam mais alto que palavras.', 'PUBLISHED', ARRAY['denuncia','organizacao'], 'global', admin_id,
'📢 1 pessoa reclamando é "chata". 10 registrando o mesmo problema é MOVIMENTO. Combine com vizinhos. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Uma pessoa é "chata". Dez é movimento. 📢 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Denúncia coletiva', 'Organize com vizinhos', now(), admin_id),

('MATERIAL', 'Poluição e meio ambiente: o que olhar', 'Fumaça preta, cheiro forte, água suja, terreno contaminado. Se você vê isso no bairro, registre: foto + localização + horário + frequência. Problemas ambientais afetam saúde. Não ignore — documente.', 'PUBLISHED', ARRAY['denuncia','poluicao','saude'], 'global', admin_id,
'🌱 Fumaça, cheiro forte, água suja? Registre: foto + local + horário. Problemas ambientais afetam saúde. Não ignore. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Problemas ambientais afetam saúde. Não ignore — documente. 🌱 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Poluição: o que olhar', 'Documente agora', now(), admin_id),

-- === 5 PROVA / REGISTRO DE BAIRRO ===

('MATERIAL', 'Como tirar foto de problema urbano', 'Regra de ouro: sem rostos, com contexto. Mostre a rua, o número, algo que identifique o local. Tire de dia se possível. Uma foto boa vale mais que mil palavras. E protege todo mundo.', 'PUBLISHED', ARRAY['registro','cidade','canonical'], 'global', admin_id,
'📸 Foto de problema urbano: sem rostos, com contexto. Mostre a rua, o número. Uma foto boa vale mil palavras. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Como registrar problemas com segurança. 📸 Sem rostos, com contexto. Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Foto de problema urbano', 'Registre com foto', now(), admin_id),

('MATERIAL', 'Vídeo curto: 15 segundos que provam', 'Às vezes foto não basta. Esgoto correndo, ônibus lotado, barulho excessivo — vídeo de 15s mostra a realidade. Narrar baixinho o que acontece ("Aqui na rua X, dia tal, esse esgoto tá assim há semanas") dá contexto sem expor ninguém.', 'PUBLISHED', ARRAY['registro','cidade'], 'global', admin_id,
'🎥 15 segundos de vídeo provam mais que mil palavras. Narre baixinho, sem expor ninguém. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'15 segundos que provam a realidade. 🎥 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Vídeo de 15 segundos', 'Grave e registre', now(), admin_id),

('MATERIAL', 'Mapa do bairro: onde estão os problemas?', 'Pegue um papel ou abra o maps. Marque: onde falta luz, onde alaga, onde o ônibus não passa, onde tem lixo. Esse mapa informal já é inteligência territorial. Quando juntar vários, vira diagnóstico de verdade.', 'PUBLISHED', ARRAY['registro','cidade','organizacao'], 'global', admin_id,
'🗺️ Mapeie seu bairro: onde falta luz, onde alaga, onde tem lixo. Esse mapa já é inteligência territorial. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Mapeie os problemas do seu bairro. 🗺️ Inteligência territorial começa assim. Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Mapa do bairro', 'Mapeie hoje', now(), admin_id),

('MATERIAL', 'Antes e depois: o poder do registro', 'Registre hoje. Daqui a 30 dias, registre de novo no mesmo lugar. Se melhorou, é prova de que cobrar funciona. Se piorou, é prova de que precisa mais pressão. O antes/depois é a arma mais poderosa do cidadão organizado.', 'PUBLISHED', ARRAY['registro','organizacao'], 'global', admin_id,
'📊 Antes e depois: registre hoje, registre em 30 dias. Se melhorou, cobrar funciona. Se piorou, precisa mais. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'O antes e depois é a arma mais poderosa do cidadão. 📊 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Antes e depois', 'Registre hoje', now(), admin_id),

('MATERIAL', 'Segurança digital: proteja seus registros', 'Salve fotos e vídeos em nuvem (Google Drive, WhatsApp salvo). Não poste em redes sem pensar. Compartilhe primeiro no grupo do movimento. Se o registro for sensível, envie sem metadados (prints em vez de originais). Cuide de você.', 'PUBLISHED', ARRAY['registro','cuidado'], 'global', admin_id,
'🔒 Proteja seus registros: salve em nuvem, não poste sem pensar, compartilhe no grupo primeiro. Cuide de você. Pré-campanha Alexandre Fonseca. Escutar • Cuidar • Organizar',
'Segurança digital: proteja seus registros e proteja você. 🔒 Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar',
'Segurança digital', 'Proteja seus dados', now(), admin_id);

END $$;
