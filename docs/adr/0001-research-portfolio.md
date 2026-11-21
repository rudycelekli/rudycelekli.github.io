# ADR 0001 · Make the homepage a research portfolio

## Context

The existing GitHub Pages homepage preserves public identity and contribution evidence, but its opening does not show a research result. Its résumé and collection of publication artifacts are spread across external pages and documents.

## Decision

Keep the canonical homepage and present a measured Gradia result first, followed by publication records, upstream evidence, software, and a career timeline. Use the November 19 research-engineer résumé as a source for the career and technical summaries. Link publication claims to versioned public records. Keep the résumé printable from the browser and use the public GitHub portrait.

Render the page as plain HTML. Use progressive enhancement for the scroll position, sticky study captions, printing, and recent contribution counts. Use the existing published evidence JSON and a dated HTML fallback. Keep existing metadata, evidence routes, and refresh workflows available.

## Alternatives

A full PDF embed would preserve the original résumé layout but perform poorly on a phone and expose contact details and account-specific work beyond the portfolio narrative. A single-page framework could manage the scroll state but would add build dependencies and reduce the site's independence from JavaScript.

## Consequences

The portfolio remains deployable on the existing static host. Editors maintain the publication summaries and initial evidence snapshot in HTML. The established refresh job supplies newer metrics to visitors with JavaScript enabled. The résumé PDF created from the print view is a public-facing adaptation.

## Validation

Passed 19 Python tests and 8 Node tests. Verified the existing offline engineering replay with Python 3.12. Chrome verified seven viewport widths from 320 to 1440 pixels, section navigation, research scroll states, local evidence routes, JavaScript-disabled content, valid and invalid evidence refreshes, and the print control. The résumé rendered to one page and was visually reviewed.
