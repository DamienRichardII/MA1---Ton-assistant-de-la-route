# FIX ADMIN REALTIME — Centre de contrôle utilisateurs MA1

> Sprint ciblé — correction du dashboard admin pour afficher en temps réel
> les comptes créés, les utilisateurs actifs et leur activité réelle.
> Pas d'audit global, pas de refactor, pas de redesign.
>
> Date : 2026-10-11
> Marqueur anti-troncature : `[FIX_ADMIN_REALTIME_CTRL_MA1_OK]`

---

## 1. Cause du problème

La page admin existait mais :

- n'exposait pas un vrai listing des comptes créés dans Supabase ;
- ne distinguait pas les comptes actifs des inactifs ;
- n'avait pas de système de présence côté frontend (aucun heartbeat) ;
- les KPIs étaient réduits (pas de `new_today`, `new_week`, `best_xp`,
  `avg_success_rate`) ;
- aucun filtre/recherche/tri côté UI, donc impossible de piloter les
  utilisateurs en live.

Conséquence : impossible de valider en direct qu'un compte test créé
depuis la landing arrivait bien dans la base, se connectait, utilisait
le QCM ou le chat IA.

---

## 2. Fichiers modifiés

### Backend

- `apps/backend/src/reporting_service.py`
  - ajout `_user_lookup()` (lecture d'un user depuis `users` ou `profiles`) ;
  - ajout `list_users(search, filter_kind, sort, limit)` ;
  - ajout `recent_signups(limit)` ;
  - ajout `recent_activity(limit)` ;
  - ajout `recent_qcm_errors(limit)` ;
  - ajout `compute_kpis_extended()` qui étend `compute_kpis()`
    avec `new_today`, `new_week`, `best_xp`, `avg_success_rate`.

- `apps/backend/src/api.py`
  - endpoint `GET /admin/users` (search / filter / sort / limit) ;
  - endpoint `GET /admin/activity` ;
  - endpoint `GET /admin/recent-signups` ;
  - endpoint `GET /admin/recent-errors` ;
  - `GET /admin/kpis` → bascule sur `compute_kpis_extended()` ;
  - logs ajoutés :
    `[ADMIN] kpis loaded ...`,
    `[ADMIN] users count=... active=... filter=... sort=...`,
    `[PRESENCE] heartbeat user_id=... session=... ok=...`.
  - tous les endpoints admin passent par `Depends(require_admin)`.

- `apps/backend/src/presence_service.py` (inchangé — déjà en place)
  - `record_heartbeat()`, `count_online_now()`, `list_recent_active()`,
    `list_online_now()` basés sur la table `user_sessions`.

### Frontend

- `apps/frontend/components/presence/HeartbeatPing.tsx` (nouveau)
  - composant invisible (`return null`) ;
  - ping `POST /presence/heartbeat` toutes les **45 secondes** ;
  - uniquement si `isLoggedIn && userId` ;
  - envoie `{ user_id, session_id }` + Bearer token ;
  - `keepalive: true` sur le fetch, fail silencieux ;
  - `session_id` persistant en `sessionStorage` (clé `ma1_session_id`).

- `apps/frontend/app/layout.tsx`
  - import + mount `<HeartbeatPing />` dans le body global.

- `apps/frontend/app/admin/dashboard/page.tsx`
  - interface `UserRow` + extension `Kpis`
    (`new_today`, `new_week`, `best_xp`, `avg_success_rate`) ;
  - états `users`, `usersTotal`, `userSearch`, `userFilter`, `userSort` ;
  - fonction `loadUsers()` → `GET /admin/users?search=&filter=&sort=&limit=` ;
  - `useEffect` avec **debounce 350 ms** sur search/filter/sort ;
  - section **👥 Utilisateurs** interactive :
    recherche libre + 2 selects (filtre `all/active/inactive/new`,
    tri `recent/xp/last_seen`) + bouton 🔄 Rafraîchir ;
  - tableau interactif : indicateur 🟢 actif, badge `NEW`, pseudo,
    email tronqué, date d'inscription, `last_seen`, XP, nb QCM,
    taux de réussite coloré par seuil ;
  - grille KPI étendue (12 cards) ;
  - **auto-refresh toutes les 30 s** : appelle `load()` + `loadUsers()`.

---

## 3. Tables Supabase utilisées

| Table | Rôle |
|---|---|
| `users` / `profiles` | Comptes créés (id, email, pseudo, created_at, xp, …) |
| `user_sessions` | Présence (user_id, session_id, last_seen_at, user_agent, current_module, ip_hash) |
| `qcm_attempts` | Statistiques QCM (success_rate, count par user) |
| `exam_attempts` | Examens blancs réalisés |
| `admin_users` | Authentification admin (hash bcrypt côté backend) |
| `login_events` | Historique de connexions |
| `email_logs` | Logs des mails envoyés |

Fenêtre "actif maintenant" : `last_seen_at > now() - interval '5 minutes'`
(constante `PRESENCE_WINDOW_MINUTES = 5` dans `presence_service.py`).

---

## 4. Endpoints corrigés / ajoutés

Tous protégés par `Depends(require_admin)` sauf le heartbeat
(protégé par `Depends(require_auth)`).

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/admin/kpis` | KPIs étendus (12 valeurs) |
| GET | `/admin/users` | Listing filtrable/triable/paginé |
| GET | `/admin/activity` | Activité récente agrégée |
| GET | `/admin/realtime` | Comptage temps réel + utilisateurs online |
| GET | `/admin/recent-signups` | Derniers comptes créés |
| GET | `/admin/recent-errors` | Dernières erreurs QCM |
| POST | `/presence/heartbeat` | Ping client (user_id, session_id, current_module) |

---

## 5. Test à effectuer (recette)

1. Créer un nouveau compte test depuis la landing.
2. Ouvrir `/admin/dashboard`.
3. Vérifier que le compte apparaît dans **👥 Utilisateurs** avec
   badge `NEW` et date d'inscription du jour.
4. Vérifier que `nouveaux_aujourdhui` et `nouveaux_semaine` sont ≥ 1.
5. Se connecter avec ce compte sur MA1, naviguer sur `/qcm` ou `/chat`.
6. Attendre ~45 s (premier heartbeat).
7. Côté admin, cliquer 🔄 Rafraîchir : l'utilisateur passe 🟢 actif,
   `utilisateurs actifs` ≥ 1.
8. Tester la recherche (email partiel), le filtre `active`, le tri
   `xp` et `last_seen`.
9. Laisser l'utilisateur inactif 5 min (ou fermer l'onglet) :
   il repasse inactif au prochain refresh.
10. Vérifier les logs Railway : présence de
    `[PRESENCE] heartbeat user_id=…`,
    `[ADMIN] users count=…`,
    `[ADMIN] kpis loaded …`.

---

## 6. Résultat attendu

- Le dashboard admin devient un vrai centre de contrôle temps réel.
- Aucune donnée fictive, aucun placeholder.
- États vides explicites :
  "Aucun utilisateur pour le moment",
  "Aucun utilisateur actif actuellement".
- Auto-refresh 30 s côté admin + heartbeat 45 s côté client :
  latence maximale perçue ≈ 1 min.
- Aucun impact sur :
  les templates email, le jeu concours
  (29 juin → 17 juillet 2026), l'auth admin bcrypt existante,
  la landing, le design global.

---

*Marqueur anti-troncature : `[FIX_ADMIN_REALTIME_CTRL_MA1_OK]`*
