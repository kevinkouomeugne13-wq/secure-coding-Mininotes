# Rapport de sécurité — MiniNotes 📝

## 1. Périmètre & méthode
- **Application** : MiniNotes (Option B) - Gestionnaire de notes personnelles Next.js
- **Méthode d'audit** : Revue de code manuelle, exécution de tests d'intrusion locaux (via curl) et outillage automatisé (SAST/SCA).

## 2. Failles trouvées (inventaire initial)

| # | Faille | OWASP | Gravité CVSS | Fichier / Ligne | Justification |
|---|---|---|---|---|---|
| 1 | Stockage des mots de passe en clair | A02:2021 | **Élevé** (7.5) | `lib/sqldb.ts` | Si la base de données est compromise, tous les comptes sont immédiatement exposés. |
| 2 | Secret de session stocké en dur dans le code | A05:2021 | **Élevé** (7.4) | `lib/config.ts` | Le secret est commité dans Git, permettant à quiconque ayant accès au dépôt de forger des sessions. |
| 3 | Injection SQL (Bypass d'authentification) | A03:2021 | **Critique** (9.8) | `app/api/login/route.ts` | Permet de se connecter en tant que n'importe quel utilisateur (y compris l'admin) sans mot de passe. |
| 4 | Fuite de données sensibles (Authentification) | A01:2021 | **Moyen** (5.3) | `app/api/login/route.ts` | L'API renvoie l'intégralité de l'objet utilisateur, incluant le mot de passe en clair ou le hash. |
| 5 | Cookie de session non sécurisé (httpOnly: false) | A05:2021 | **Moyen** (6.5) | `app/api/login/route.ts` | Le cookie de session peut être dérobé par un script malveillant via une faille XSS. |
| 6 | Insecure Direct Object Reference (IDOR) | A01:2021 | **Élevé** (8.5) | `app/api/notes/[id]/route.ts` | Un utilisateur connecté peut lire les notes privées de n'importe quel autre utilisateur en changeant l'ID. |


## 3. Synthèse des correctifs (Preuves APRÈS)

Toutes les vulnérabilités identifiées ont été corrigées à la cause racine. Les tests de validation confirment la fermeture des vecteurs d'attaque :

| # | Faille initiale | Solution technique appliquée | Statut de validation |
|---|---|---|---|
| 1 | Injection SQL (Login) | Passage à une **requête paramétrée** via `db(sql, [email, password])` sur `alasql`. | **Validé** : L'attaque `curl` renvoie une erreur 401. |
| 2 | Insecure Direct Object Reference (IDOR) | Ajout d'une condition stricte de vérification d'identité : `userId = ?` dans la clause SQL. | **Validé** : Une session utilisateur reçoit un code 404/Accès refusé en tentant de lire la note d'un tiers. |
| 3 | Injection SQL (Notes) | Remplacement des concaténations par des requêtes paramétrées en sélection (`GET`) et insertion (`POST`). | **Validé** : Fonctionnalités nominales opérationnelles et imperméables aux caractères spéciaux. |
| 4 | Faille XSS Stockée | Suppression de l'attribut `dangerouslySetInnerHTML` et passage à l'**échappement contextuel natif** de React `{ c.html }`. | **Validé** : Les balises HTML et scripts sont encodés en texte brut inoffensif. |
| 5 | Faille CSRF (Profil) | Validation stricte des en-têtes d'origine (`Origin` / `Referer`) face à l'hôte attendu côté serveur. | **Validé** : Les requêtes provenant de domaines tiers ou sans en-tête d'origine sont bloquées avec un code 403. |

## 4. Mesures de durcissement global (Défense en profondeur)

1. **Sécurisation de la session et des cookies** :
   - Activation de l'attribut `HttpOnly: true` pour bloquer la lecture du cookie de session par JavaScript (protection contre le vol de session post-XSS).
   - Configuration de `SameSite: "Strict"` pour interdire l'envoi automatique du cookie lors de rebonds de navigation intersites (renforcement anti-CSRF).
   - Masquage des messages d'erreur d'authentification (`Identifiants invalides`) pour bloquer l'énumération de comptes.

2. **Zéro Secret (Gestion de la configuration)** :
   - Retrait du secret de signature en dur dans `lib/config.ts`.
   - Externalisation dans le fichier non versionné `.env.local` et chargement dynamique via `process.env.SESSION_SECRET`.

3. **En-têtes HTTP de sécurité** :
   - Implémentation centralisée dans `next.config.ts` des en-têtes préconisés par l'OWASP : `X-Frame-Options: DENY` (anti-Clickjacking), `X-Content-Type-Options: nosniff` (anti-MIME-sniffing), et `Strict-Transport-Security` (HSTS) pour forcer le chiffrement des flux.

