# Intégration Sanity — Site CHR / Contrôle Hydrant Réunion

Date : 2026-06-10
Projet Sanity : `dhe4ywjr` (« incendieoi.fr »), dataset `production` (accès **public**)
Site : dépôt `controlehydrantreunion/chr-conformite-reunion` (statique, déployé Vercel)

## Objectif

Permettre au client d'éditer **ses coordonnées de contact** et **les textes de la
page d'accueil** depuis une interface Sanity (Studio hébergé), sans toucher au
code. Le site reste 100 % statique.

## Périmètre (volontairement restreint — YAGNI)

Géré par Sanity :
- **Contact** : phone, phoneRaw, email, address, whatsapp, hours
- **Page d'accueil** : title_line1, title_line2, title_highlight, hero description,
  titre + intro de la section profil (« je_suis »)

**Hors périmètre** (restent dans `data/content.json` / le HTML) : menu, services,
FAQ, blog, cartes profil, estimator.

## Architecture

```
Sanity Studio (hébergé .sanity.studio)  --écrit-->  Sanity dataset "production"
                                                         |
                                          API CDN publique (lecture, SANS token)
                                                         v
                                    Site statique : js/cms-loader.js
```

- Le **site** lit Sanity via `https://dhe4ywjr.apicdn.sanity.io` (GROQ), sans token,
  car le dataset est public. **Aucun secret dans le repo** (qui est public).
- Le **Studio** est une app séparée déployée sur `*.sanity.studio`. Le client s'y
  connecte avec son propre login Sanity (invité par email).
- Le **token éditeur** (`.env` local, non commité) sert UNIQUEMENT à : déployer le
  Studio et pousser le contenu initial. Il n'apparaît jamais dans le site livré.

## Composants

### 1. Studio Sanity (nouveau dossier `studio/`)
- Config `sanity.config.ts` : projectId `dhe4ywjr`, dataset `production`.
- 2 schémas singleton :
  - `contact` : 6 champs texte.
  - `accueil` : title_line1, title_line2, title_highlight, hero_description (text),
    profil_title, profil_intro (text).
- Déployé via `sanity deploy` → URL `*.sanity.studio`.
- Le dossier `studio/` est ignoré du déploiement Vercel (ne fait pas partie du site).

### 2. `js/cms-loader.js` (modifié)
- `loadContent()` :
  1. requête GROQ à Sanity pour `contact` + `accueil` ;
  2. si OK, fusionne ces valeurs dans l'objet chargé depuis `data/content.json` ;
  3. **si Sanity échoue (réseau / vide), on garde `content.json` tel quel.**
- `applyContent()` **inchangé** : il consomme la même structure qu'aujourd'hui.

## Filet de sécurité (non négociable)

Le site ne doit JAMAIS casser si Sanity est indisponible. `content.json` reste la
source de secours et la valeur par défaut. C'est un enrichissement, pas un
remplacement dur.

## Données initiales

Le contenu actuel de `data/content.json` (contact + hero + je_suis) est poussé dans
Sanity une fois, pour que le Studio ne soit pas vide à la livraison.

## Étapes de livraison

1. Créer `studio/` + schémas.
2. `sanity deploy` → obtenir l'URL Studio.
3. Pousser le contenu initial (script using token).
4. Modifier `js/cms-loader.js` (lecture Sanity + fallback).
5. Tester en local (site lit bien Sanity, et fallback si coupé).
6. Commit + push sur `main` (sous Tom-Soa, sans co-signature).
7. Inviter le client sur le Studio.

## Hors scope / à ne pas faire

- Pas de build Next.js, pas de SSR.
- Pas de token dans le code du site.
- Pas de migration des services/FAQ/blog (phase ultérieure si demandé).
