# Memory: features/esteira-do-dia-v0
Updated: now

## Overview
"Esteira do Dia" (Daily Conveyor Belt) is a focused execution flow for `/voluntario/hoje` that transforms the check-in into immediate action.

## Core Components

### 1. DailyActionCTA (`src/components/actions/DailyActionCTA.tsx`)
- Primary CTA: "COMEÇAR AGORA" - picks 1 action based on availability + focus
- Secondary CTA: "ESCOLHER AÇÃO" - goes to `/voluntario/agir`
- If no actions: offers to generate Street or Conversation missions

### 2. ExecutionMode (`src/components/actions/ExecutionMode.tsx`)
- Full-screen focused execution interface
- Features:
  - Timer (pausable)
  - Checklist based on action kind
  - "CONCLUIR" (light done with optional note)
  - "COM EVIDÊNCIA" (for missions with proof)
- Progress bar for checklist completion

### 3. PostCompletionCTAs (`src/components/actions/PostCompletionCTAs.tsx`)
- Shown after action completion
- Two fixed CTAs:
  - "CONVIDAR +1" - copy text or share via WhatsApp
  - "SALVAR 1 CONTATO" - quick CRM capture modal
- "Fazer outra ação" to reset flow

### 4. LocalSuggestions (`src/components/actions/LocalSuggestions.tsx`)
- Always shows 3 suggestions with silent fallback
- Never shows error alerts (removes visible error state)
- Uses API suggestions when available, local defaults otherwise

## Hook: useDailyAction (`src/hooks/useDailyAction.tsx`)
Manages the execution flow state:
- `suggestedAction` - picks best action based on check-in (availability + focus)
- `executionStatus` - "idle" | "in_progress" | "completed"
- `startExecution()` - enters execution mode
- `completeAction({ note?, withEvidence? })` - finishes action
- `resetExecution()` - returns to idle

## Action Selection Logic
1. If user has specific focus (task/mission/crm/agenda), prioritize matching action
2. If short time (≤15min): prefer quick actions (followup, roteiro)
3. If long time (≥60min): prefer missions
4. Default: return next action by priority

## Tracking Events
- `next_action_started` - when execution begins (kind, priority)
- `next_action_completed` - when finished (kind, duration_seconds, has_evidence, has_note)
- `invite_clicked` - invite copy button pressed
- `invite_shared` - invite sent via WhatsApp
- `contact_added` - quick CRM modal opened

All events logged via `log_growth_event` RPC (no PII).

## Files
- `src/hooks/useDailyAction.tsx` (new)
- `src/components/actions/DailyActionCTA.tsx` (new)
- `src/components/actions/ExecutionMode.tsx` (new)
- `src/components/actions/PostCompletionCTAs.tsx` (new)
- `src/components/actions/LocalSuggestions.tsx` (new)
- `src/pages/VoluntarioHoje.tsx` (refactored)

## Flow
```
Check-in Done → DailyActionCTA ("COMEÇAR AGORA")
                     ↓
              ExecutionMode (timer + checklist)
                     ↓
              PostCompletionCTAs ("CONVIDAR +1" / "SALVAR 1 CONTATO")
                     ↓
              Reset → back to DailyActionCTA
```
