# ADR 0003 · Make the upstream chart explorable

## Context

The impact chart showed the distribution of accepted work but gave readers no way to identify a bar or get from the portfolio to the pull requests behind it. The portfolio opened with a generic role headline and placed the full name in small type.

## Decision

Lead with Rudy's name and put an interactive project readout directly under the chart. Use a native range input for keyboard and touch navigation and support pointing directly at the chart. Order projects by merged PRs, highlight the selected trace, and show counts and repository-specific ranks from the existing public ledger. Link to the selected repository's filtered merged PR listing. Turn the research progress markers into chapter links on desktop.

## Alternatives

Per-bar buttons would create more than a hundred tab stops and small targets on phones. A custom drag control would need its own focus and keyboard semantics. A native range input provides keyboard, pointer and touch operation with one tab stop.

## Consequences

The chart depends on the existing public JSON. The visible aggregate and ledger links remain available without JavaScript. The project name and counts are inserted as text. Motion preferences remain in effect.

## Validation

Passed 19 Python tests and 8 Node tests. Chrome verified seven viewport widths, live and invalid evidence feeds, keyboard and pointer selection, touch selection through both the chart and range input, reduced-motion mode, the no-JavaScript fallback, and publication navigation.
