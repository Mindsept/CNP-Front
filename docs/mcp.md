# Parcours MCP et reviews humaines

## Écrans

| Route | Usage |
|---|---|
| `/mcp/consent` | Compte, client, redirect, scopes demandés et projets sélectionnés ; consentement explicite |
| `/mcp/connections` | Connexions OAuth du compte et révocation |
| `/mcp/reviews` | Plans préparés/en attente dans les projets du compte ; pagination 50, actualisation 10 s |
| `/mcp/reviews/:actionId` | Snapshot, SHA, empreinte, effets, noms/versions de secrets, diff et fichiers ; décision humaine |
| `/mcp/runs/:runId` | Parcours durable, actions, prochain outil, jobs et observation de déploiement |
| Paramètres projet | Politique MCP et cibles autorisées, configurables seulement par un administrateur |
| CI/CD d'un dépôt | Préparation des synchronisations, publications, fusions et déploiements, avec liens vers les reviews |

La navigation conserve le langage et les composants du front existant. Le backend décide toujours des permissions et de l'environnement. Un bouton visible ne crée aucun privilège.

## Consentement

Un client redirige vers CNP après validation serveur de sa requête OAuth. Le compte humain voit client/redirect et effets des scopes. Projets, création de projets et consentement ne sont jamais précochés. La création d'un projet nouveau n'active pas ses cibles. Une permission non reconnue interdit l'acceptation.

Le login conserve uniquement un redirect interne au front ; les URLs externes, `//` et les backslashes sont rejetés. Après consentement, le serveur fournit le redirect OAuth exact avec state et issuer. Le front n'invente pas un code ou une autorisation.

## Review de secours

1. Ouvrir le lien de l'action envoyé par MCP, ou Pending Human Reviews.
2. Examiner le compte connecté, dépôt, commit, cible, namespace, image, exposition et effets.
3. Lire les détails, les différences et les fichiers générés. Les valeurs de secrets n'apparaissent pas.
4. Cliquer Start human review : le serveur délivre un challenge lié à ce compte et à l'empreinte.
5. Cocher l'accusé de lecture puis choisir Approve and queue, Reject ou Cancel review.
6. Suivre le job et le parcours. Le déclenchement du déploiement est une review distincte de la fusion CD.

Accepter n'est jamais sélectionné par défaut. L'acceptation reste désactivée sans challenge actuel, sans accusé de lecture, après expiration, pendant le chargement ou si l'empreinte/état a changé. L'expiration est vérifiée également au serveur. Refuser ne crée aucun job ; annuler laisse le plan préparé sans effet.

Un maintainer ne peut pas approuver la production. Un owner du projet ouvre la même action et obtient son propre challenge. Une modification de commit, fichiers, cible, digest, mappings, versions de secrets ou politique invalide l'approbation ; il faut préparer une nouvelle action.

## Secrets

Configurer les valeurs dans les écrans Secrets existants, en CI/CD selon les mappings. Le LLM reçoit les noms et les manques, jamais les valeurs. `MCP_OBSERVER_KUBECONFIG` est réservé à l'observation backend et ne peut pas être exporté. Les identités Azure OIDC et l'accès GHCR privé du namespace sont préconfigurés par l'administrateur.

Sur un projet activé, les boutons historiques d'approbation/publication directe sont désactivés et les appels correspondants sont bloqués par l'API. Utiliser Human-reviewed operations. Pour CD, résoudre l'image à partir de l'action de fusion CI réussie et employer son digest dans le preview.

## Suivi et révocation

### CI persistée et accès à sa review

La page CI charge la liste des previews, puis le détail sauvegardé du pipeline
sélectionné (paramètre `?pipeline=<UUID>`, sinon le plus récent). Elle affiche
le YAML et les métadonnées sans régénérer, adapter, approuver ou publier.
Le tab CI du dépôt fournit un lien **View workflow** pour chaque pipeline.

**Human-reviewed operations** charge les actions persistées du pipeline, avec
pagination et actualisation. **Review publication** ouvre l'action existante,
y compris si une review native a été annulée et a laissé l'action `prepared`.
Le bouton de préparation d'une publication est désactivé lorsqu'une publication
active est déjà affichée. Les erreurs de lecture sont visibles et bloquent la
préparation silencieuse d'un doublon. La page de review propose un retour vers
la CI sauvegardée. Seule la décision explicite dans cette page peut approuver.

Sur un projet activé, l'UI indique l'usage de GITHUB_TOKEN pour GHCR et masque
les anciens boutons d'approbation directe. Les options réservées au parcours
historique sont désactivées ; la génération examinée impose son modèle côté API.

Le parcours conserve les effets réalisés quand il est annulé. Une révocation de connexion bloque les étapes restantes, sans effacer PR, secrets synchronisés ou workload existant. Le suivi distingue dispatch, workflow, replicas et adresse publique. Un workflow réussi avec replicas indisponibles ou IP manquante n'est pas affiché comme application disponible.

Les JSON/YAML/diffs sont rendus comme texte avec les composants existants ; aucun HTML issu du dépôt n'est exécuté. En cas d'erreur, le front utilise les toasts et codes CNP existants et renouvelle le challenge, sans réessayer une approbation silencieusement.

## CD persistée et OIDC

La page CD restaure les previews via `?pipeline=<UUID>` ou le plus récent. Les fichiers et opérations examinées peuvent être consultés après une création MCP ou un rechargement, sans régénération. Les projets activés utilisent Azure OIDC préconfiguré ; aucun client secret Azure ni kubeconfig à exporter n’est demandé. La fusion CD ne déclenche pas le déploiement : celui-ci conserve sa propre review. Le suivi du parcours examiné passe par les actions MCP ; l’ancien bloc de suivi CD automatique n’est pas affiché pour ces projets.
