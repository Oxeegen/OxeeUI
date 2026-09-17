<p align="center">
  <img src="../../brand/assets/generated/icon.png" alt="OxeeUI" width="120" />
</p>

<h1 align="center">OxeeUI</h1>

<p align="center">
  <sub><a href="../../README.md">English</a> · <strong>Français</strong></sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/plateforme-Windows%20%7C%20Linux-lightgrey?style=flat" alt="Plateformes : Windows et Linux" />
  <img src="https://img.shields.io/badge/agents-tous%20les%20CLI-5E4AF5?style=flat" alt="Compatible avec tous les agents en ligne de commande" />
  <img src="https://img.shields.io/badge/licence-MIT-08C?style=flat" alt="Licence : MIT" />
</p>

<p align="center">
  L'environnement de développement agentique d'Oxeegen — lancez n'importe quel agent de code<br/>
  dans son propre worktree git, avec le terminal, l'éditeur et la revue de diff dans une seule fenêtre.
</p>

<h3 align="center"><a href="https://github.com/Oxeegen/OxeeUI/releases/latest"><ins>Télécharger la dernière version</ins></a></h3>

<p align="center">
  <img src="../../brand/assets/readme/feature-wall/split-screen.jpg" alt="OxeeUI exécutant un agent à côté de l'éditeur et de l'arborescence des fichiers" width="960" />
</p>

---

**OxeeUI** fait travailler les agents de code comme une équipe travaille vraiment : plusieurs en même temps, chacun isolé dans son propre worktree git, avec le terminal, l'arborescence des fichiers, l'éditeur et la revue de diff côte à côte. Claude Code, Codex, Grok, Cursor, Copilot, OpenCode, Qwen, Kimi — s'il tourne dans un terminal, il tourne ici.

Les agents utilisent **vos propres abonnements**. Pas de compte Oxeegen, pas de service facturé au poste entre vous et vos outils, et aucune mesure d'audience : les builds d'OxeeUI ne contiennent aucune clé d'analytics, donc aucune donnée d'utilisation n'est envoyée.

## Téléchargement

Les builds sont publiés sur la page [**Releases**](https://github.com/Oxeegen/OxeeUI/releases).

| Version | Plateforme | Fichier |
|---|---|---|
| **0.4.204** | Windows x64 | `oxeeui-windows-setup.exe` |
| **0.4.204** | Linux x86_64 | `oxeeui-linux-x86_64.AppImage` |

Les builds **ne sont pas signés** : au premier lancement, Windows SmartScreen affiche un avertissement — choisissez **Informations complémentaires → Exécuter quand même**.

**Pas encore de build macOS.** Sans certificat Apple Developer, Gatekeeper refuse le DMG ; un build macOS suivra dès que la signature sera en place.

Les nouvelles versions sont publiées sur la page Releases.

## Fonctionnalités

<table>
<tr>
<td width="50%" valign="middle">

### Worktrees en parallèle

Envoyez un même prompt à plusieurs agents, chacun dans son propre worktree git isolé — comparez les résultats et fusionnez le meilleur.

</td>
<td width="50%">
  <picture><source srcset="../../brand/assets/readme/feature-wall/parallel-worktrees.gif" type="image/gif"><img src="../../brand/assets/readme/feature-wall/parallel-worktrees.jpg" alt="Worktrees en parallèle" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Tous les agents CLI

Claude Code, Codex, Grok, Cursor, Copilot, OpenCode, Qwen, Kimi, Goose, Cline et les autres — tous pilotés depuis une seule fenêtre, avec vos propres abonnements.

</td>
<td width="50%">
  <picture><source srcset="../../brand/assets/readme/feature-wall/cli-agents.gif" type="image/gif"><img src="../../brand/assets/readme/feature-wall/cli-agents.jpg" alt="Un agent CLI en cours d'exécution" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Terminaux divisés

Des terminaux rapides au rendu GPU, divisibles à volonté, dont l'historique survit aux redémarrages.

</td>
<td width="50%">
  <picture><source srcset="../../brand/assets/readme/feature-wall/terminal-splits.gif" type="image/gif"><img src="../../brand/assets/readme/feature-wall/terminal-splits.jpg" alt="Terminaux divisés" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Annoter les diffs de l'IA

Commentez n'importe quelle ligne d'un diff et renvoyez vos remarques directement à l'agent — relisez, modifiez et committez sans quitter l'application.

</td>
<td width="50%">
  <picture><source srcset="../../brand/assets/readme/feature-wall/annotate-diff.gif" type="image/gif"><img src="../../brand/assets/readme/feature-wall/annotate-diff.jpg" alt="Annotation d'un diff généré par l'IA" width="100%" /></picture>
</td>
</tr>
</table>

**Également inclus :** ouverture rapide des worktrees, fichiers, agents et commandes · glisser-déposer de fichiers et d'images directement dans le prompt d'un agent · suivi de l'utilisation et des réinitialisations de quotas par fournisseur, avec changement de compte sans nouvelle connexion · aperçus Markdown, image et PDF dans l'espace de travail · notifications et état « non lu » quand un agent a terminé ou attend une action · automatisation en ligne de commande.

## Conçu pour aller à l'essentiel

- **Des réglages recentrés.** OxeeUI se consacre aux agents, à git et au terminal. Pas de connexion cloud, de service de partage ni de marketplace de plugins à configurer.
- **Prêt à l'emploi.** Un nouveau profil s'ouvre avec l'apparence Oxeegen : thème sombre, Cascadia Code et Monokai.
- **Des icônes familières.** Les icônes de fichiers et de dossiers viennent de Material Icon Theme, le même jeu que VS Code, dans l'explorateur, les onglets, la recherche, le contrôle de source et les diffs.

## Développement

```bash
pnpm install
pnpm dev
```

Voir [CONTRIBUTING.md](../../.github/CONTRIBUTING.md) (en anglais) pour les vérifications, la création des installateurs et les releases.

## Licence

OxeeUI est un logiciel open source distribué sous [licence MIT](../../LICENSE).

Maintenu par [Oxeegen](https://oxeegen.com).
