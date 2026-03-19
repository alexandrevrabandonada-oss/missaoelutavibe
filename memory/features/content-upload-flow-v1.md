# Memory: features/content-upload-flow-v1
Updated: now

Content items (MATERIAL, SHAREPACK, TEMPLATE) now follow a strict unified upload flow where every file upload via 'ContentUploadWizard' automatically creates a linked 'content_item' in DRAFT status. These items are associated via 'content_assets' using specific roles (PRIMARY, STORY_9x16, ATTACHMENT). The management interface in '/fabrica/arquivos' has been refactored to focus on these high-level content items rather than raw assets, supporting approval workflows (Aprovar/Arquivar) and child-item creation ('Send Variation') for sharepack templates.

## Upload Flow
1. **ContentUploadWizard** - 4-step wizard (30s):
   - Step 1: Choose type (SHAREPACK/TEMPLATE/MATERIAL)
   - Step 2: Select file (drag & drop)
   - Step 3: Pick categories (chips, multi-select)
   - Step 4: Add title + optional caption
   - Creates content_item (DRAFT) + asset + content_assets link

2. **Variation Flow**:
   - Opens wizard with `parentContentId` and `parentTags` prefilled
   - Creates TEMPLATE type with inherited tags
   - Linked via `parent_content_id` column

## Pages

### /voluntario/base (Fábrica de Base)
- Grid catalog of PUBLISHED sharepacks/templates
- Detail drawer with preview, download dropdown by role, signals
- Featured sections: "Top da Semana" (by signals) + "Recomendados" (tag:featured)
- Search + category filter tabs
- FAB for quick upload

### /voluntario/meus-envios
- List of user's submitted content items
- Status tabs: All | Pending | Published
- Delete action for drafts
- Upload CTA in empty state

### /fabrica/arquivos (Admin Inbox)
- Defaults to "Pendentes" tab with badge count
- 1-click approve (PUBLISHED) / archive actions
- Tabs: Pending | All | Published | Archived
- Type filter + search
- Migration tool for legacy assets

## Components
- `ContentUploadWizard` - Step-by-step upload experience
- `ContentDetailDrawer` - Sheet with full preview + actions
- `FeaturedContentSection` - Top + Recomendados cards
- `ContentItemGrid` - Grid with status badges + actions

## Download by Role
Dropdown in drawer groups assets by role:
- PRIMARY (Principal)
- CARD_1x1, CARD_4x5, STORY_9x16, THUMB_16x9
- ATTACHMENT (documents)
- "Baixar todos" option when multiple files
