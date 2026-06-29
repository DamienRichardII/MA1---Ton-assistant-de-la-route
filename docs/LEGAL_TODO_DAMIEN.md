# LEGAL TODO — Damien

> Checklist des éléments **juridiques, administratifs et opérationnels** que SEUL Damien (ou son conseil juridique) peut fournir.
> Bloquant pour l'ouverture de la bêta payante MA1 (cf `AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md` §10).
> Dernière mise à jour : 2026-05-20

---

## 1. Identification de l'entité éditrice

> À écrire en clair dans `public/legal/mentions-legales.html` (placeholders actuels).

- [ ] **Raison sociale** : nom complet de l'entité (DamCompany ? raison sociale différente ?)
- [ ] **Forme juridique** : SAS / SARL / EURL / Auto-entrepreneur / autre
- [ ] **Capital social** (si applicable) : montant en €
- [ ] **SIREN** : 9 chiffres
- [ ] **SIRET du siège** : 14 chiffres
- [ ] **RCS** : ville + numéro
- [ ] **Numéro TVA intracommunautaire** (si applicable) : FR + 11 caractères
- [ ] **APE / NAF** : code activité
- [ ] **Adresse du siège social** : rue, code postal, ville, pays
- [ ] **Nom du directeur de la publication** (responsable éditorial)
- [ ] **Email contact entreprise** : `contact@…` (à harmoniser avec le domaine retenu)
- [ ] **Téléphone** (recommandé pour B2B auto-école)

## 2. Informations DPO et RGPD

> À écrire dans `public/legal/confidentialite.html` §1.

- [ ] **Nom du DPO** (interne ou externe)
- [ ] **Email du DPO** (recommandé : `dpo@<domaine final>`)
- [ ] **Adresse postale RGPD** (peut être identique au siège)
- [ ] **Délégué CNIL déclaré** ? (optionnel mais recommandé)
- [ ] Représentant RGPD si entité hors UE (n/a si DamCompany est française)

## 3. Tribunaux et médiation consommation

> À écrire dans `public/legal/cgu.html` §10 et `public/legal/cgv.html` §9.

- [ ] **Tribunal compétent en cas de litige** : ville (typiquement celle du siège pour B2B, ville du consommateur pour B2C — préciser règles applicables)
- [ ] **Médiateur de la consommation agréé** (obligatoire pour vente à distance B2C en France, cf Code conso L612-1) :
  - Nom de l'organisme (CNPM, ANM, CMAP, etc.)
  - Email contact
  - Site web
  - Adresse postale
  - À renseigner *avant* d'accepter le premier paiement particulier.

## 4. Domaine et marques

- [ ] Domaine final retenu : `ma1.com` (priorité 1) / `ma1.fr` (priorité 2) / autre ?
- [ ] Dépôt INPI de la marque "MA1" (recommandé avant ouverture bêta publique) — classe Nice 9 (logiciels) et/ou 41 (formation)
- [ ] Recherche d'antériorité (autre marque "MA1" dans le secteur éducation / auto-école ?)
- [ ] Logo : preuves de propriété (auteur / cession / utilisation)

## 5. Paiements SumUp

- [ ] Compte SumUp vérifié (déclaré OK par Damien) — vérifier dans dashboard SumUp
- [ ] Catégorie business SumUp = "éducation" ou "service en ligne" (pas de blocage)
- [ ] Adresse de facturation SumUp à jour (cohérence avec siège déclaré)
- [ ] Choix : Payment Links statiques OU API SumUp (V2)
- [ ] Si API : créer un projet OAuth dans dashboard SumUp + récupérer `client_id`, `client_secret`, `merchant_code`
- [ ] Si webhook V2 : URL `https://api.<domaine>/payment/webhook/sumup` + `webhook_secret`
- [ ] Récupérer les 2 liens Payment Links (Particulier 9 € + Auto-école 200 €) après création
- [ ] Vérifier frais SumUp pour le modèle de paiement choisi (≈ 1,95 % en France selon volume — confirmer auprès de SumUp)
- [ ] Vérifier modalités factures :
  - [ ] SumUp génère automatiquement une facture pour l'acheteur ?
  - [ ] Si non, prévoir génération côté MA1 (PDF généré par backend après activation)

## 6. CGV — Nouvelle clause Bêta paiement unique 30 jours

> Rédaction proposée dans `AUDIT_BETA_OUVERTE_MA1.md` §7.3. À faire relire par un juriste avant publication.

