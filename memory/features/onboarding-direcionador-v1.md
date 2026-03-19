# Memory: features/onboarding-direcionador-v1
Updated: now

Onboarding Direcionador v1: Personalized path recommendation based on volunteer preferences stored in `profiles.onboarding_prefs` (JSONB).

## Preferences Structure
```json
{
  "interesses": ["conversar", "rua", "conteudo", "formacao", "organizacao"],
  "habilidades": ["design", "video", "texto", "dev", "articulacao", "logistica"],
  "tempo": "10" | "20" | "40",
  "conforto": "baixo" | "medio" | "alto" (optional)
}
```

## Recommendation Engine (Client-side)
`getRecommendedPath(prefs)` returns:
- `primary_action`: { kind, tempo, label, description }
- `secondary_actions`: [{ kind, label, route }]

Priority logic:
1. "conversar" interest → Missão de Conversa
2. "rua" interest + conforto != baixo → Missão de Rua  
3. Content skills (design/video/texto) → Fábrica de Base
4. "formacao" interest → Formação (link only, no changes to Formação)

## UI Components
- `OnboardingPrefsForm`: 3-4 step form (interesses → habilidades → tempo → conforto)
- `RecommendedPathCard`: Compact/full display with "Fazer agora" CTA
- `SeuCaminhoScreen`: Final onboarding screen after prefs saved

## Integration Points
- `/voluntario/primeiros-passos`: Block "Meu Caminho" in AccessibilityPreferencesCard area
- `/voluntario/hoje`: Compact RecommendedPathCard if prefs exist
- Final onboarding: SeuCaminhoScreen after prefs collection

## Tracking Events
- `onboarding_prefs_saved`: meta { interesses_count, habilidades_count, tempo, has_conforto }
- `recommended_path_started`: meta { kind, tempo }

## RLS
Uses existing profile RLS (user updates own profile). No new policies needed.

## Certificate Gap
Certificate display/share UI is not implemented. Backend (`certificates`, `share_links` tables) exists but frontend CTA for "Ver certificado" / "Compartilhar" is missing. Documented for future sprint.
