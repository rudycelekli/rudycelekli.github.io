# Static contribution evidence with progressive enhancement

Status: Implemented
Date: 2026-11-04

## Context
The explorer’s ledger and totals required JavaScript and a second request, even though the synchronized evidence was already available during publication. Selected case examples alone did not expose the full ledger without scripting.

## Decision
Render every contribution row, totals and evidence date into the existing HTML during evidence sync. Preserve editorial content and source links. Keep the existing client-side balanced-view calculation, sorting and filtering as progressive enhancement. The server-rendered score uses the same disclosed formula; it is not a worldwide contributor ranking. Unknown rank remains unknown.

If live refresh fails, retain the dated snapshot, explain the failed refresh and disable controls. Escape source text, restrict evidence destinations to HTTPS github.com, and fail the sync if required template targets are missing or duplicated. Include the HTML in the existing sync commit.

## Alternatives and consequences
A new rendering framework is unnecessary for this static site. Markdown-only fallback remains useful but requires readers and crawlers to follow another URL. Static HTML increases page size and duplicates the score calculation, so real-browser parity must be checked when its formula changes. Evidence timestamps prevent the snapshot being mistaken for a fresh fetch. Serving HTML does not prove indexing, ranking, citations or downstream impact.

## Validation
19 Python checks and 8 existing Node checks pass. A real-browser HTTP503 test retains100 rows and disables controls. Normal refresh renders100 rows, with all100 scores matching the static snapshot; filtering for ghidra returns its one expected row. A deliberate no-op renderer is rejected by the new regression suite. Live publication verification is recorded separately in the campaign receipt.
