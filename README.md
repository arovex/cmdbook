# 📖 CmdBook

**The cheat sheet that explains itself.**

Most cheat sheets are a wall of one-liners. CmdBook gives every command a plain-English description, a "when would I use this?" note, a safety level, and a full flag breakdown — then lets you paste *any* command into the explainer and see what each part does.

No frameworks. No backend. No tracking. Works offline.

![CmdBook preview](docs/preview.png)

## Features

- **Search that understands intent** — search by command, task, tag, or flag (`"delete folder"`, `chmod`, `docker`).
- **Explain this command** — paste `chmod -R 755 ./app` and get each token decoded, including octal permissions and pipelines.
- **Beginner / Pro modes** — beginners see the plain explanation; pro mode reveals flags, related commands, and edge cases.
- **Safety labels** — `safe`, `caution`, and `danger`, plus warnings for patterns like `rm -rf /`, `curl | sh`, and `git reset --hard`.
- **Offline-first PWA** — install it once, use it on a plane or in an air-gapped lab.
- **Data-driven** — every entry is a small JSON object. Adding a command is a pull request, not a code change.
- **Zero dependencies** — no npm install, no build step to run it. Python is only used to validate contributions.

## Quick start

```bash
git clone https://github.com/arovex/cmdbook.git
cd cmdbook
```

Then open `index.html` directly — data is bundled, so `file://` works.

For the PWA/service worker, serve it over HTTP:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Explain this command

The explainer tokenizes the input, looks up the program in `data/commands.json`, and resolves flags — including combined short flags like `-xzvf` and pipelines:

```
chmod -R 755 ./app
  chmod   Change file permissions.
  -R      apply recursively
  755     owner: read+write+execute · group: read+execute · other: read+execute
  ./app   path
```

## Adding a command

1. Pick the right file in `data/` (`linux.json`, `git.json`, `python.json`, `security.json`, `web.json`).
2. Add an entry:

```json
{
  "id": "tar-extract",
  "command": "tar -xzvf backup.tar.gz",
  "plain": "Extract a .tar.gz archive into the current folder.",
  "when": "You downloaded a .tar.gz and need the files inside.",
  "safety": "safe",
  "tags": ["files", "archives"],
  "flags": [
    { "flag": "-x", "meaning": "extract" },
    { "flag": "-z", "meaning": "decompress gzip" },
    { "flag": "-v", "meaning": "verbose" },
    { "flag": "-f", "meaning": "use the archive file that follows" }
  ],
  "related": ["find-name"]
}
```

3. Rebuild the bundle and validate:

```bash
python scripts/build_bundle.py
```

The script checks for missing fields, duplicate IDs, broken `related` links, and stale bundles. CI runs the same check with `--check` on every push and pull request.

### Rules of thumb for entries

- `plain` explains **what** it does; `when` explains **why** you'd reach for it.
- Mark anything destructive as `danger`, and anything that touches the network or permissions as `caution`.
- `related` must point to real entry IDs.
- Keep commands copy-pasteable. Prefer a safe example over a maximal one.

## Project structure

```
cmdbook/
├── index.html              # app shell
├── styles.css              # theme, layout, beginner/pro modes
├── app.js                  # search, cards, explainer, copy, theme
├── sw.js                   # offline cache
├── manifest.webmanifest    # PWA metadata
├── data/
│   ├── linux.json          # entries by topic
│   ├── git.json
│   ├── python.json
│   ├── security.json
│   ├── web.json
│   ├── commands.json       # program + flag dictionary for the explainer
│   └── bundle.js           # generated — do not edit
├── scripts/
│   └── build_bundle.py     # validate + generate bundle
└── .github/workflows/
    └── validate.yml        # CI check
```

## Deploy

The site is fully static. On GitHub:

1. **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main` · **Folder:** `/ (root)`

No build step is required in CI for deployment — `data/bundle.js` is committed. Just remember to run `python scripts/build_bundle.py` before pushing data changes.

## Why this exists

Beginners don't need more commands. They need to understand the ones they already copy from Stack Overflow. CmdBook is the reference I wished I had in first year: searchable, honest about danger, and willing to explain the flags instead of assuming you know them.

## License

[MIT](LICENSE) © 2026 arovex. Use it, remix it, add entries.
