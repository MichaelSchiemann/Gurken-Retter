# Gurken-Retter 🥒

Ein kleines iPhone-taugliches Browser-Spiel als GitHub-Pages-Web-App.

## Direkt veröffentlichen mit GitHub Pages

1. Auf GitHub ein neues öffentliches Repository erstellen, z. B. `gurken-retter`.
2. Alle Dateien aus diesem Ordner in das Repository hochladen. Wichtig: `index.html` muss direkt im Hauptordner liegen.
3. In GitHub öffnen: **Settings → Pages**.
4. Unter **Build and deployment** auswählen:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/root**
5. Speichern.
6. Nach kurzer Zeit ist das Spiel erreichbar unter:
   `https://DEIN-NAME.github.io/gurken-retter/`

## iPhone-Installation

1. Den GitHub-Pages-Link in Safari öffnen.
2. Teilen-Symbol antippen.
3. **Zum Home-Bildschirm** wählen.
4. Danach startet Gurken-Retter wie eine kleine App.

## Lokaler Test

```bash
python3 -m http.server 8000
```

Dann öffnen:

```text
http://localhost:8000
```
