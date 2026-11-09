# Refonte Graphite — livraison et reprise

État du 9 novembre 2026. Cette recette concerne l'interface locale et son intégration avec l'API et Keycloak. Elle ne remplace pas une recette de déploiement Azure.

## Où se trouve le travail

- Frontend : `C:/Users/hugos/Documents/EPITA/s8/cnp/CNP-Front-graphite`.
- Branche : `feat/graphite-redesign`, créée depuis `7e824334cc0ad0d5ad0523e6de42400e74fa083d`.
- URL locale canonique : [http://localhost:5273](http://localhost:5273).
- API de la recette : `http://localhost:8180/api/v1`.
- Keycloak : `http://localhost:8181`, realm `cnp`, client `cnp-front`.
- Thème Keycloak : `C:/Users/hugos/Documents/EPITA/s8/cnp/IaC---CNP/dev/auth/keycloak/themes/cnp/login`. Ce thème se trouve dans un autre dépôt ; il n'est pas inclus dans la branche frontend.

Les autres checkouts CNP restent indépendants. Le serveur de développement doit être lancé depuis **CNP-Front-graphite** pour voir la refonte.

## Direction et contenu

Graphite utilise des surfaces anthracite mates, un accent bleu glacier, des bordures sobres et IBM Plex Sans. Les couleurs de succès, avertissement et erreur gardent leur sens. Les polices sont servies localement ; leur licence OFL est dans `public/fonts`.

Le tableau de bord présente les compteurs retournés par l'API, les projets et l'activité. Les fiches projet regroupent les dépôts, les cibles configurées, les déploiements, l'observabilité et les membres. Les onglets sont partageables via `?view=`.

La recherche Ctrl/Cmd+K ouvre des pages existantes et filtre les projets par nom ou slug. La liste des projets possède un filtre et deux modes d'affichage. Le menu compact se ferme après navigation et rend le focus à son bouton.

La navigation d'un dépôt relie sa fiche, son analyse, sa CI et sa CD. L'observabilité distingue la santé actuelle des preuves datées d'une opération passée. Les alertes restent à côté de l'application sur grand écran et passent dessous sur petit écran. Les tableaux, onglets et blocs YAML défilent dans leur propre zone lorsque nécessaire.

Le login CNP, la page Keycloak et la MFA utilisent la même identité visuelle. Un échec de démarrage OIDC laisse un message visible et permet de réessayer ; les requêtes OIDC ont un délai de 15 secondes.

## Contrats conservés

- Aucun bouton décoratif ni compteur de santé inventé.
- Les rôles, les permissions GitHub, les revues humaines et les opérations CI/CD continuent de passer par les services existants.
- La sélection d'image, les digests, les secrets et l'orchestration d'observabilité restent côté API.
- La configuration de collecte, les incidents, les accusés de réception et les reçus WhatsApp utilisent les composants et contrats existants.
- Les champs, actions de formulaires et scripts d'authentification Keycloak/MFA sont conservés ; la modification du thème porte sur leur présentation.

## Ce qui a été vérifié

### Automatisé

- `npm test` : **98 tests Vitest et 5 tests Node réussis**.
- Recherche clavier, filtrage, navigation et retour de focus ; erreur API et bouton Réessayer.
- Onglet projet dans l'URL et conservation des autres paramètres ; contrôle d'accès à la gestion des bases.
- Message d'échec OIDC persistant et nouvelle tentative.
- Les tests existants couvrent notamment les revues, les permissions et les états d'observabilité.
- `npm run lint` : aucune erreur, cinq avertissements préexistants.
- `npm run build` : compilation TypeScript et bundle Vite. Le bundle principal conserve un avertissement de taille ; aucun découpage supplémentaire n'a été ajouté dans cette refonte.

### Navigateur avec les données réelles de la recette

- Connexion Keycloak puis MFA saisie par l'utilisateur, retour dans la session CNP.
- Tableau de bord et projets RabbitMQ ; onglets projet et historique des incidents.
- Recherche Ctrl+K, filtre de projets, affichage liste, ouverture et annulation du formulaire de création.
- Navigation CI/CD et affichage des prévisualisations existantes.
- Largeur desktop 1440 px et largeur compacte d'environ 390 px.
- Menu compact, fermeture après navigation et retour du focus ; recherche fermée avec Échap.
- Corrections de deux débordements : légende masquée du tableau des dépôts et colonne YAML de la CI.
- Les trois contrastes mesurés dans les tokens sont de 6,94:1 pour le texte secondaire sur surface, 10,08:1 pour le texte du bouton principal et 3,17:1 pour la bordure des champs sur surface. Ce contrôle partiel ne constitue pas un audit WCAG complet.
- Les règles CSS de réduction des animations sont conservées ; le rendu avec un lecteur d'écran et les préférences système de mouvement n'ont pas fait l'objet d'une recette complète.

Aucune création de projet, publication de PR, modification de secret, activation d'alerte ou opération cloud n'a été déclenchée pendant cette vérification visuelle.

## Limites actuelles

Les données de novembre sont historiques. Les ressources Azure de cette recette ont été supprimées avant la refonte. Une cible enregistrée est donc affichée « Configured », sans promesse de cluster en fonctionnement. La supervision peut être « Unknown », « Failed » ou en erreur de réconciliation ; les preuves d'une opération terminée restent datées.

Le plan d'activation a présenté une indisponibilité temporaire de l'API, puis un blocage explicite « The running image could not be verified ». Le bouton de mise à jour reste bloqué dans cet état. Cette recette ne prouve ni un redéploiement cloud, ni une collecte Grafana actuelle, ni un nouvel envoi WhatsApp.

Les cinq avertissements ESLint et les avertissements de migration future React Router restent présents. La création/modification effective des objets et les pages secondaires n'ont pas toutes été rejouées manuellement.

## Relancer la version locale

1. Démarrer les services locaux de la recette habituelle : base, API, worker, proxy et Keycloak.
2. Dans cette installation WSL, garder une session au premier plan pour éviter l'arrêt de la distribution et du Docker natif :

   ```powershell
   wsl.exe -d Ubuntu-22.04 --exec bash /mnt/c/Users/hugos/Documents/EPITA/s8/cnp/cnp-observability-demo/keepalive.sh
   ```

3. Vérifier les services, sans imprimer leurs variables d'environnement :

   ```powershell
   wsl.exe -d Ubuntu-22.04 --exec docker -H unix:///run/cnp-native-docker.sock ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   Invoke-WebRequest http://localhost:8180/api/v1/health
   Invoke-WebRequest http://localhost:8181/realms/cnp/.well-known/openid-configuration
   ```

4. Si un ancien conteneur frontend occupe 5273, identifier son nom dans cette liste et l'arrêter avant de lancer Vite. Ne pas relancer le frontend de l'ancien checkout en parallèle.
5. Conserver les valeurs locales suivantes dans `.env.local`, fichier ignoré :

   ```dotenv
   VITE_API_BASE_URL=http://localhost:8180/api/v1
   VITE_KEYCLOAK_URL=http://localhost:8181
   VITE_KEYCLOAK_REALM=cnp
   VITE_KEYCLOAK_CLIENT_ID=cnp-front
   ```

6. Depuis le checkout Graphite :

   ```powershell
   Set-Location C:/Users/hugos/Documents/EPITA/s8/cnp/CNP-Front-graphite
   npm run dev -- --host 127.0.0.1 --port 5273 --strictPort
   ```

   Dans ce poste, `node_modules` est une jonction vers le checkout d'intégration. Sur une installation indépendante, utiliser `npm ci`.

7. Ouvrir **localhost**, pas 127.0.0.1 : les URL de retour OIDC et les cookies ont été configurés pour localhost. Se connecter avec le compte de recette et saisir la MFA dans Keycloak.

Une erreur au démarrage de connexion se diagnostique d'abord avec la santé API, la découverte Keycloak, les ports et la persistance de WSL. Ne pas désactiver TLS, MFA ou les revues pour débloquer une démo.

## Thème Keycloak : application et persistance

Les fichiers Graphite sont dans le dépôt IaC cité plus haut : `template.ftl`, `login-otp.ftl`, `hero.ftl`, `resources/css/graphite.css`, `resources/img/graphite.svg` et les polices IBM Plex.

La recette en cours a reçu le thème par copie dans le conteneur :

```powershell
wsl.exe -d Ubuntu-22.04 --exec docker -H unix:///run/cnp-native-docker.sock cp /mnt/c/Users/hugos/Documents/EPITA/s8/cnp/IaC---CNP/dev/auth/keycloak/themes/cnp/. cnp-observability-demo-keycloak-1:/opt/keycloak/themes/cnp/
```

Cette copie directe disparaît si le conteneur est recréé depuis une ancienne image. Le fichier `IaC---CNP/dev/auth/Dockerfile` copie déjà le thème : reconstruire l'image d'auth depuis ces sources pour une livraison durable. Ne pas remplacer le thème complet par le seul CSS si les templates correspondants ne sont pas présents.

Les quatre fichiers d'origine modifiés ont une sauvegarde locale dans `.integration/graphite-design/keycloak-before-20261109`. Ce dossier est un point de retour de cette séance, pas une livraison de production.

## Captures

- [Tableau de bord](graphite/dashboard-desktop.jpg)
- [Projet desktop](graphite/project-desktop.jpg)
- [Projet compact](graphite/project-mobile.jpg)
- [Historique d'observabilité](graphite/observability-desktop.jpg)
- [CD desktop](graphite/delivery-desktop.jpg)
- [CD compacte](graphite/delivery-mobile.jpg)
- [Connexion Keycloak](graphite/keycloak-desktop.jpg)
- [Connexion compacte](graphite/keycloak-mobile.jpg)
- [MFA](graphite/keycloak-mfa.jpg)
