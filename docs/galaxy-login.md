# Connexion au portail CNP

## Parcours

1. `/login?next=…` affiche l’accueil Galaxy du portail. « Continue to sign in » ouvre le formulaire Keycloak avec Authorization Code + PKCE.
2. Le thème Keycloak CNP affiche Galaxy, le nom d’utilisateur, le mot de passe et « Se souvenir de moi ». Le challenge A2F animé affiche six cases et confirme le code après sa vérification par Keycloak.
3. Le callback nettoie les paramètres OIDC et ouvre `/auth/arrival?next=…`.
4. L’arrivée attend l’identité ET le profil CNP. Après validation, la destination initiale se monte derrière une couche persistante au-dessus du routeur : accueil 900 ms, tunnel ralenti pendant 3,3 s, puis fondu croisé de 1,6 s. Le dashboard approche de 88 % à 100 % pendant son apparition. Les interactions sont désactivées pendant cette transition et le focus revient au contenu à la fin.
5. Un échec de profil reste visible avec une action de reprise. Une session expirée affiche « Continue to sign in » sans redirection automatique répétée.

« Se souvenir de moi » appartient à Keycloak : le mot de passe n’est jamais enregistré par CNP. Cette option ne rend pas les access tokens permanents et n’enlève pas la MFA. Le renouvellement OIDC existant est conservé.

## Sources et accessibilité

Galaxy et Light Tunnel viennent de React Bits, variantes TS/Tailwind, récupérées le 10 novembre 2026 :
- https://reactbits.dev/c/backgrounds/galaxy
- https://reactbits.dev/backgrounds/light-tunnel

La licence MIT + Commons Clause figure dans `src/components/auth/react-bits/LICENSE.md` et dans le bundle du thème. Adaptation locale : ne pas forcer `WEBGL_lose_context` au nettoyage, car React StrictMode rejoue les effets sur le même canvas. Les ressources WebGL et listeners restent libérés.

Animations décoratives ignorées par les lecteurs d’écran, bouton pour passer la transition, préférence reduced-motion respectée (fond statique et navigation directe). Sans WebGL2, le fond CSS demeure utilisable. Les animations sont chargées en chunks séparés.

Le HTML initial fixe un fond sombre et un état de chargement avant React et les feuilles de style externes. Le callback conserve ensuite le décor Galaxy pendant la vérification OIDC. La transition reste montée lors du changement de route : le tunnel ne se coupe plus au moment d’afficher le dashboard.

## Mise à jour du thème Keycloak

Le thème Galaxy, le formulaire OTP animé et la procédure d’activation sur un realm existant se trouvent dans le dépôt IaC, dans `dev/auth/THEME.md`.

## Validation

```powershell
npm test
npm run build
npm run lint
```

Tests dédiés : callback et destinations sûres, session expirée, échec/reprise de connexion, attente du profil, erreur de profil, transition, réduction des animations et saut de l’introduction.

Contrôle manuel local du 10 novembre : formulaire réel avec checkbox ; rendu mobile 390 px sans débordement horizontal ; connexion avec MFA saisie par l’utilisateur jusqu’au dashboard et ses projets ; tunnel visible sur session authentifiée. La persistance « Remember me » après fermeture complète du navigateur reste à vérifier manuellement.

Pour revoir seulement la transition avec une session ouverte : `http://localhost:5273/auth/arrival?next=%2F`.
