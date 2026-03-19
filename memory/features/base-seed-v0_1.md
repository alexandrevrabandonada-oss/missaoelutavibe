# Memory: features/base-seed-v0_1
Updated: now

Fábrica de Base v0.1: Seed de 20 materiais + curadoria + share 1-clique para alimentar o Piloto.

## Seed (20 itens)
- 5 "Convite / Por que entrar" (tags: convite)
- 5 "Escuta / perguntas prontas" (tags: escuta)  
- 5 "Denúncia com cuidado" (tags: denuncia)
- 5 "Prova / registro de bairro" (tags: registro)

## Canônicos (8 itens, tag: `canonical`)
1. Por que entrar no movimento? (convite)
2. 10 minutos que mudam tudo (convite)
3. Chama +1: o movimento cresce assim (convite)
4. Escuta rápida: 3 perguntas pro vizinho (escuta)
5. Como escutar sem julgar (escuta)
6. Como denunciar sem se expor (denuncia)
7. Modelo: registro de problema no bairro (denuncia)
8. Como tirar foto de problema urbano (registro)

## Temas (tags)
convite, escuta, denuncia, registro, organizacao, cuidado, cidade, saude, transporte, poluicao

## Campos utilizados
- `type`: MATERIAL (todos)
- `status`: PUBLISHED
- `tags[]`: tema + "canonical" para os 8 principais
- `description`: body text (até 600 chars)
- `legenda_whatsapp`: texto pronto para WhatsApp
- `legenda_instagram`: legenda Instagram com marca
- `hook`: frase de atenção
- `cta`: call to action curto

## Curadoria em /voluntario/base
- Seção "Recomendados do Piloto": 8 canônicos (tag canonical)
- Seção "Mais materiais": restante
- Cada item tem botão "Compartilhar agora" → ShareMaterialModal

## ShareMaterialModal
- WhatsApp (wa.me com texto pronto)
- Copiar legenda Instagram
- Copiar texto curto
- Copiar link com invite_code do usuário
- Footer fixo: "Pré-campanha — Alexandre Fonseca | Escutar • Cuidar • Organizar"

## Guardrails
- Máximo 20 itens no seed
- Diagnóstico: BaseSeedCheckCard em /admin/diagnostico
  - Warning se materiais < 20 ou canônicos < 8

## Componentes
- `src/components/content/ShareMaterialModal.tsx`
- `src/components/admin/BaseSeedCheckCard.tsx`

## Páginas afetadas
- `/voluntario/base` (VoluntarioBase.tsx) - curadoria com canônicos no topo
- `/admin/diagnostico` (AdminDiagnostico.tsx) - BaseSeedCheckCard