- [ ] Validation rédaction proposée (ou amendement)
- [ ] Mention prestataire de paiement : "SumUp" (sous-traitant à lister en politique de confidentialité §4)
- [ ] Mention sous-traitants à ajouter à `public/legal/confidentialite.html §4` :
  - SumUp (paiement) — Royaume-Uni / UE selon entités
  - Resend (emails transactionnels) — États-Unis (DPF UE-US)
  - Railway (hébergement backend) — États-Unis (SCC à signer)
  - Anthropic (IA Claude) — États-Unis (déjà mentionné, OK)
  - Supabase (base de données) — région à confirmer (eu-west recommandé)
  - Vercel (hébergement frontend) — déjà mentionné
  - OVH (registrar + DNS) — France (faible criticité, optionnel à mentionner)

## 7. Mineurs

- [ ] Décision : ouvrir la bêta aux mineurs 15-17 ans avec consentement parental ?
- [ ] Si oui, procédure technique : email tuteur + lien de validation ? Upload pièce ?
- [ ] Si non, exclure < 18 ans pendant la bêta (modifier CGU §4 + formulaire inscription)
- [ ] Position CNIL : âge minimum effectif décidé = ?
- [ ] Communication parents / élèves sur l'usage IA (transparence)

## 8. Auto-écoles (B2B)

- [ ] Contrat-type B2B 1-2 pages pour les auto-écoles (cadre 30 jours)
- [ ] Décision DPA (Data Processing Agreement) : MA1 = sous-traitant des élèves de l'auto-école ?
- [ ] Conditions de revente / co-branding (white-label) — clauses propriété intellectuelle
- [ ] Facturation B2B (TVA, mention "auto-liquidation" éventuelle, modalités)
- [ ] Politique : autorisation explicite de l'auto-école avant inscription d'un élève ?

## 9. Premier paiement reçu

> À la réception du 1er paiement, vérifier que :

- [ ] L'utilisateur a bien vu et accepté les CGV (case à cocher obligatoire) — UI à prévoir Sprint A
- [ ] Il a confirmé renoncer expressément à son droit de rétractation si utilisation immédiate (case à cocher distincte — cf L221-28)
- [ ] Une facture lui a été envoyée (par SumUp et/ou par MA1)
- [ ] Le paiement a été tracé dans la comptabilité (compte bancaire MA1 / DamCompany)
- [ ] Le délai d'activation (24 h ouvrables) est respecté

## 10. Hébergement Supabase et hébergement Railway

- [ ] **Région Supabase choisie** : recommandé `eu-west-3` (Paris) ou `eu-central-1` (Francfort) pour RGPD
- [ ] **Région Railway** : actuellement défaut US ? À vérifier
- [ ] **SCCs (Standard Contractual Clauses)** signées avec :
  - [ ] Railway (US-based)
  - [ ] Resend (US-based)
  - [ ] Anthropic (US-based)
- [ ] Vérifier les Data Processing Agreements (DPAs) des providers

## 11. Données bancaires / facturation MA1

- [ ] Compte bancaire pro MA1 / DamCompany ouvert
- [ ] Numéro de compte (IBAN) pour rapprochement comptable des paiements SumUp
- [ ] Logiciel de comptabilité ou comptable externe identifié (Pennylane / Tiime / Indy / autre)
- [ ] Plan comptable adapté (compte 706 prestations, compte 411 clients, etc.)
- [ ] TVA : régime applicable (franchise en base si CA < 36 800 € — au-delà : régime réel)

## 12. Assurance et responsabilité

- [ ] Assurance RC Pro souscrite ? (recommandée pour service B2B auto-école)
- [ ] Limite contractuelle de responsabilité explicitement écrite dans CGV (cap = 12 mois de revenus, déjà présent CGV §8 ✅)
- [ ] Mention claire dans CGU §3 : MA1 n'est PAS un service de conseil juridique ni un remplaçant d'auto-école (déjà présent ✅)

---

## Checklist export rapide pour Damien

> À faire dans l'ordre, blocant pour ouverture bêta payante.

- [ ] **§1** Identité entité (10 champs) → à compléter `mentions-legales.html`
- [ ] **§2** DPO + email + adresse RGPD → `confidentialite.html`
- [ ] **§3** Tribunal + médiateur consommation agréé → `cgu.html` + `cgv.html`
- [ ] **§4** Domaine retenu (`ma1.com` ?) — décision binaire
- [ ] **§5** Liens SumUp générés (×2) + variables `.env`
- [ ] **§6** CGV §11 relue juridiquement + sous-traitants listés
- [ ] **§7** Politique mineurs décidée
- [ ] **§8** Contrat-type B2B + DPA auto-école (si AE 200 € ouvert)
- [ ] **§9** UI obligatoire : checkbox CGV + checkbox renonciation rétractation
- [ ] **§10** Régions Supabase / Railway + SCCs sous-traitants
- [ ] **§11** Compte bancaire + comptabilité + régime TVA
- [ ] **§12** Assurance RC Pro (recommandé)

---

*Ce document doit être tenu à jour par Damien. À chaque case cochée, ajouter date + initiales.*
