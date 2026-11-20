# Parcours portail : cloud privé k3s

Le cluster est préparé par l'équipe avec `IaC---CNP/GoogleCloud`. Le portail
importe un target existant et déploie les apps. Les règles serveur et la recette
complète sont dans `CNP---API/docs/private-k3s.md`.

## Administration

1. Ouvrir **Platform Infrastructure → Private cloud · k3s** avec le rôle admin.
2. Choisir le projet du setup, coller son `cnp_cd_contract.json` et sélectionner
   **Register private target**. Le namespace doit correspondre à son UUID ; aucun
   secret ne doit être incorporé au contrat.
3. Charger `observer.kubeconfig` dans **Read-only observer kubeconfig**. Le fichier
   est envoyé au service de secrets existant : `PRIVATE_OBSERVER_KUBECONFIG`,
   environnement `cd:<UUID target>`. Sa valeur n'est jamais réaffichée.
4. Lancer **Check Kubernetes connection** pour vérifier l'accès de lecture au
   namespace. Ce check ne modifie pas le cluster.
5. Dans les paramètres projet, activer **Human-reviewed operations** et autoriser
   le target et l'environnement. Le backend réutilise `McpProjectPolicy` ; aucune
   connexion MCP n'est nécessaire pour ce parcours portail.

Après renouvellement opérateur, charger le nouveau fichier observer puis refaire
le check. Un token expiré ne déclenche aucune création de VM ou acquisition de
credentials administrateur depuis le navigateur.

## Déploiement

La CI gérée doit avoir fourni un digest GHCR vérifié après fusion CNP. Dans le
CD du repository, sélectionner la cible privée, le digest et le port applicatif.
Le Service est imposé à ClusterIP et l'Ingress HTTPS est généré avec le hostname
applicatif et le domaine du contrat.

Examiner la preview, publier la PR avec review, fusionner selon les protections
GitHub, puis examiner l'action de déploiement distincte. La fusion seule ne
provoque pas le déploiement. Le suivi corrèle le workflow GitHub et les preuves
Kubernetes ; le certificat en cours d'émission reste en attente. L'adresse
publique apparaît quand rollout, routage et certificat sont prêts.

Runners, DNS wildcard, lecture GHCR privée et cert-manager sont préparés par
l'équipe. L'image doit fonctionner sans root. Utiliser l'issuer ACME production
après qualification staging pour la recette HTTPS de confiance.

## Développement et qualification

`lib/private-contract.ts` accepte le JSON direct ou enveloppé dans
`cnp_cd_contract` et valide sa forme avant envoi. L'API reste responsable de la
validation définitive et des permissions. Les appels utilisent les services
cloud-target et secret existants et invalident leurs queries TanStack.

Les types incluent `private/k3s` et `in_cluster`. Le CD privé exige la politique
de review ; le chemin hérité est refusé. Les principals MCP restent refusés côté
API ; aucun tool privé n'est ajouté.

Les tests couvrent parseur et preview privée en complément des reviews. Lancer
`npm test`, `npm run build` et `npm run lint`. Sous Node 25 avec Web Storage
expérimental, utiliser `NODE_OPTIONS=--no-experimental-webstorage npm test` pour
jsdom. La recette réelle GCP/GitHub/ACME est documentée côté API et IaC et reste
à effectuer avec les comptes de l'équipe.
