-- MA1 Migration 018 — Fermeture de l'accès public (clé anon) aux données.
-- Constat d'audit : les policies "Users read own" (users) et "Profiles read own" (profiles) ont
-- USING (true) pour le rôle public, et la vue admin_users_view est SECURITY DEFINER avec SELECT pour anon.
-- => quiconque possède la clé anon (publique par conception) peut lire emails, password_hash, birth_date.
-- Le backend utilise la clé service_role (bypass RLS) : aucun impact fonctionnel attendu.

BEGIN;

DROP POLICY IF EXISTS "Users read own" ON public.users;
DROP POLICY IF EXISTS "Profiles read own" ON public.profiles;
DROP POLICY IF EXISTS "Users read own xp" ON public.xp_events;

-- La vue s'exécute avec les droits de l'appelant (RLS respectée).
ALTER VIEW public.admin_users_view SET (security_invoker = true);

-- Aucun accès direct des rôles API aux tables et à la vue.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

COMMIT;
