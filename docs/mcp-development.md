# Développement et recette du front MCP

## Architecture

`types/mcp.ts` contient les contrats TypeScript, `services/mcp.service.ts` les appels et le cycle CSRF, `pages/mcp/` les écrans et `components/mcp/` la politique et les actions de pipeline. `lib/mcp-review.ts` centralise les conditions UI d'acceptation. Réutiliser `api`, `useAuth`, `useToastError`, TanStack Query, SectionCard et YamlViewer.

Ne pas ajouter une logique de politique de production indépendante dans React. Le serveur vérifie rôle, scopes, environnement, snapshot et challenge. Les types du front doivent évoluer avec OpenAPI et les exports de version ; les erreurs CNP ne sont pas remplacées par des diagnostics fournisseurs.

## Configuration

`VITE_API_BASE_URL` conserve le contrat existant et inclut `/api/v1`. Les endpoints OAuth non versionnés utilisent la même origin sans ce suffixe. `FRONTEND_URL` backend doit correspondre exactement à l'origin du front ; CORS autorise credentials et l'origin précise. HTTPS est requis en production.

Pour les décisions, le service crée une session navigateur avec JWT, reçoit un cookie HttpOnly et un CSRF, puis envoie `X-CNP-CSRF`. Le JWT et le cookie doivent représenter le même compte. Le front ne stocke pas la valeur du cookie HttpOnly ni les tokens OAuth MCP. La déconnexion supprime la session de review.

## Tests

```bash
npm test
npm run build
```

Les tests utilisent le runner Node et demandent Node 22+ pour les sources TypeScript sans compilation séparée. Quatre tests ont réussi : absence d'accusé implicite, action courante explicitement reconnue, expiration/changement/consommation/chargement, et sécurité du redirect de login. Le build TypeScript/Vite a réussi ; l'avertissement de taille du bundle reste présent.

Le 8 octobre 2026, login de démonstration et page Connections ont été observés dans le navigateur intégré, avec un grant de qualification en lecture. Ce grant a ensuite été révoqué par le nettoyage HTTP. Aucune review critique réelle n'a été acceptée automatiquement dans le navigateur.

## Recette navigateur à enregistrer

| Scénario | Attendu |
|---|---|
| Login/consent avec projets non cochés | Aucune permission implicite |
| Refus/annulation de consentement | Client informé, pas de grant actif |
| Page review sans accusé | Approve désactivé |
| Refus de review | Pas de job/PR/dispatch correspondant |
| Review expirée / modifiée pendant lecture | Acceptation bloquée, nouvelle préparation requise |
| Maintainer production | Challenge refusé, owner requis |
| Owner même projet | Review de la même action possible |
| Compte changé / CSRF absent | Refus serveur |
| Révocation pendant parcours | Étapes futures bloquées, effets anciens conservés |
| Workflow réussi et IP absente | État pending, pas de succès public inventé |

La recette complète GitHub/AKS et Codex attend un environnement isolé configuré ; voir le backend `docs/mcp/qualification.md`. Le nouveau dépôt de test `Lxdro/cnp-mcp-hello-sam` attend sa connexion GitHub App et une cible AKS. Ne pas confondre les tests de fonctions UI avec une recette de clics complète.

## Export des routes pour le serveur docs

`docs/ui-route-help.json` appartient au front et décrit l'aide des écrans. `scripts/export-ui-routes.mjs` dérive les chemins et composants du vrai `src/routes/router.tsx`, les enrichit avec cette aide et produit `ui-routes.json` / `ui-routes.md` avec le commit source. Après commit du front :

```bash
node scripts/export-ui-routes.mjs ../CNP-MCP-SERVER/frontroutes
```

Les exports ne doivent pas être édités à la main. Une modification de route ou d'interface HTTP implique de mettre à jour l'aide dans le dépôt responsable puis de régénérer le bundle.
