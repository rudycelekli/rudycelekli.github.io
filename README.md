# Rudy Celekli research identity

Canonical, static research profile for [Rudy Mizrahi Celekli](https://rudycelekli.github.io/).

The page is intentionally small and dependency-free. Its visible identity claims match the embedded Schema.org `Person` and `ProfilePage` data. Dynamic open-source metrics originate in the [GitHub profile evidence ledger](https://github.com/rudycelekli#open-source-impact-verified).

Static identity and navigation surfaces include `llms.txt`, `research.md`,
`sources.md`, `profile.json`, `brand.md`, `brand.json`, and `humans.txt`.

Every 30 minutes, the evidence workflow regenerates `llms-full.txt`,
`public-evidence.md`, `data/public-evidence.json`, `activity.md`,
`data/activity.json`, and `feed.xml` from the contribution ledger, and updates
recorded rank history. Stable case-study navigation is retained by the generator.

These surfaces improve retrieval and citation hygiene. They do not promise placement in any model response or search index.

## Local check

```bash
python3 -m unittest discover -s tests -v
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

### Contributor rank history

`contributions.html` displays recorded Contributors API ranks and observed top-five
milestones from `data/rank-history.json`. The existing 30-minute evidence sync
appends the current ledger snapshot through `scripts/rank_history.py`.

Rebuild archived history from full local Git histories:

```sh
python3 scripts/rank_history.py --backfill --profile-repo /path/to/rudycelekli
python3 -m unittest discover -s tests -v
node --test tests/rank-chart.test.cjs
```

Keep the source repository histories available for reproducibility. Each retained
observation links to its source commit. Unknown ranks remain null; constant runs
retain endpoints, and rank transitions retain their observations. Historical
commit time is a saved-snapshot time, not the exact time a rank changed. Elapsed
time uses the earliest merged PR in available receipts, not an assumed first
contribution. A history starting in the top five has no measured climb duration.

### Runnable engineering evidence

The Git physical-line case study includes a small offline ZIP with immutable
upstream source snapshots, license notices, a pinned dependency and a replay.
The GitHub workflow verifies the exact published ZIP and runs its integrity and
mutation guards in a fresh directory. This checks known regression cases; it
is not full application/provider integration or a general engineering ranking.

With Python 3.10 or later:

```sh
python3 scripts/check_reproduction_bundle.py
```
