# Memory: features/app-mode-v0
Updated: now

## Modo Operação/Compliance v0

Sistema de configuração de modo do app (pré-campanha/campanha/pós-eleição) com brand pack.

### Banco de Dados

**app_config** (single-row pattern):
- id: TEXT PRIMARY KEY ('singleton')
- mode: TEXT ('pre'|'campanha'|'pos')
- brand_pack: TEXT ('eluta'|'neutro')
- updated_at, updated_by

**RLS**:
- SELECT: público (todos podem ler)
- UPDATE: somente admins

**RPCs**:
- `get_app_config()` - retorna config atual
- `set_app_config(p_mode, p_brand_pack)` - admin only, com audit log

**Audit**: Mudanças são logadas em `governance_audit_log` com entity_type='app_config'

### Frontend

**Hook useAppMode()**:
- mode, brandPack, updatedAt
- brandStrings: appName, slogan, signature, onboarding texts
- themeTokens: primary, accent colors
- flags: invitesEnabled, printKitEnabled, fabricaShareEnabled, publicCertificatesEnabled, templatesEnabled, showPreCampaignBadge

**useSetAppMode()**: Mutação para alterar config (admin only)

**Brand Utilities** (src/lib/brand.ts):
- `getBrandStrings(mode)` - textos por fase
- `getBrandThemeTokens(brandPack)` - cores por pacote
- `getModeFlags(mode)` - flags de features por fase

### Feature Flags por Modo

| Recurso | pre | campanha | pos |
|---------|-----|----------|-----|
| invitesEnabled | ✓ | ✓ | ✗ |
| printKitEnabled | ✗ | ✓ | ✗ |
| fabricaShareEnabled | ✓ | ✓ | ✗ |
| publicCertificatesEnabled | ✗ | ✓ | ✓ |
| templatesEnabled | ✓ | ✓ | ✗ |
| showPreCampaignBadge | ✓ | ✗ | ✗ |

### UI Admin

- AppModePanel em /admin/ops (somente admins)
- Seletor de fase com radio buttons
- Seletor de brand pack
- Preview de flags antes de aplicar
- Botão Histórico → GovernanceHistorySheet

### Integração

- AppShell: assinatura dinâmica via brandStrings.signature
- /admin/ops: assinatura dinâmica
- Componentes sensíveis devem usar useAppMode().flags

### A11y

- focusRing em todos botões/labels
- aria-label em radio groups
- Histórico acessível via sheet

### Checks

1. ✅ RPC get_app_config pública
2. ✅ RPC set_app_config admin-only com audit
3. ✅ Hook com cache 5min
4. ✅ AppModePanel com preview de flags
5. ✅ AppShell dinâmico
6. ✅ GovernanceEntityType inclui 'app_config'
7. ✅ Build OK
