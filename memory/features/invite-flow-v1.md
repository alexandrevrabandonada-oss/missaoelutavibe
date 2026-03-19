# Invite Flow v1 — Auth → Hub

## Objetivo
Trilho oficial para convites de cadastro: link público → validação → auth → hub.

## Rotas Envolvidas
- `/aceitar-convite?ref=XXXX` — Página de validação de convite
- `/auth?ref=XXXX&next=/voluntario` — Auth com contexto de convite
- `/convite-mini` — Fallback para pedir novo convite
- `/voluntario` — Hub padrão pós-login

## Fluxo Principal

### 1. Link Público
Todos os links de convite apontam para:
```
/aceitar-convite?ref=XXXX
```

### 2. Validação em `/aceitar-convite`
A página valida o código e roteia:

| Estado | Usuário | Ação |
|--------|---------|------|
| Ref válido | Não logado | Redirect → `/auth?ref=XXXX&next=/voluntario` |
| Ref válido | Logado | Aplica convite → `/voluntario` (ou `/onboarding` se perfil incompleto) |
| Ref inválido | Qualquer | UI amigável com CTAs: "Pedir novo" → `/convite-mini`, "Entrar mesmo assim" → `/auth` |
| Sem ref | Qualquer | UI explicativa com mesmos CTAs |

### 3. Auth com Contexto
`/auth` agora:
- Busca ref de URL ou localStorage (30min expiry)
- Mostra estado "Verificando convite..." durante validação
- Só mostra aviso soft ("Convite não encontrado") após confirmar inválido
- Após login/cadastro: registra uso do convite e redireciona

### 4. Persistência
- `localStorage.invite_ref` + `invite_ref_ts` + `invite_next`
- Expira após 30 minutos
- Limpo após finalizar fluxo

## Componentes

### `AceitarConviteRef.tsx`
Página de validação de convite de cadastro (ref=XXXX).

### `AceitarConvite.tsx`
Página de aceite de convite de papel/role (token no path: `/aceitar/:token`).

### Helpers
```typescript
// Em AceitarConviteRef.tsx
export function getStoredInvite(): { ref: string; next: string } | null;
export function clearStoredInvite(): void;
```

## UX de Erro
- **Nunca** mostrar "inválido" antes de confirmar com backend
- Usar tom amigável: "Convite não encontrado" em vez de "ERRO!"
- Sempre oferecer alternativas claras

## Geração de Links
Onde gerar links de convite (VoluntarioConvite, admin, etc.):
```typescript
const link = `${window.location.origin}/aceitar-convite?ref=${code}`;
```

## Tracking
- `invite_form_open`: Abriu auth com ou sem ref
- `signup`: Cadastro com código de convite
- `invite_submit_mini`: Preencheu formulário mini

## Segurança
- Códigos de convite validados no backend via RPC `is_invite_valid`
- Uso registrado via RPC `register_invite_usage`
- Sem PII em logs (apenas código e meta)
