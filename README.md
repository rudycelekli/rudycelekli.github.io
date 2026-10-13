# Rudy Celekli research identity

Canonical, static research profile for [Rudy Mizrahi Celekli](https://rudycelekli.github.io/).

The page is intentionally small and dependency-free. Its visible identity claims match the embedded Schema.org `Person` and `ProfilePage` data. Dynamic open-source metrics originate in the [GitHub profile evidence ledger](https://github.com/rudycelekli#open-source-impact-verified).

Every 30 minutes, the site synchronizes that ledger into model-readable Markdown and JSON:

- `llms.txt` and `llms-full.txt`
- `research.md` and `sources.md`
- `profile.json`
- `public-evidence.md` and `data/public-evidence.json`
- `activity.md`, `data/activity.json`, and `feed.xml`
- `brand.md`, `brand.json`, and `humans.txt`

These surfaces improve retrieval and citation hygiene. They do not promise placement in any model response or search index.

## Local check

```bash
python3 -m unittest discover -s tests -v
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
