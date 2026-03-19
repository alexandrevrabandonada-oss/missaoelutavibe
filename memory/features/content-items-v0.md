# Memory: features/content-items-v0
Updated: now

Content Items v0: Sistema unificado de conteúdo (materiais, sharepacks, templates) com suporte a reações/curadoria e assets desacoplados. Todo upload cria content_items automaticamente.

## Database Schema

### Table: `content_items`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | ENUM | MATERIAL, SHAREPACK, TEMPLATE |
| title | TEXT | Display name |
| description | TEXT | Optional description |
| status | ENUM | DRAFT, PUBLISHED, ARCHIVED |
| tags | TEXT[] | Searchable tags |
| scope_tipo | TEXT | global, cidade, celula |
| scope_id | TEXT | Optional scope reference |
| parent_content_id | UUID | FK para variações de templates |
| legenda_whatsapp | TEXT | WhatsApp caption (sharepack) |
| legenda_instagram | TEXT | Instagram caption (sharepack) |
| legenda_tiktok | TEXT | TikTok caption (sharepack) |
| hashtags | TEXT[] | Hashtags (sharepack) |
| hook | TEXT | Attention hook (sharepack) |
| cta | TEXT | Call to action (sharepack) |
| created_by | UUID | Creator user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |
| published_at | TIMESTAMPTZ | Publication timestamp |
| published_by | UUID | Publisher user ID |

### Table: `content_assets` (join)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| content_id | UUID | FK to content_items |
| asset_id | UUID | FK to assets |
| role | ENUM | PRIMARY, THUMBNAIL, CARD_1x1, CARD_4x5, STORY_9x16, THUMB_16x9, ATTACHMENT |
| ordem | INT | Order for sorting |

### Table: `content_signals` (reactions)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| content_id | UUID | FK to content_items |
| user_id | UUID | User who reacted |
| signal | TEXT | util, replicar, divulgar, puxo |
| created_at | TIMESTAMPTZ | Reaction timestamp |

## RPCs
- `get_content_signal_counts(p_content_id)`: Returns signal counts + user_reacted for a content item
- `get_top_content_week(p_type, p_limit)`: Returns top content by signal count in last 7 days

## Hooks
- `src/hooks/useContentItems.tsx`: CRUD for content_items, link/unlink assets
- `src/hooks/useContentSignals.tsx`: Signal counts, toggle, top content
- `src/hooks/useContentUpload.tsx`: Upload que cria content_item + asset + link automaticamente

## Components
- `src/components/content/ContentSignalsBar.tsx`: Reaction buttons bar
- `src/components/content/MaterialCard.tsx`: Card for MATERIAL type content
- `src/components/content/TopContentCard.tsx`: Top da Semana ranking
- `src/components/fabrica/ContentUploadDropzone.tsx`: Dropzone com seleção de tipo e tags
- `src/components/fabrica/ContentItemGrid.tsx`: Grid com ações de aprovação/arquivamento

## Pages
- `/fabrica/arquivos`: Gerenciamento de conteúdo com upload, filtros e migração de assets antigos
- `/voluntario/base`: Listagem de SHAREPACK/TEMPLATE publicados com filtro por tags

## Signal Types
- ✅ util: "Útil"
- ♻️ replicar: "Replicar"  
- 📣 divulgar: "Divulgar"
- 🤝 puxo: "Puxo"

## Asset Roles for Sharepacks
- PRIMARY: Asset principal (exibido em preview)
- CARD_1x1: Quadrado (1080x1080)
- CARD_4x5: Feed Instagram (1080x1350)
- STORY_9x16: Stories/Reels (1080x1920)
- THUMB_16x9: Thumbnail (1920x1080)
- ATTACHMENT: Documentos e outros anexos

## Upload Flow
1. Usuário seleciona tipo (MATERIAL/SHAREPACK/TEMPLATE) e tags opcionais
2. Arquivo é enviado para storage `assets-public`
3. Registro criado em `assets` com status DRAFT
4. Registro criado em `content_items` com mesmo título
5. Link criado em `content_assets` com role apropriado
6. Admin aprova via ação Aprovar → status = PUBLISHED

## Migration
- `useMigrateOrphanAssets()`: Converte assets antigos (sem content_item) em content_items automaticamente
