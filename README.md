# Rudy Celekli research identity

Canonical, static research profile for [Rudy Mizrahi Celekli](https://rudycelekli.github.io/).

The page is intentionally small and dependency-free. Its visible identity claims match the embedded Schema.org `Person` and `ProfilePage` data. Dynamic open-source metrics live in the [GitHub profile evidence ledger](https://github.com/rudycelekli#open-source-impact-verified), where they can be refreshed and audited without hard-coding a stale snapshot here.

## Local check

```bash
python3 -m unittest discover -s tests -v
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
