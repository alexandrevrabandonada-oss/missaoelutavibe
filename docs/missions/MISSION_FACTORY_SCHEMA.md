# Mission Factory — JSON Pack Schema

**Version:** v0.1  
**Updated:** 2026-01-29

## Overview

The Mission Factory allows coordinators to create missions in bulk by importing a JSON pack. This document describes the schema for mission packs.

## JSON Pack Structure

```json
{
  "pack": {
    "id": "pack_agora_v01",
    "title": "Missões AGORA (v0.1)",
    "defaults": {
      "assigned_to": "all",
      "status": "draft",
      "estimated_min": 15,
      "points": 10,
      "requires_validation": true
    }
  },
  "missions": [
    {
      "type": "rua",
      "title": "Mini-escuta no bairro (2 perguntas)",
      "description": "Fale com 1 pessoa e registre respostas sem expor dados.",
      "tags": ["campo", "escuta", "agora"],
      "estimated_min": 15,
      "status": "published",
      "assigned_to": "all",
      "ciclo_id": null,
      "instructions": "1. Encontre uma pessoa. 2. Pergunte...",
      "points": 10,
      "meta": {
        "steps": ["Passo 1", "Passo 2"],
        "evidence": { "kind": "text", "required": true },
        "questions": ["Pergunta 1?", "Pergunta 2?"]
      }
    }
  ]
}
```

## Pack Metadata (`pack`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | Unique identifier for the pack. Auto-generated if not provided. |
| `title` | string | No | Human-readable name for the pack. |
| `defaults` | object | No | Default values applied to all missions in the pack. |

### Defaults Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `assigned_to` | string | `"all"` | Who can see the mission: `all`, `user:<uuid>`, `cell:<uuid>` |
| `status` | string | `"draft"` | Initial status: `rascunho`, `publicada` |
| `estimated_min` | number | `15` | Estimated time in minutes |
| `points` | number | `10` | XP points for completion |
| `requires_validation` | boolean | `true` | Whether evidence needs manual validation |
| `ciclo_id` | string | `null` | UUID of the cycle to associate missions with |

## Mission Object (`missions[]`)

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | Mission type. One of: `escuta`, `rua`, `mobilizacao`, `conteudo`, `dados`, `formacao`, `conversa` |
| `title` | string | Mission title (displayed to volunteers) |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `description` | string | `null` | Short description of the mission |
| `instructions` | string | `null` | Step-by-step instructions |
| `tags` | string[] | `[]` | Categorization tags |
| `estimated_min` | number | from defaults | Time estimate in minutes |
| `status` | string | from defaults | Status override |
| `assigned_to` | string | from defaults | Assignment scope |
| `ciclo_id` | string | from defaults | Cycle UUID |
| `points` | number | from defaults | XP points |
| `requires_validation` | boolean | from defaults | Validation requirement |
| `meta` | object | `{}` | Custom metadata (merged into `meta_json`) |

## Mission Types

| Type | Description | Typical Use |
|------|-------------|-------------|
| `escuta` | Listening/research | Surveys, interviews |
| `rua` | Street action | Leafleting, door-to-door |
| `mobilizacao` | Mobilization | Event organizing, outreach |
| `conteudo` | Content creation | Social media, materials |
| `dados` | Data entry | CRM updates, research |
| `formacao` | Training | Complete a course, study |
| `conversa` | Conversation | CRM follow-ups, calls |

## Assignment Scopes (`assigned_to`)

| Value | Description |
|-------|-------------|
| `all` | Visible to all approved volunteers |
| `user:<uuid>` | Only visible to a specific user |
| `cell:<uuid>` | Only visible to members of a specific cell |

## Status Values

| Status | Description |
|--------|-------------|
| `rascunho` | Draft - not visible to volunteers |
| `publicada` | Published - visible to volunteers |
| `em_andamento` | In progress - accepted by a volunteer |
| `enviada` | Submitted - evidence sent |
| `validada` | Validated - evidence approved |
| `reprovada` | Rejected - evidence rejected |
| `concluida` | Completed - mission closed |

## Import Modes

When importing via the Admin UI:

| Mode | Effect |
|------|--------|
| `draft` | Uses mission's `status` or defaults to `rascunho` |
| `publish` | Forces all missions to `publicada` |

## Factory Metadata

All imported missions include factory metadata in `meta_json._factory`:

```json
{
  "_factory": {
    "packId": "pack_agora_v01",
    "packTitle": "Missões AGORA (v0.1)",
    "importedBy": "uuid-of-importer",
    "importedAt": "2026-01-29T12:00:00Z",
    "mode": "publish"
  }
}
```

## Best Practices

### Tags Convention

Use consistent tags for filtering:

- **Location**: `campo`, `online`, `hibrido`
- **Urgency**: `agora`, `semana`, `mes`
- **Type**: `escuta`, `panfletagem`, `conversa`
- **Difficulty**: `facil`, `medio`, `avancado`

### Time Estimates

Standard time buckets:

- `10` - Quick task (phone call, simple post)
- `15` - Short task (brief conversation, simple data entry)
- `30` - Medium task (interview, detailed content)
- `60` - Long task (event attendance, research)
- `120` - Extended task (training, multiple visits)

### Ciclos Integration

For missions that should appear in weekly planning:

1. Get the active cycle ID from Admin
2. Set `ciclo_id` in defaults or per-mission
3. Missions without `ciclo_id` don't appear in "Semana" view

## Example Packs

### Quick Street Actions

```json
{
  "pack": {
    "id": "street_quick_v01",
    "title": "Ações Rápidas de Rua",
    "defaults": { "type": "rua", "estimated_min": 10 }
  },
  "missions": [
    { "title": "1 conversa no ponto de ônibus", "tags": ["campo", "facil"] },
    { "title": "Entregar 5 panfletos", "tags": ["campo", "panfletagem"] },
    { "title": "Colar 2 adesivos", "tags": ["campo", "material"] }
  ]
}
```

### Research Campaign

```json
{
  "pack": {
    "id": "research_jan2026",
    "title": "Pesquisa Janeiro 2026",
    "defaults": { 
      "type": "escuta", 
      "estimated_min": 20,
      "assigned_to": "all"
    }
  },
  "missions": [
    {
      "title": "Entrevistar 1 comerciante",
      "description": "Aplicar questionário padrão no comércio local",
      "tags": ["escuta", "comercio"],
      "meta": {
        "questions": [
          "Como está o movimento?",
          "Qual sua maior preocupação?"
        ]
      }
    }
  ]
}
```

## RPC Reference

### `import_mission_pack`

```sql
SELECT * FROM import_mission_pack(
  _pack_json := '{"pack": {...}, "missions": [...]}',
  _actor_user_id := 'uuid',
  _mode := 'draft' -- or 'publish'
);
```

**Returns:**
```json
{
  "ok": true,
  "created": [{"id": "uuid", "type": "rua", "title": "..."}],
  "errors": [{"index": 2, "reason": "invalid type"}],
  "total_processed": 10,
  "total_created": 9,
  "total_errors": 1
}
```

## Related Documentation

- [DIAG_MISSOES.md](../diag/DIAG_MISSOES.md) - Complete mission system diagnostic
- [street-missions-v0.md](../../memory/features/street-missions-v0.md) - Street missions feature
- [missoes-conversa-v0.md](../../memory/features/missoes-conversa-v0-crm.md) - Conversation missions
