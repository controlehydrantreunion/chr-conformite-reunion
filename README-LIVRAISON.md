# CHR — Notice de livraison

Site CHR — Contrôle Hydrant Réunion. Statique HTML/CSS/JS, hébergé sur Vercel.

URL prod : https://chr-conformite-reunion.vercel.app

---

## 1. À FAIRE AVANT MISE EN PRODUCTION FINALE

### 1.1 Compléter les mentions légales (OBLIGATOIRE — LCEN art. 6-III)

Fichier : `mentions-legales.html`

Trois mentions sont à remplacer :
- **Statut juridique** (entreprise individuelle, SARL, SASU, etc.)
- **Numéro SIRET** (14 chiffres)
- **Numéro de TVA intracommunautaire** (si assujetti)
- **Nom du directeur de la publication** si différent du dirigeant

Cherche les `(à compléter)` ou `<em>(à compléter)</em>` dans le fichier.

> ⚠️ Sans ces mentions, le site n'est pas conforme à la loi française. Risque : 75 000 € d'amende et 1 an d'emprisonnement (LCEN).

### 1.2 Activer FormSubmit (1er envoi)

Au premier envoi d'un formulaire (contact ou devis), FormSubmit envoie un mail de confirmation à `chr.controle@gmail.com` pour activer le service. Il faut cliquer sur le lien de confirmation dans ce mail **une seule fois**. Ensuite tous les envois suivants arrivent directement.

Le mieux : envoyer un formulaire de test dès la mise en ligne pour activer FormSubmit.

### 1.3 Changer le mot de passe admin

Mot de passe par défaut : `ChangeMe2026!`
URL admin : `/admin.html`

**Pour changer le mot de passe** :

1. Ouvre `/admin.html` dans un navigateur, connecte-toi.
2. Ouvre la console développeur (F12 → onglet "Console").
3. Tape (en remplaçant par ton nouveau mot de passe) :
   ```js
   await CHRAdmin.makeHash('TonNouveauMotDePasse', 'chr-2026-salt-v1')
   ```
4. Copie le hash affiché.
5. Ouvre `js/admin.js`, ligne 9, remplace la valeur de `PWD_HASH` par le nouveau hash.
6. (Optionnel) change aussi `PWD_SALT` ligne 10 pour invalider l'ancien hash de manière encore plus stricte.
7. Sauvegarde et redéploie (`vercel --prod`).

**Sécurité admin en place** :
- Hash SHA-256 + salt, vérifié via WebCrypto natif du navigateur
- Session de 2 h en `sessionStorage`
- Limitation : 5 tentatives, puis blocage 15 min
- Bouton "Déconnexion" en haut à droite
- `/admin.html` est en `noindex, nofollow` (header HTTP + robots.txt)

> ℹ️ Ce niveau de sécurité décourage les curieux et bloque le scan automatisé. Pour une protection serveur réelle (impossible à contourner), envisager Vercel Password Protection (plan Pro).

---

## 2. ARCHITECTURE

```
chr teste/
├── index.html              page d'accueil
├── services.html           détail des 6 prestations
├── a-propos.html           présentation entreprise
├── faq.html                FAQ + JSON-LD FAQPage
├── contact.html            formulaire de contact
├── devis-en-ligne.html     formulaire de devis
├── mentions-legales.html   ⚠️ à compléter
├── politique-confidentialite.html  RGPD complet, sous-traitants
├── cookies.html            politique cookies (CNIL conforme)
├── admin.html              espace admin protégé par mot de passe
├── robots.txt              bloque /admin.html et /data/
├── sitemap.xml             URLs publiques
├── vercel.json             headers de sécurité + cache
├── CHR_logo.avif           logo principal
├── css/
│   └── main.css            design system complet
├── data/
│   └── content.json        contenu CMS (services, contact, menu)
├── images/                 photos terrain
└── js/
    ├── main.js             header, menu mobile, reveal, cookie banner
    ├── admin.js            espace admin (auth + CRUD localStorage)
    ├── cms-loader.js       hydrate les pages depuis content.json
    ├── estimator.js        estimateur tarif (non utilisé dans la page actuelle)
    └── forms.js            envoi formulaires via FormSubmit + fallback mailto
```

## 3. SÉCURITÉ

Headers HTTP appliqués sur toutes les pages (cf. `vercel.json`) :

| Header | Valeur |
|---|---|
| `Strict-Transport-Security` | HSTS 2 ans + preload |
| `Content-Security-Policy` | self + Google Fonts + FormSubmit |
| `X-Frame-Options` | DENY |
| `X-Content-Type-Options` | nosniff |
| `Referrer-Policy` | strict-origin-when-cross-origin |
| `Permissions-Policy` | caméra/micro/géoloc bloqués |

Vérifier après déploiement : https://securityheaders.com/?q=chr-conformite-reunion.vercel.app

## 4. RGPD / LÉGAL

**Pages légales** :
- `cookies.html` : informe sur le cookie technique `chr_cookie_choice` (mémoire bandeau). Aucun traceur.
- `politique-confidentialite.html` : finalités, base juridique, durées, sous-traitants (Vercel, FormSubmit, Google), droits utilisateur.
- `mentions-legales.html` : éditeur, hébergeur, propriété intellectuelle.

**Sous-traitants déclarés** :
- Vercel (hébergement, USA — DPF)
- FormSubmit / Open Tools LLC (acheminement e-mail, USA — CCT)
- Google (réception mail, USA/IE — DPF)

**Cookie banner** : informatif uniquement (cookies techniques exemptés de consentement selon délib. CNIL 2020-091).

## 5. DÉPLOIEMENT

```bash
# Connexion (1 fois)
vercel login

# Déploiement preview
vercel

# Déploiement production
vercel --prod
```

Toute modification de `content.json` ou des fichiers HTML/CSS/JS nécessite un redéploiement.

## 6. ADMIN — UTILISATION

1. `/admin.html` → saisis le mot de passe.
2. Modifie services, menu, contact dans l'UI.
3. Clique **Enregistrer** : sauvegarde locale (visible dans ce navigateur uniquement).
4. Pour publier en ligne : clique **Exporter JSON**, remplace `data/content.json` dans le projet par le fichier téléchargé, redéploie.
5. **Demandes de devis** : sauvegardées localement à chaque envoi de formulaire (`chr_leads_v1` en localStorage). Visibles dans l'onglet "Demandes de devis". Export CSV disponible.

> ⚠️ Les leads en localStorage sont propres à un navigateur. Pour un suivi multi-appareil, prévoir une base de données (Supabase, Airtable, etc.).

---

*Document de livraison généré le 20 mai 2026.*
