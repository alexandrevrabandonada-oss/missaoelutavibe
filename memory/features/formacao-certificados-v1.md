# Memory: features/formacao-certificados-v1
Updated: now

## Certificados e Pós-Formação (Tijolo 4 + 5)

### Tijolo 4 (Certificado Básico)
Ao concluir 100% de um curso, o sistema emite automaticamente um certificado registrado na tabela `formacao_certificates` (com código de verificação único). O voluntário acessa o `CourseCompletionModal` com opções de visualizar (formatos 1:1 e 4:5), baixar, compartilhar (WhatsApp/Nativo) e "Aplicar na Prática". Esta última sugere missões de Rua ou Conversa baseadas no tema do curso para converter teoria em ação imediata.

### Tijolo 5 (Certificado Público Verificável)
**Nova rota pública**: `/s/cert/:code` - página de verificação sem autenticação

**Campos adicionados à tabela**:
- `public_enabled` (boolean, default true) - se link público está ativo
- `public_visibility` ('full'|'initials'|'anon') - controle de privacidade do nome
- `revoked_at`, `revoked_reason` - para invalidação futura
- `name_snapshot`, `course_title_snapshot` - snapshot no momento da emissão
- `og_image_url` - URL da imagem para previews OG

**RPCs**:
- `get_certificate_public(_code)` - verificação pública (anon-safe, sem PII)
- `set_certificate_privacy(_certificate_id, _public_enabled, _visibility)` - owner-only

**Estados da página pública**:
- `valid` - certificado verificado com selo verde
- `private` - voluntário optou por manter privado
- `revoked` - certificado invalidado
- `not_found` - código não existe

**Privacidade (no CourseCompletionModal aba Compartilhar)**:
- Toggle "Link público ativo"
- Select "Nome no certificado público": Nome completo / Iniciais / Anônimo
- Preview do link público

**OG Tags**: Helmet com title/description/image dinâmicos. Fallback para `/og-default.png`.

**Tracking** (reutilizando event types existentes com meta.stage):
- `certificate_viewed` + `meta:{stage:'public', status}`
- `certificate_shared` + `meta:{stage:'public_link'}` ou `{stage:'public_whatsapp'}`

**Componentes**:
- `src/pages/PublicCertificate.tsx` - página pública
- `src/components/formacao/CertificatePrivacySettings.tsx` - configurações de privacidade
- Hook `usePublicCertificate(code)` - chamada RPC anon
- Hook method `setPrivacy()` - atualiza privacidade
