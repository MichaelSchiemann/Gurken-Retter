# GitHub-Pages-Workflow

Dieser Workflow ist für die statischen iPhone/PWA-Spiele in diesem Repository optimiert:

- Gurken-Retter: `/`
- Punktjäger: `/pacman/`
- Blockstapler: `/tetris/`
- Gurken-Breaker: `/breakout/`

## Ziel

Vor jedem Push soll geprüft werden, dass GitHub Pages nicht durch typische PWA-Fehler kaputtgeht:

- `index.html` vorhanden
- `manifest.webmanifest` gültiges JSON
- `service-worker.js` syntaktisch gültig
- wichtige Icons vorhanden
- Inline-JavaScript syntaktisch gültig
- lokaler HTTP-Server liefert die wichtigsten Routen mit `200 OK`
- `.nojekyll` ist vorhanden

## Lokaler Standardablauf

Vor jedem Deployment:

```bash
cd /opt/data/gurken-retter-github-pages
npm run check
python3 -m http.server 8000
```

Dann lokal öffnen:

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/pacman/
http://127.0.0.1:8000/tetris/
http://127.0.0.1:8000/breakout/
```

## Deployment

Das Repository nutzt weiterhin GitHub Pages. Für dieses Projekt ist wichtig:

- `.nojekyll` bleibt im Repo-Root.
- Bei PWA-/Service-Worker-Änderungen den jeweiligen Cache-Namen erhöhen.
- Nach Push auf `main` zusätzlich `main:gh-pages` pushen, falls Pages über den `gh-pages` Branch ausgeliefert wird.

Mit dem vorhandenen Deploy-Key in dieser Hermes-Umgebung:

```bash
GIT_SSH_COMMAND='ssh -i /opt/data/.ssh/gurken_retter_deploy_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' git push origin main
GIT_SSH_COMMAND='ssh -i /opt/data/.ssh/gurken_retter_deploy_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' git push origin main:gh-pages
```

## GitHub Actions

Der Workflow `.github/workflows/pages-smoke.yml` läuft bei:

- Push auf `main`
- Push auf `gh-pages`
- Pull Requests gegen `main`
- manuellem Start über `workflow_dispatch`

Er führt aus:

```bash
npm run check
python3 -m http.server 8000
curl -I ...
```

## Live-Verifikation

Nach dem Deployment prüfen:

```bash
curl -I 'https://michaelschiemann.github.io/Gurken-Retter/?v=TIMESTAMP'
curl -I 'https://michaelschiemann.github.io/Gurken-Retter/pacman/?v=TIMESTAMP'
curl -I 'https://michaelschiemann.github.io/Gurken-Retter/tetris/?v=TIMESTAMP'
curl -I 'https://michaelschiemann.github.io/Gurken-Retter/breakout/?v=TIMESTAMP'
```

Bei iPhone/Safari-Cache-Problemen:

1. URL mit neuem Query-Parameter öffnen, z. B. `?v=2`.
2. Safari komplett schließen und neu öffnen.
3. Bei installierter PWA ggf. vom Home-Bildschirm entfernen und neu hinzufügen.

## Checkliste für neue Spiel-Iterationen

- [ ] Kleine Änderung machen
- [ ] Service-Worker-Cache-Namen erhöhen, falls gecachte Dateien geändert wurden
- [ ] `npm run check`
- [ ] lokaler HTTP-Test
- [ ] Commit mit klarer Nachricht
- [ ] Push auf `main`
- [ ] Push auf `gh-pages`, falls nötig
- [ ] Live-URL mit Cache-Buster prüfen
