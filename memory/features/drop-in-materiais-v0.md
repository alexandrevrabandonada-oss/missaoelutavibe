# Memory: features/drop-in-materiais-v0
Updated: 2026-01-26

Drop-in de Materiais v0: Sistema de gestão de assets na Fábrica com upload drag&drop, organização por tipo e workflow de aprovação.

## Database

### Table: `assets`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Display name (auto from filename) |
| kind | TEXT | image, video, document, audio, other |
| bucket | TEXT | Storage bucket (default: assets-public) |
| path | TEXT | Full path in bucket |
| mime_type | TEXT | File MIME type |
| size | BIGINT | File size in bytes |
| tags | TEXT[] | Searchable tags |
| status | TEXT | DRAFT, PUBLISHED, ARCHIVED |
| thumb_path | TEXT | Optional thumbnail path |
| created_by | UUID | Uploader user ID |
| created_at | TIMESTAMPTZ | Upload timestamp |
| updated_at | TIMESTAMPTZ | Last modification |

### Storage Bucket: `assets-public`
- Public bucket for all Fábrica assets
- Path organization:
  - `sharepacks/YYYY-MM/` - Images and videos for share packs
  - `materiais/` - Documents and PDFs
  - `formacao/` - Training materials (future)

### RLS Policies
- Anyone can SELECT published assets
- Users can SELECT their own drafts
- Authenticated users can INSERT (own assets)
- Users can UPDATE their own assets
- Admins can do everything (via admins table check)

## Components

### `src/hooks/useAssets.tsx`
- `useAssets(options)` - Query assets with filters (status, kind, search, tag)
- `useAssetUpload()` - Upload mutation with auto kind detection
- `useAssetActions()` - Actions: updateStatus, deleteAsset, getPublicUrl, copyLink, downloadAsset

### `src/components/fabrica/AssetDropzone.tsx`
- Drag & drop upload zone
- Multi-file upload with queue
- Progress indicators per file
- Auto-creates asset record on upload

### `src/components/fabrica/AssetGrid.tsx`
- Grid display of assets with thumbnails
- Status badges (Aguardando aprovação, Arquivado)
- Hover actions: Ver, Baixar
- Dropdown menu: Abrir, Baixar, Copiar link, Aprovar, Arquivar, Excluir

### `src/pages/FabricaArquivos.tsx`
- Route: `/fabrica/arquivos`
- Collapsible upload section
- Search and filters (tipo, status)
- Tabs: Todos, Imagens, Vídeos, Documentos
- Stats footer

## Status Workflow
1. **DRAFT** - Uploaded, awaiting approval (shows "Aguardando aprovação" badge)
2. **PUBLISHED** - Approved, visible everywhere
3. **ARCHIVED** - Hidden from lists, can be restored

## URL Generation
All asset URLs use Supabase Storage public URL:
```typescript
supabase.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl
```

## Files
- `src/hooks/useAssets.tsx`
- `src/components/fabrica/AssetDropzone.tsx`
- `src/components/fabrica/AssetGrid.tsx`
- `src/pages/FabricaArquivos.tsx`
- Migration: `assets` table + `assets-public` bucket + RLS policies
