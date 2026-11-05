# 0002: Reduce discovery hops without claiming an indexing fix

Accepted: November 4, 2026.

Google owner inspection reports six evidence URLs unknown; Bing reports five engineering URLs discovered but not crawled and the ledger undiscovered. Both engines index the homepage. All inspected public URLs return HTTP 200 with self canonicals and no noindex. Google sitemap processing still reports it could not read the sitemap despite successful live fetch; its root cause is not exposed.

Add standard direct homepage anchors to all four case studies. Correct the ledger sitemap lastmod from October 15 to November 4, the date of substantial static-content changes. This is a significant-content date, not every periodic evidence poll. Shorten three case title tags and the ledger description while preserving content and citations. No keyword stuffing, generated ranking claims, duplicated landing pages, or crawler-specific content.

Validate the existing Python and Node checks, inspect the HTML graph and metadata, and compare served bytes after Pages publication. These establish the intended content, not search indexing or recommendation uplift. Keep all verification files and existing robots permissions. No Gradia or backend change. Measure consumer systems only after a future owner-console check confirms the six evidence URLs indexed in both engines, preserving the frozen prompts and missing outcomes.

Sources: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap ; https://www.bing.com/webmaster/help/webmaster-guidelines-30fba23a .
