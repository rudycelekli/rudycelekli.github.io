"""Render static repository case studies from the reviewed evidence manifest."""

import argparse
import html
import json
import pathlib
import re
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = pathlib.Path("data/engineering-case-studies.json")
CANONICAL = "https://rudycelekli.github.io"
SITEMAP_MARKER = "<!-- repository case studies -->"
AUTHOR = CANONICAL + "/#rudy"


def case_path(repo: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError(f"Invalid repository name {repo!r}")
    if set(repo.split("/")) & {".", ".."}:
        raise ValueError(f"Invalid repository name {repo!r}")
    return "/engineering/repositories/" + repo.lower() + ".html"


def case_links(root: pathlib.Path) -> dict:
    manifest = root / MANIFEST
    if not manifest.exists():
        return {}
    data = json.loads(manifest.read_text(encoding="utf-8"))
    return {repo: case_path(repo) for repo in data["repositories"]}


def render_page(repo: str, case: dict) -> str:
    escape = html.escape
    path = case_path(repo)
    url = CANONICAL + path
    name = repo.split("/")[1]
    headline = f"{name} · {case['title']}"
    title = f"{name} case study | Rudy Celekli"
    description = f"{case['title']}. A case study in Rudy Celekli’s engineering portfolio."
    kind = case["kind"]
    category = "Upstream contribution" if kind == "upstream" else "Owned public project"
    label = "Engineering response" if kind == "upstream" else "Design and implementation"
    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline,
        "description": description,
        "mainEntityOfPage": url,
        "publisher": {"@type": "Person", "@id": AUTHOR, "name": "Rudy Celekli"},
        "about": {"@type": "SoftwareSourceCode", "name": repo,
                  "codeRepository": "https://github.com/" + repo},
        "citation": [item["url"] for item in case["sources"]],
    }, ensure_ascii=False).replace("<", "\\u003c")
    sources = []
    for source in case["sources"]:
        parsed = urlparse(source["url"])
        if parsed.scheme != "https" or parsed.hostname not in {"github.com", "rudycelekli.github.io"}:
            raise ValueError(f"Unrecognized evidence origin for {repo}: {source['url']}")
        sources.append(f'<li><a href="{escape(source["url"])}">{escape(source["label"])}</a></li>')

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <link rel="canonical" href="{url}">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/cases.css">
  <script type="application/ld+json">{schema}</script>
</head>
<body>
  <header class="masthead">
    <a class="wordmark" href="/"><span class="wordmark-mark" aria-hidden="true">RC</span> Rudy Celekli</a>
    <nav class="masthead-nav" aria-label="Engineering navigation">
      <a href="/engineering/">Case studies</a>
      <a href="/contributions.html">Contributions</a>
    </nav>
  </header>
  <main class="repository-study">
    <article>
      <p class="eyebrow">{category} · <a href="https://github.com/{escape(repo)}">{escape(repo)}</a></p>
      <h1>{escape(headline)}</h1>
      <p class="study-author"><a href="/">Rudy Celekli’s engineering portfolio</a> · AI-assisted summary</p>
      <h2>Problem</h2>
      <p>{escape(case['problem'])}</p>
      <h2>{label}</h2>
      <p>{escape(case['change'])}</p>
      <h2>Evidence and scope</h2>
      <p>{escape(case['validation'])}</p>
      <ul>{''.join(sources)}</ul>
    </article>
    <footer><a href="/engineering/#repository-studies">Browse all repository case studies</a></footer>
  </main>
</body>
</html>
"""


def render_directory(cases: dict) -> str:
    entries = []
    for kind, title in (("upstream", "Upstream contributions"), ("owned", "Owned public projects")):
        links = []
        for repo, case in sorted(cases.items(), key=lambda item: item[0].split("/")[1].lower()):
            if case["kind"] == kind:
                links.append(
                    f'<li><a href="{case_path(repo)}">{html.escape(repo)}</a>'
                    f' <span>{html.escape(case["title"])}</span></li>'
                )
        entries.append(f'<h3>{title}</h3>\n<ul class="study-list">\n' + "\n".join(links) + "\n</ul>")
    return (
        '<section class="case-card" id="repository-studies" aria-labelledby="repository-studies-title">\n'
        '<h2 id="repository-studies-title">Case studies by repository</h2>\n'
        '<p>One public case study per repository in the reviewed snapshot. '
        'Upstream entries link to public changes and review records. Owned projects link to pinned public revisions.</p>\n'
        + "\n".join(entries) + "\n</section>"
    )


def render(root: pathlib.Path, check: bool) -> None:
    data = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    cases = data["repositories"]
    urls = [case_path(repo) for repo in cases]
    if len(urls) != len(set(urls)):
        raise ValueError("Two case studies share a URL")

    def save(path: str, content: str) -> None:
        target = root / path
        if check:
            if not target.exists() or target.read_text(encoding="utf-8") != content:
                raise ValueError(f"Missing or outdated generated file: {path}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")

    for repo, case in cases.items():
        save(case_path(repo).lstrip("/"), render_page(repo, case))

    index_path = "engineering/index.html"
    index = (root / index_path).read_text(encoding="utf-8")
    start = "<!-- repository directory -->"
    end = "<!-- end repository directory -->"
    before, rest = index.split(start, 1)
    _, after = rest.split(end, 1)
    save(index_path, before + start + "\n" + render_directory(cases) + "\n" + end + after)

    from sync_evidence import explorer_snapshot

    ledger_path = "contributions.html"
    ledger = (root / ledger_path).read_text(encoding="utf-8")
    evidence = json.loads((root / "data/public-evidence.json").read_text(encoding="utf-8"))
    save(ledger_path, explorer_snapshot(evidence, ledger, case_links(root)))

    sitemap = (root / "sitemap.xml").read_text(encoding="utf-8")
    before, _ = sitemap.split(SITEMAP_MARKER, 1)
    entries = "\n".join(f"  <url><loc>{CANONICAL}{url}</loc></url>" for url in sorted(urls))
    save("sitemap.xml", before + SITEMAP_MARKER + "\n" + entries + "\n</urlset>\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    render(ROOT, args.check)
