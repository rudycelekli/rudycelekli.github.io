# Contributor rank history

The chart uses saved public GitHub Contributors API ordering. It does not
reconstruct ranks from merged PR volume, current stars, or current commit totals.

The initial backfill covers September 27 through October 27, 2026. Profile Git
snapshots extend the period before the website first saved its public evidence
ledger on October 13. Website snapshots supply the subsequent observations.
Each retained point records its source repository, commit, source date, and saved
time. Commits date saved snapshots, not exact rank changes. Constant runs retain
endpoints; missing ranks remain gaps. Early schemas without ranks stay unknown.

The milestone table sorts measurable intervals first, shortest first. Its baseline
is the earliest authored merged PR found in accepted-work receipts. This may
postdate an earlier contribution. Its endpoint is the first saved top-five rank.
Only histories with a prior recorded rank greater than five receive an interval.
A first numeric observation already in the top five cannot establish climb time.
Solid chart connectors guide the eye between saved observations without asserting
intermediate ranks. Every path explicitly sets fill="none" to prevent SVG’s
black fill default when an external stylesheet is cached or unavailable. Historical repositories remain available if a later ledger
omits them; omission records an unavailable rank.

The existing evidence-sync workflow appends snapshots on its configured
30-minute schedule after this change is published. A sync timestamp means the
source ledger was saved, not that GitHub was freshly queried at that instant.

Validation before publication: 13 Python unit tests; full sync CLI in an isolated
output directory preserving all 80 histories; JavaScript syntax check; desktop
and 390-pixel browser inspection; individual, all-repository, unavailable-rank,
and source-link interactions; no browser console errors in those flows.


The default comparison includes only repositories whose latest recorded numeric
rank is 1–5. Six series are shown per page, ordered by improvement from the first
numeric rank to the current rank. All qualifying repositories remain reachable
through pagination. Colors identify series within the displayed group. Numbered
points retain original API ranks, including ties. End labels use leader lines to
avoid overlap without moving data points. A legend exposes full repository names
and opens the individual history. Unknown latest ranks do not qualify as top five.

When the displayed history includes a rank greater than ten, the vertical axis
uses logarithmic spacing, disclosed on the chart, to keep top-five movement
legible alongside early ranks such as #103. Smaller ranges use linear spacing.
The chart keeps a readable minimum width and scrolls horizontally on mobile.

Additional verification: seven Node regression tests cover latest-rank filtering,
complete pagination, explicit unfilled SVG paths without CSS, unknown gaps, tied
rank coordinates, log-axis disclosure, empty series and escaped names. These tests
also run in the hosted evidence-refresh workflow.
