# Kit de Impressão v0

Feature: Print Kit for Fábrica de Base - export A4 flyers and 9x9cm stickers with QR codes

## Core Implementation

### Components
- `src/components/fabrica/PrintKitModal.tsx`: Main modal with A4Flyer and StickerQR renderers
- Integrated into `src/pages/AdminFabrica.tsx` for approved templates

### Print Formats
- **A4 Flyer** (210×297mm @ 300 DPI = 2480×3508px): Full page with title, subtitle, QR, CTA
- **Sticker 9x9cm** (90×90mm @ 300 DPI = 1063×1063px): Square QR sticker with branding

### QR Link Format
```
/r/{inviteCode}?cidade={cidade}&utm_source=impresso&utm_medium=qr&utm_campaign={templateIdPrefix}
```

### Tracking
- Event: `template_print_download` logged via `log_growth_event` RPC
- Meta: `{ format: 'a4' | 'sticker', cidade: string }`

### Storage
- Saved to `attachments_by_variant` with keys: `a4`, `sticker`
- Uses dataURL format (v0) for direct storage

## Technical Notes
- Uses `html-to-image` (toPng) for high-res PNG generation
- QR codes use `qrcode.react` (QRCodeSVG) with error correction level H
- Follows #ÉLUTA design system: Oswald font, yellow (#FFD100) accents, dark bg (#0B0B0E)

## 8 Requirements Checklist
✅ QR format correct (/r/:code with UTMs)
✅ A4 format (2480×3508px @ 300 DPI)
✅ Sticker format (1063×1063px @ 300 DPI)  
✅ Download functionality
✅ Tracking via template_print_download event
✅ No PII in tracking (only format + cidade)
✅ Save to attachments_by_variant
✅ Mobile-responsive modal preview
