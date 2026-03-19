# Memory: features/radio-mode-v0
Updated: now

Radio Mode v0: A TTS-based queue system for continuous narration of app content. Uses the existing Web Speech API (useTTS) with auto-advance between items. Features include:
- `useRadioQueue` hook managing queue state, playback controls (play/pause/next/prev/stop), and localStorage persistence
- Helper functions: `buildQueueFromSemana` (weekly plan + metas + activities + tasks + mission), `buildQueueFromTop` (Top of Week items), `buildQueueFromHoje` (3 daily items max)
- `RadioPlayer` component with full and compact variants, progress indicator, and "Abrir item" navigation
- `RadioMiniCard` for a small call-to-action card (~X min estimate)
- Integrated into `/voluntario/semana` ("Ouvir a Semana"), `/voluntario/top` ("Ouvir o Top"), and `/voluntario/hoje` (Rádio do Dia card)
- Auto-stop on component unmount to prevent navigation conflicts
