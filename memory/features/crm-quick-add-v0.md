# Memory: features/crm-quick-add-v0
Updated: now

## Overview
CRM Quick Add v0 é um fluxo ultra-rápido (10 segundos) para voluntários cadastrarem ou atualizarem contatos via WhatsApp, integrando automaticamente com o sistema de Cadência (follow-ups) e Missões.

## Database Changes

### Columns Added to `crm_contatos`
- `whatsapp text null` - número como informado
- `whatsapp_norm text null` - normalizado (só dígitos)

### Indexes
- `idx_crm_whatsapp_norm` - busca rápida por número
- `idx_crm_criado_por` - busca por dono
- `idx_crm_owner_whatsapp_unique` - dedupe parcial (owner + whatsapp_norm)

## RPCs

### `upsert_quick_contact`
```sql
upsert_quick_contact(
  _nome text DEFAULT NULL,
  _whatsapp text DEFAULT NULL,
  _tags text[] DEFAULT '{}',
  _origem text DEFAULT 'manual',
  _schedule_kind text DEFAULT NULL,
  _schedule_in_hours int DEFAULT NULL,
  _context jsonb DEFAULT '{}'
) RETURNS jsonb
```

Comportamento:
1. Normaliza WhatsApp (só dígitos)
2. Busca contato existente por (criado_por, whatsapp_norm)
3. Se existe: atualiza nome/tags/origem
4. Se não existe: cria novo contato
5. Se schedule_kind + hours: agenda follow-up via Cadência v0
6. Retorna `{ contact_id, is_new, whatsapp_norm, scheduled_at }`

### `search_my_contacts`
```sql
search_my_contacts(_q text, _limit int DEFAULT 10)
```
Busca contatos do usuário por nome ou whatsapp.

## UI Components

### QuickAddContactModal
- `src/components/crm/QuickAddContactModal.tsx`
- Campos: WhatsApp (obrigatório), Nome (opcional), Tags rápidas
- Checkbox: "Agendar follow-up" (24/48/72h)
- Botão pós-save: "Abrir WhatsApp com roteiro"

### QuickCaptureCard
- `src/components/crm/QuickCaptureCard.tsx`
- Card compacto para `/voluntario/hoje`

### Hook
- `src/hooks/useQuickAddContact.tsx`
- `upsertContact()`, `openWhatsApp()`, tracking

## Integrations

### Missão de Rua
- Botão "+ Contato" na tela da missão
- Contexto: `{ mission_id, acao, bairro, cidade }`
- Origem: `rua`

### Voluntário Hoje
- `QuickCaptureCard` com CTA rápido

### WhatsApp Deep Link
- Formato: `https://wa.me/55XXXXXXXXXXX?text=...`
- UTM: `utm_source=followup&utm_medium=whatsapp`

## Tracking Events
- `crm_quick_add_opened`
- `crm_quick_add_saved`
- `crm_quick_add_whatsapp_opened`

Meta (sem PII): `{ origem, cidade, has_name, tags_count, scheduled_kind, scheduled_hours }`

## Dedupe Logic
- Unique constraint: `(criado_por, whatsapp_norm)` quando `whatsapp_norm IS NOT NULL`
- Se mesmo número já existe para o owner: faz UPDATE em vez de INSERT

## Timezone
- Follow-ups calculados em `America/Sao_Paulo`

## Files Modified/Created
- `src/hooks/useQuickAddContact.tsx` (new)
- `src/components/crm/QuickAddContactModal.tsx` (new)
- `src/components/crm/QuickCaptureCard.tsx` (new)
- `src/pages/VoluntarioHoje.tsx` (added QuickCaptureCard)
- `src/pages/VoluntarioMissaoRua.tsx` (added QuickAdd button + modal)
