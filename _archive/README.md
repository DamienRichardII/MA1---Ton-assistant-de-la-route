# _archive/ — Fichiers archivés (NON servis)

Ce dossier est **hors du dossier `/public/`** : son contenu n'est donc PAS servi statiquement par Next.js / Vercel. Il sert d'archive de référence pour les fichiers retirés du produit public lors d'un sprint de consolidation.

## Contenu

| Fichier | Date d'archivage | Sprint | Raison | Remplacé par |
|---|---|---|---|---|
| `landingpage.html` | 2026-05-20 | Sprint 0 | Doublon de landing — voir `AUDIT_MA1_v9.md` §3 et §5 | `app/landing/page.tsx` (canonique) |

## Règles

- Ne PAS remettre dans `/public/` sans validation.
- Garder pour référence visuelle / design.
- Redirection 301 active dans `next.config.js` : `/landingpage.html` → `/landing`.

— DamCompany
