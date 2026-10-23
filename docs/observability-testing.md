# Recette observabilité : dépôt GitHub → Azure AKS → Grafana

Ce guide décrit un parcours de test à exécuter sur un environnement dédié : créer un projet, y importer un dépôt FastAPI, livrer son image sur Azure AKS, activer logs/métriques/traces, les consulter dans Grafana puis arrêter la collecte. Il ne constitue pas un compte rendu de déploiement cloud.

Le contrat de référence est la branche API `feat/observability`, révision [`3957f1e`](https://github.com/Mindsept/CNP---API/commit/3957f1e). Noter les SHA front/API réellement testés. Le profil couvert est **FastAPI Python 3.12 / Azure AKS DEV**, avec deux réplicas ; les autres clouds, la production, la haute disponibilité et la livraison sans perte demandent des qualifications séparées.

## 1. Préparer l'environnement

Prévoir 60–90 minutes pour le parcours nominal lorsque le dépôt et l'infrastructure sont prêts. Le provisioning initial et le renouvellement naturel des certificats sont des étapes séparées.

| Élément | Prérequis |
|---|---|
| Poste CNP | Docker/Compose compatible avec `include`, Node 22.18+ recommandé, npm ; les dépôts CNP-Front, CNP---API, CNP-MCP-SERVER et IaC---CNP côte à côte. |
| Identités | Compte CNP Owner ou Maintainer du projet ; compte Viewer et compte sans accès pour les contrôles de droits. Identités Keycloak liées aux comptes CNP. |
| GitHub | GitHub App installée sur le dépôt de recette, droits nécessaires aux PR/workflows et à la synchronisation des secrets. |
| GHCR | Registre plateforme configuré avec `GHCR_USERNAME`, `GHCR_TOKEN` et namespace appropriés. Image lisible depuis le worker et AKS ; image pull secret si privée. |
| Azure | Cluster AKS DEV et namespace existants, Cloud Node enregistré dans CNP à partir du `cnp_cd_contract`, credentials Azure valides dans les secrets natifs. Le parcours CD ne provisionne pas le cluster. |
| Observabilité | Backend, worker, migrations et socle observabilité disponibles ; ingestion HTTPS/mTLS joignable depuis AKS. Le front seul ne suffit pas. |

Conserver les `.env`, clés de chiffrement, identités, volumes et `COMPOSE_PROJECT_NAME` existants. Sur une nouvelle installation seulement, créer les fichiers privés depuis leurs exemples. Consulter le [démarrage Keycloak/API](https://github.com/Mindsept/CNP---API/blob/feat/observability/docs/keycloak-integration.md), le [guide CD AKS](https://github.com/Mindsept/CNP---API/blob/feat/observability/docs/cd-aks-demo-flow.md) et, si le cluster reste à créer, le [runbook Azure IaC](https://github.com/Mindsept/IaC---CNP/blob/main/Azure/README.md).

### Choisir et préparer le socle

Ce parcours utilise CNP + Keycloak + passerelle Grafana sur le poste, l'application et son Collector sur AKS, puis ingestion/Mimir/Loki/Tempo/Grafana sur un VPS. L'opérateur prépare le socle distant avec `docker/observability/connectivity/compose.socle.yaml` et fournit le bundle client reader/writer/access selon le [guide de connectivité](https://github.com/Mindsept/CNP---API/blob/feat/observability/docker/observability/connectivity/README.md).

Compléter la configuration privée CNP en suivant [connectivity/env.example](https://github.com/Mindsept/CNP---API/blob/feat/observability/docker/observability/connectivity/env.example) :

- `COMPOSE_FILE=docker/observability/connectivity/compose.client.yaml`, nom Compose existant, `CNP_OBSERVABILITY_API_ROOT` et `CNP_OBSERVABILITY_CLIENT_CREDENTIALS_DIR` propres au poste ;
- mêmes origines sur le client et le socle : contrôle HTTPS `:18443`, transport Grafana HTTPS `:19443`, ingestion **HTTPS `:443`** ;
- `CNP_GRAFANA_ROOT_URL=http://localhost:13000` pour l'accès navigateur local, distinct du transport Grafana privé.

Vérifier DNS, SAN des certificats et confiance TLS, accès du poste au contrôle/Grafana privé et accès AKS à l'ingestion. Le profil AKS refuse un autre port d'ingestion. Les stockages et Grafana brut restent privés. Le démarrage de CNP ne déploie pas le VPS. Pour un socle commun hébergé avec CNP, suivre plutôt le [guide du socle commun](https://github.com/Mindsept/CNP---API/blob/feat/observability/docker/observability/platform/README.md) et ses propres adresses.

### Lancer CNP et le front

Depuis le dépôt CNP-Front, après configuration des fichiers privés :

```powershell
Set-Location ../IaC---CNP/dev/auth
docker compose up -d --wait
Set-Location ../../../CNP---API
docker compose config --quiet
docker compose up -d --build
docker compose ps
Set-Location ../CNP-Front
npm ci
npm run dev
```

Contrôler `http://localhost:8080/api/v1/health`, puis ouvrir `http://localhost:5173`, se connecter et vérifier le compte/rôle du projet. L'assemblage observabilité lance ses migrations avec `python -m app.db.observability_migrations` ; ne pas le contourner en forçant l'ancien `docker-compose.yml` seul ou en lançant uniquement Alembic natif sur cette base.

## 2. Préparer l'application et son image

Le dépôt de recette doit contenir une application FastAPI Python 3.12, Dockerfile, dépendances, tests, `.env.example`, `/health` et une route métier. Prévoir également des réponses 4xx/5xx contrôlées et une route lente bornée pour distinguer les signaux. Les secrets runtime vont dans les secrets du projet, environnement `cd`.

**Embarquer le SDK avant le build.** `cnp-observability-python` 0.2.0 est fourni dans l'API, pas publié sur PyPI : construire une wheel ou embarquer une copie versionnée et ses dépendances selon le [README SDK](https://github.com/Mindsept/CNP---API/blob/feat/observability/packages/cnp-observability-python/README.md). Initialiser une fois l'application :

```python
from fastapi import FastAPI
from cnp_observability import configure

app = FastAPI()
observability = configure(app)
```

Le SDK produit les signaux HTTP et son logger permet les événements métier. Vérifier l'absence d'instrumentation OTel concurrente. Une image sans cet appel ne devient pas instrumentée par le seul ajout des variables Kubernetes.

Le validateur d'image exige une référence **GHCR** `ghcr.io/<owner>/<image>@sha256:…` dont le digest désigne un **index OCI ou une manifest list avec exactement une entrée `linux/amd64`**. Un digest de manifest image simple n'est pas accepté par ce contrat. Pour la recette, construire un index avec une seule plateforme exécutable `linux/amd64` ; les attestations peuvent rester présentes. Relever le digest de l'index et vérifier qu'il correspond à l'image livrée, sans utiliser un tag mutable comme preuve.

## 3. Exécuter le parcours nominal

| Étape | Action dans CNP/GitHub | Résultat attendu |
|---|---|---|
| N01 | Créer un projet de recette avec le compte Owner/Maintainer. Connecter la GitHub App, importer le dépôt et lancer son analyse. | Bon dépôt/branche/projet ; stack FastAPI détectée. |
| N02 | Générer la CI avec build Docker et push GHCR, relire/approuver la preview, ouvrir puis merger la PR du dépôt de recette. | Run GitHub Actions vert ; image publiée. Noter SHA applicatif, référence et digest. |
| N03 | Dans `Projet → Dépôt → CD workflow`, choisir la cible AKS, namespace, image, port applicatif, **2 réplicas**, Service LoadBalancer et secrets nécessaires. Générer/approuver la preview CD. | Cible et image correctes ; noter l'ID de preview. |
| N04 | Ouvrir/merger la PR CD, attendre son run puis rafraîchir le statut de déploiement dans CNP. | Deux Pods Ready ; URL publique ; `/health` et route métier fonctionnels avant ON. Noter UID et compteurs de redémarrage. |
| N05 | Sur cette preview, activer `Enable observability in this plan`, saisir le digest exact et cliquer `Prepare configuration`. | Revue de l'image, fichiers, prérequis et renouvellement automatic-v1 ; préparer seul n'applique rien. |
| N06 | Cocher la confirmation puis `Approve activation`. | Une approbation/job ; convergence vers `Active`. Le statut est rafraîchi toutes les 10 s. |
| N07 | Revenir au projet et cliquer `Open Grafana`. | Nouvel onglet, projet correct et rôle Viewer ; trois panneaux disponibles. |
| N08 | Émettre du trafic léger et consulter réellement les trois signaux pendant **20 minutes**, selon la section suivante. | Données fraîches et corrélées, deux producteurs de métriques, navigation utilisable. |
| N09 | Dans CD : interrupteur OFF → `Prepare configuration` → relire → `Approve deactivation`. | État `Disabled`, Collector retiré, application toujours disponible. |
| N10 | Émettre encore 20 requêtes, rafraîchir CNP et contrôler à +2 min après convergence. | Réponses conformes, collecte nouvelle arrêtée, pas de réactivation. L'historique conservé reste consultable selon sa rétention. |

**L'approbation observabilité est distincte du déploiement CD.** Pour tester ON avant la livraison, le message `Waiting for the approved application deployment` est attendu. Le worker attend Deployment Ready et image déployée pendant **10 minutes maximum** : le parcours nominal livre donc CD avant ON. Définir un délai d'acceptation pour les premiers signaux, par exemple 5 minutes après Pods prêts, sans le confondre avec un SLA produit.

## 4. Vérifier logs, métriques et traces

Maintenir au plus une requête par seconde : surtout des réponses 200, quelques erreurs contrôlées et quelques réponses lentes. Relever heure UTC, route, statut attendu, durée et en-têtes `x-cnp-request-id` / `x-cnp-trace-id`. Choisir `Last 15 minutes` avec refresh 10 s dans Grafana.

Exemple PowerShell pour la route `/health` du dépôt de recette ; exécuter les autres cas contrôlés en complément :

```powershell
$recetteBaseUrl = 'http://<IP-retournee-par-CNP>'
$recetteDeadline = (Get-Date).AddMinutes(20)
while ((Get-Date) -lt $recetteDeadline) {
    $response = Invoke-WebRequest -Uri "$recetteBaseUrl/health"
    [pscustomobject]@{
        HeureUTC = (Get-Date).ToUniversalTime().ToString('o')
        Statut = [int]$response.StatusCode
        RequestId = $response.Headers['x-cnp-request-id']
        TraceId = $response.Headers['x-cnp-trace-id']
    }
    Start-Sleep -Seconds 1
}
```

| Signal | Vérification | Acceptation |
|---|---|---|
| Logs / Loki | `{service_name="<service_key>"}`, puis retrouver un `request_id` noté. | Route template, statut et trace cohérents ; pas de query string, body ou secret. |
| Métriques / Mimir | `cnp_http_requests_total{service_name="<service_key>"}`, `cnp_http_request_duration_seconds_count` et `_sum` ; distinguer le label `instance`. | Compteurs augmentant, durées cohérentes, **deux producteurs** stables pendant la vie des Pods, timestamps récents. |
| Traces / Tempo | Rechercher un `x-cnp-trace-id`, rapprocher span serveur et log ; refaire sur une erreur contrôlée. | Même requête/application, route/statut/durée cohérents, trace récente. |
| Grafana | Naviguer, changer de fenêtre et consulter à T0, +10 et +20 min. | Pas d'erreur persistante de datasource ou boucle d'authentification. Relever redémarrages/OOM côté opérateur. |

L'accès Grafana est borné par le token CNP : noter une expiration normale, se reconnecter puis rouvrir Grafana depuis CNP. Elle n'est pas une panne de collecte. Un statut `Active`, un ACK SDK ou des courbes historiques ne remplacent pas la lecture des nouvelles données. Les files sont bornées et les lectures de logs limitées à 100 ; aucune absence ponctuelle ne démontre à elle seule un nombre exact de pertes.

Pour isoler une panne UI/ingestion, comparer les endpoints authentifiés CNP `/api/v1/observability/bindings/{binding_id}/logs`, `/metrics` et `/traces/{trace_id}` sur la même fenêtre. Cette vérification ne remplace pas la consultation visuelle.

## 5. Tester les erreurs, les droits et les retries

| Cas | Action | Résultat attendu |
|---|---|---|
| V01 | Digest invalide, CD non approuvé, cible/stack non supportée. | Préparation refusée ou prérequis explicite ; aucun job appliqué. |
| V02 | Changer CD/cible après préparation, revenir via `obsPlan`, ou rendre le plan obsolète dans un second onglet. | Ancien plan inutilisable ; nouvelle préparation nécessaire. Recontrôler le digest affiché. |
| V03 | Doubles clics et deux approbations du même plan. | Un seul effet ; idempotence ou conflit explicite. |
| V04 | Popup bloquée puis autorisée, lancement Grafana interrompu, ticket consommé rejoué. | Erreur récupérable et nouveau lancement possible ; ticket rejoué refusé, pas de token dans l'URL. |
| V05 | Viewer : lecture puis tentatives ON/OFF/Retry. Utilisateur extérieur : URL d'un autre projet/binding. | Lecture Viewer autorisée ; mutations et accès étrangers refusés côté API. Aucun Retry actionnable pour le Viewer. |
| V06 | Deux projets avec des données distinctes : changer les identifiants d'organisation/datasource ; retirer ensuite les droits d'un Viewer connecté. | Aucune lecture étrangère ; nouvelle requête protégée refusée après retrait des droits. |
| V07 | Socle indisponible sur l'environnement de recette. | Fonctions natives CNP accessibles, erreur observabilité bornée ; préparation OFF disponible, convergence après reprise si nécessaire. |

Contrôler les retries avec le journal Network du navigateur et des réponses simulées dans les tests automatisés. Le backend de référence n'autorise le retry que pour `failed`. En état `degraded`, CNP contrôle automatiquement la télémétrie à nouveau ; examiner l'application et le socle si le problème persiste. `Refresh observability status` relit l'état sans créer de job ni appliquer une configuration.

| Cas retry | Scénario | Attendu |
|---|---|---|
| T01 | Binding `failed`, Owner/Maintainer, clic `Retry observability`. | POST **sans corps** (pas `{}`), en-tête `Idempotency-Key`, réponse acceptée et job effectif. |
| T02 | Perte réseau ou réponse perdue pendant T01, puis nouveau clic dans le même panneau. | **Même clé** pour réconcilier la tentative incertaine ; pas de second effet. |
| T03 | Réponse de retry réussie, puis nouvel échec à la même `config_revision`, puis nouveau clic. | **Nouvelle clé** et nouvelle tentative, sans rejouer simplement le reçu précédent. |
| T04 | Binding `degraded` ou compte Viewer. | Aucun Retry actionnable ; requête directe non autorisée refusée côté API. |

## 6. Exécuter les tests automatisés du front

Depuis CNP-Front, avec Node 22.18+ :

```sh
npm ci
npm test
npm run build
npm run lint
```

Pour cibler rapidement les tests observabilité :

```sh
npx vitest run src/components/observability src/services/observability.service.test.ts
```

Sur Node **22.12**, les tests Node qui importent du TypeScript nécessitent temporairement le flag expérimental. Ne pas modifier les scripts du dépôt pour ce poste. Sous PowerShell :

```powershell
$cnpPreviousNodeOptions = $env:NODE_OPTIONS
try {
    $env:NODE_OPTIONS = (@($cnpPreviousNodeOptions, '--experimental-strip-types') |
        Where-Object { $_ }) -join ' '
    npm test
    if ($LASTEXITCODE -ne 0) { throw 'Échec de npm test' }
} finally {
    $env:NODE_OPTIONS = $cnpPreviousNodeOptions
}
```

Sous un shell POSIX, l'équivalent ne modifie que l'environnement de la commande :

```sh
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-strip-types" npm test
```

Les tests front vérifient les requêtes, états et interactions, y compris T01–T04. Ils ne prouvent pas l'accès Azure ou la présence des signaux dans Grafana. Les tests backend observabilité nécessitent PostgreSQL jetable et une base de migrations séparée : suivre la [documentation des tests API](https://github.com/Mindsept/CNP---API/blob/feat/observability/docs/observability/README.md), sans utiliser une base CNP active.

## 7. Lot avancé : pannes et renouvellement

Exécuter ces scénarios séparément, uniquement sur les composants de recette identifiés, avec les preuves nominales déjà acquises :

| Scénario | Attendu |
|---|---|
| Interrompre brièvement l'ingestion puis la reprendre, trafic maintenu. | Application saine ; retour de données fraîches dans les trois backends. Documenter les pertes possibles et le drainage. |
| Recréer uniquement le Pod Collector en conservant son PVC. | Nouveau Pod, même PVC, reprise sans recréer les Pods applicatifs. |
| Arrêter/reprendre le worker de recette. | Jobs persistants repris sans duplication ; fonctions natives revalidées. |
| Attendre le renouvellement naturel des certificats. | Génération incrémentée, nouvelles empreintes, mêmes UID/producteurs applicatifs, trois signaux récents et anciennes identités refusées après propagation. |
| Après OFF, reprendre les composants arrêtés. | Pas de réactivation par ancien job/rejeu ; application toujours saine. |

Les certificats durent au plus 24 h, avec renouvellement à 8 h restantes et transition bornée à 15 min. Un certificat neuf peut donc nécessiter environ 16 h d'attente : prévoir une fenêtre séparée et ne pas changer les horloges/TTL pour simuler une preuve naturelle. Le Collector peut suivre un cycle `Recreate` ; sa pause est distincte de la continuité des Pods applicatifs. Un worker repris après le seuil prouve le rattrapage, pas l'observation directe du seuil.

## 8. Consigner les résultats et clôturer

La recette nominale passe si N01–N10, les contrôles de droits/isolation et les retries réussissent, avec les trois signaux frais et corrélés, deux producteurs, 20 minutes de consultation et une désactivation préservant l'application. Marquer séparément chaque scénario avancé non exécuté.

| Preuve | À consigner sans secret |
|---|---|
| Versions | SHA front/API/application, URL dépôt, digest GHCR. |
| Déploiement | UUID projet/dépôt/cible/binding, namespace, preview CD, liens PR et runs CI/CD. |
| Kubernetes | UID, Ready/redémarrages des Pods, PVC Collector avant/après les scénarios concernés. |
| Télémétrie | Horaires UTC, routes/statuts attendus, request/trace IDs, producteurs et captures Grafana T0/+10/+20 min. |
| Résultats | Statut par cas, durée ON/OFF, erreurs rencontrées, IDs de jobs et résultat des tests automatisés. |

Ne pas publier tokens, cookies, clés, HAR brut ou sortie Compose contenant des secrets. À la clôture, arrêter les seules ressources de recette selon leur plan d'exploitation et vérifier leur état cloud. Conserver volumes et données : `down -v` ou la suppression d'un groupe Azure ne constituent pas une étape de nettoyage de cette recette.
