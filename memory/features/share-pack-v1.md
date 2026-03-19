# Memory: features/share-pack-v1
Updated: now

Share Pack v1: Multi-platform optimized sharing for Fábrica de Base. Enables volunteers to share content to WhatsApp, Instagram (Feed/Reels), and TikTok with platform-specific captions, trackable links, and media variants.

## Key Components
- **SharePackModal** (`src/components/fabrica/SharePackModal.tsx`): Mobile-first sharing modal with platform tabs, Web Share API integration, and fallbacks for desktop.
- **SharePackEditor** (`src/components/admin/SharePackEditor.tsx`): Admin form for configuring platform-specific texts and media variants.
- **SharePackMetricsCard** (`src/components/admin/SharePackMetricsCard.tsx`): Ops dashboard card showing share stats by platform.

## Database Extensions (non-destructive)
- `fabrica_templates.share_pack_json`: Platform-specific captions (whatsapp_text, instagram_caption, tiktok_caption, hook, cta)
- `fabrica_templates.attachments_by_variant`: Media files by aspect ratio (square_1x1, feed_4x5, vertical_9x16, thumb_16x9)

## RPCs
- `get_share_pack(template_id, platform)`: Returns caption, trackable link, files for chosen platform
- `track_share_action(template_id, action, meta)`: Logs shares to fabrica_downloads + growth_events
- `get_share_pack_metrics(scope_tipo, scope_id, days)`: Aggregate share stats for Ops

## Tracking Actions
- `share_whatsapp`, `share_instagram_feed`, `share_instagram_reels`, `share_tiktok`
- `copy_caption`, `copy_link`, `download_media`

## Trackable Link Format
`/comecar?t=<template_id>&ref=<invite_code>&utm_source=fabrica&utm_medium=<platform>&utm_campaign=<slug>`

## UX Flow
1. Volunteer opens `/voluntario/base`
2. Clicks "Compartilhar" on a template
3. Modal opens with platform tabs (WhatsApp, IG Feed, Reels, TikTok)
4. On mobile: uses Web Share API with files
5. On desktop: fallback to download + copy buttons
6. All actions tracked for analytics and growth funnel
