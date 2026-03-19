# Memory: features/contrato-ssot-v1
Updated: 2026-02-04

## Sistema de Contrato SSOT (Single Source of Truth)

### O que foi criado

1. **Contrato Principal**: `memory/LOVABLE_CONTRATO.md`
   - Fonte única de verdade para desenvolvimento
   - 7 regras congeladas (A-G) sobre rotas, convites, onboarding, RLS, etc.
   - Glossário mínimo (cidade, célula, território, coordenação, coorte, PII)
   - Checklist pré-implementação
   - Gargalos documentados (CellOps, bypass RLS, rotas legadas)

2. **Diagnóstico no Admin**: `/admin/diagnostico` → "Contrato do App"
   - Importa conteúdo do contrato como raw string
   - Checklist automático de validação:
     - Contrato carregado (não vazio)
     - 7 regras congeladas presentes no texto
     - Rotas canônicas mínimas existem no manifest
     - Redirects legados críticos configurados
     - Sem rotas proibidas com hífen como rota real
   - Expandir/colapsar para ver conteúdo do contrato

### Como Verificar

1. Acesse `/admin/diagnostico`
2. Clique em "Rodar DIAG" para gerar o manifest
3. Verifique a seção "Contrato do App":
   - Badge "Conforme" (verde) = todos os checks passaram
   - Badge "X pendência(s)" (amarelo) = algum check falhou
4. Clique em "Ver contrato" para expandir o markdown completo

### Checks Automáticos

| Check | Descrição | Ação se falhar |
|-------|-----------|----------------|
| Contrato carregou | Arquivo não vazio | Verificar importação |
| Regras congeladas presentes | 7 títulos de regra no texto | Restaurar regra faltante |
| Rotas canônicas mínimas | /auth, /aceitar-convite, /voluntario, /voluntario/primeiros-passos | Adicionar rota no manifest |
| Redirects legados críticos | voluntario-hoje, admin-diagnostico, coordenador-hoje | Adicionar em LEGACY_ROUTE_MAP |
| Sem rotas proibidas | Nenhuma rota /voluntario-, /admin-, etc. | Renomear para formato canônico |

### Arquivos Relacionados

- `memory/LOVABLE_CONTRATO.md` — Contrato principal
- `src/pages/AdminDiagnostico.tsx` — Página de diagnóstico
- `src/lib/routeManifest.ts` — Manifest de rotas
- `src/components/routing/LegacyRouteRedirects.tsx` — Redirects legados

### Regras de Manutenção

1. **Contrato é CONGELADO**: Alterações requerem revisão explícita
2. **Sempre atualizar ambos**: Contrato e diagnóstico devem estar sincronizados
3. **Rodar diagnóstico após mudanças**: Validar que nada quebrou
