
-- F1.1 Part 2: Backfill evidence data (after trigger fixes)
UPDATE public.evidences SET status = 'enviado' WHERE status = 'pendente';
UPDATE public.evidences SET status = 'validado' WHERE status = 'aprovada';
UPDATE public.evidences SET status = 'rejeitado' WHERE status = 'reprovada';

UPDATE public.evidences
SET media_urls = ARRAY[content_url]
WHERE content_url IS NOT NULL AND media_urls IS NULL;

UPDATE public.evidences
SET visibilidade = 'privada'
WHERE visibilidade IS NULL;
