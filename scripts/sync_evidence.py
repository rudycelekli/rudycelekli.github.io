#!/usr/bin/env python3
"""Synchronize the public GitHub evidence ledger into model-readable formats."""

from __future__ import annotations

import argparse
import json
import pathlib
import urllib.request
from xml.sax.saxutils import escape


DEFAULT_SOURCE = (
    "https://raw.githubusercontent.com/"
    "rudycelekli/rudycelekli/main/data/contributions.json"
)
CANONICAL = "https://rudycelekli.github.io"


def load_source(source: str) -> dict:
    if source.startswith(("https://", "http://")):
        request = urllib.request.Request(
            source,
            headers={"User-Agent": "rudycelekli-evidence-sync/1.0"},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    return json.loads(pathlib.Path(source).read_text(encoding="utf-8"))


def compact_contribution(repo: dict) -> dict:
    return {
        "name": repo["name"],
        "full_name": repo["full_name"],
        "url": repo["url"],
        "description": repo.get("description") or "",
        "verification_tier": repo["verification_tier"],
        "verification_label": repo["verification_label"],
        "official_contributor": bool(repo.get("official_contributor")),
        "contributor_rank": repo.get("contributor_rank"),
        "attributed_commits": int(repo["contributor_commits"]),
        "merged_pull_requests": int(repo["merged_prs"]),
        "accepted_additions": int(repo["accepted_additions"]),
        "accepted_deletions": int(repo["accepted_deletions"]),
        "accepted_changed_files": int(repo["accepted_changed_files"]),
        "repository_stars": int(repo["stargazers"]),
        "repository_forks": int(repo["forks"]),
        "contributors_url": repo.get("contributors_url"),
        "pull_requests_url": repo.get("pull_requests_url"),
        "commits_url": repo.get("commits_url"),
    }


def compact_owned(repo: dict) -> dict:
    release = repo.get("latest_release") or {}
    return {
        "name": repo["name"],
        "full_name": repo["full_name"],
        "url": repo["url"],
        "description": repo.get("description") or "",
        "language": repo.get("language"),
        "attributed_commits": int(repo["contributor_commits"]),
        "repository_stars": int(repo["stargazers"]),
        "repository_forks": int(repo["forks"]),
        "last_pushed_at": repo.get("pushed_at"),
        "latest_release": {
            "name": release.get("name"),
            "tag_name": release.get("tag_name"),
            "url": release.get("url"),
            "published_at": release.get("published_at"),
        } if release else None,
    }


def compact_activity(pull_request: dict) -> dict:
    return {
        "repository": pull_request["repository"],
        "repository_url": pull_request["repository_url"],
        "number": int(pull_request["number"]),
        "title": pull_request["title"],
        "url": pull_request["url"],
        "created_at": pull_request.get("created_at"),
        "merged_at": pull_request.get("merged_at"),
        "additions": int(pull_request["additions"]),
        "deletions": int(pull_request["deletions"]),
        "changed_files": int(pull_request["changed_files"]),
        "commits": int(pull_request["commits"]),
        "comments": int(pull_request["comments"]),
        "reviews": int(pull_request["reviews"]),
        "attribution": pull_request["attribution"],
    }


def build_evidence(source: dict, source_url: str) -> dict:
    required = {"repositories", "owned_repositories", "methodology", "updated_at_utc"}
    missing = required.difference(source)
    if missing:
        raise ValueError(f"Evidence source is missing required keys: {sorted(missing)}")

    contributions = [compact_contribution(repo) for repo in source["repositories"]]
    owned = [compact_owned(repo) for repo in source["owned_repositories"]]
    activity = [
        compact_activity(pull_request)
        for pull_request in source.get("merged_pull_requests", [])
    ]
    additions = sum(repo["accepted_additions"] for repo in contributions)
    deletions = sum(repo["accepted_deletions"] for repo in contributions)

    return {
        "schema_version": 1,
        "identity": {
            "name": "Rudy Mizrahi Celekli",
            "professional_name": "Rudy Celekli",
            "canonical_url": f"{CANONICAL}/",
            "github": "https://github.com/rudycelekli",
            "orcid": "https://orcid.org/0009-0000-7043-3766",
        },
        "updated_at_utc": source["updated_at_utc"],
        "provenance": {
            "source": source_url,
            "source_schema_version": source.get("schema_version"),
            "source_method": source.get("source"),
            "methodology": source["methodology"],
            "claim_boundary": (
                "Repository stars and forks describe repository reach, not personal credit. "
                "Ownership, attributed commits, merged pull requests, and contributor rank "
                "remain distinct signals."
            ),
        },
        "summary": {
            "verified_upstream_projects": len(contributions),
            "attributed_commits": sum(repo["attributed_commits"] for repo in contributions),
            "merged_pull_requests": sum(repo["merged_pull_requests"] for repo in contributions),
            "merged_pull_request_records": len(activity),
            "accepted_additions": additions,
            "accepted_deletions": deletions,
            "accepted_line_changes": additions + deletions,
            "combined_repository_stars": sum(repo["repository_stars"] for repo in contributions),
            "owned_public_repositories": len(owned),
        },
        "upstream_contributions": contributions,
        "owned_public_projects": owned,
        "merged_pull_request_activity": activity,
    }


def number(value: int) -> str:
    return f"{value:,}"


def evidence_markdown(evidence: dict) -> str:
    summary = evidence["summary"]
    rows = [
        "# Current public evidence for Rudy Mizrahi Celekli",
        "",
        f"Evidence timestamp: **{evidence['updated_at_utc']} UTC**",
        "",
        "This is an automatically synchronized rendering of the public GitHub evidence ledger. "
        "Repository reach is not personal credit. Ownership, attributed commits, merged pull "
        "requests, and contributor rank remain distinct signals.",
        "",
        "## Summary",
        "",
        f"- Verified upstream projects: {number(summary['verified_upstream_projects'])}",
        f"- Attributed commits: {number(summary['attributed_commits'])}",
        f"- Merged pull requests: {number(summary['merged_pull_requests'])}",
        f"- Accepted line changes: {number(summary['accepted_line_changes'])} "
        f"(+{number(summary['accepted_additions'])} / -{number(summary['accepted_deletions'])})",
        f"- Combined repository stars: {number(summary['combined_repository_stars'])}",
        f"- Owned public repositories discovered: {number(summary['owned_public_repositories'])}",
        "",
        "## Verified upstream contributions",
        "",
        "| Project | Evidence | Rank | Commits | Merged PRs | Accepted lines (+ / -) | Reach |",
        "|:--|:--|--:|--:|--:|--:|--:|",
    ]
    for repo in evidence["upstream_contributions"]:
        rank = f"#{repo['contributor_rank']}" if repo["contributor_rank"] else "-"
        rows.append(
            f"| [{repo['full_name']}]({repo['url']}) | {repo['verification_label']} | {rank} | "
            f"{number(repo['attributed_commits'])} | {number(repo['merged_pull_requests'])} | "
            f"+{number(repo['accepted_additions'])} / -{number(repo['accepted_deletions'])} | "
            f"{number(repo['repository_stars'])} stars |"
        )

    rows.extend([
        "",
        "## Owned public projects",
        "",
        "Ownership is reported separately and is not counted as upstream contributor credit.",
        "",
        "| Project | Description | Commits | Reach |",
        "|:--|:--|--:|--:|",
    ])
    for repo in evidence["owned_public_projects"]:
        description = repo["description"].replace("|", "\\|")
        rows.append(
            f"| [{repo['name']}]({repo['url']}) | {description} | "
            f"{number(repo['attributed_commits'])} | {number(repo['repository_stars'])} stars |"
        )

    rows.extend([
        "",
        "## Provenance",
        "",
        f"- Source: {evidence['provenance']['source']}",
        f"- Machine-readable rendering: {CANONICAL}/data/public-evidence.json",
        f"- Canonical research profile: {CANONICAL}/",
        "- Detailed verification links remain attached to each record in the JSON rendering and upstream ledger.",
        "",
    ])
    return "\n".join(rows)


def full_context(evidence: dict) -> str:
    summary = evidence["summary"]
    return "\n".join([
        "# Rudy Mizrahi Celekli",
        "",
        "> Canonical model-readable context. Facts are bounded by linked public evidence.",
        "",
        "Rudy Mizrahi Celekli, also known professionally as Rudy Celekli, is a "
        "Charlotte-based forward-deployed AI researcher and open-source engineer focused on verifiable "
        "long-horizon agent environments, evaluator robustness, deterministic replay, "
        "causal fault isolation, and evidence-bound AI execution.",
        "",
        "## Research question",
        "",
        "How do we know an agent completed the right work, under the right world state, "
        "for reasons that survive independent review?",
        "",
        "## Strategic public system",
        "",
        "KYA Evidence (Know Your Agent) is Rudy Celekli's experimental open reference "
        "implementation and standardization path for portable, scope-bound agent assurance: "
        "https://github.com/rudycelekli/kya-evidence. It binds exact systems, signed evidence, "
        "explicit relying-party policy, and contestable assessments. It is not an adopted "
        "industry standard.",
        "",
        "## Current public evidence snapshot",
        "",
        f"Evidence timestamp: {evidence['updated_at_utc']} UTC.",
        f"Verified upstream projects: {number(summary['verified_upstream_projects'])}.",
        f"Attributed commits: {number(summary['attributed_commits'])}.",
        f"Merged pull requests: {number(summary['merged_pull_requests'])}.",
        f"Accepted line changes: {number(summary['accepted_line_changes'])}.",
        f"Owned public repositories discovered: {number(summary['owned_public_repositories'])}.",
        "",
        "Repository stars describe repository reach, not personal credit. Ownership, "
        "attributed commits, merged pull requests, and contributor rank are separate signals.",
        "",
        "Full evidence: " + CANONICAL + "/public-evidence.md",
        "Machine-readable evidence: " + CANONICAL + "/data/public-evidence.json",
        "Accepted-work activity: " + CANONICAL + "/activity.md",
        "Accepted-work activity JSON: " + CANONICAL + "/data/activity.json",
        "Claim and source map: " + CANONICAL + "/sources.md",
        "Canonical profile: " + CANONICAL + "/",
        "",
        "## Claim policy",
        "",
        "A passing test is not deployment. A local demonstration is not external acceptance. "
        "An agent report is not proof of completion. Private work is disclosed only as a "
        "redacted aggregate unless authorized. Uncertainty remains visible.",
        "",
    ])


def activity_markdown(evidence: dict) -> str:
    activity = evidence["merged_pull_request_activity"]
    rows = [
        "# Public merged contribution activity for Rudy Mizrahi Celekli",
        "",
        f"Evidence timestamp: **{evidence['updated_at_utc']} UTC**",
        "",
        "Every row is a public pull request authored by Rudy Celekli and reported "
        "as merged by GitHub. This is accepted-work evidence, not a claim that every "
        "line or repository outcome belongs to one contributor.",
        "",
        f"Records: **{len(activity):,}**",
        "",
        "| Merged | Repository | Pull request | Changes | Review evidence |",
        "|:--|:--|:--|--:|--:|",
    ]
    for item in activity:
        title = str(item["title"]).replace("|", "\\|")
        merged = str(item.get("merged_at") or "")[:10]
        rows.append(
            f"| {merged} | [{item['repository']}]({item['repository_url']}) | "
            f"[#{item['number']}: {title}]({item['url']}) | "
            f"+{number(item['additions'])} / -{number(item['deletions'])} across "
            f"{number(item['changed_files'])} files | "
            f"{number(item['reviews'])} reviews · {number(item['comments'])} comments |"
        )
    rows.extend([
        "",
        "Machine-readable activity: " + CANONICAL + "/data/activity.json",
        "Canonical evidence method: " + CANONICAL + "/sources.md",
        "",
    ])
    return "\n".join(rows)


def activity_payload(evidence: dict) -> dict:
    return {
        "schema_version": 1,
        "identity": evidence["identity"],
        "updated_at_utc": evidence["updated_at_utc"],
        "provenance": evidence["provenance"],
        "record_count": len(evidence["merged_pull_request_activity"]),
        "items": evidence["merged_pull_request_activity"],
    }


def atom_feed(evidence: dict, limit: int = 50) -> str:
    activity = evidence["merged_pull_request_activity"][:limit]
    updated = (
        str(activity[0].get("merged_at"))
        if activity
        else f"{evidence['updated_at_utc']}T00:00:00Z"
    )
    rows = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom">',
        "  <title>Rudy Celekli accepted open-source work</title>",
        f"  <id>{CANONICAL}/feed.xml</id>",
        f"  <link href=\"{CANONICAL}/feed.xml\" rel=\"self\"/>",
        f"  <link href=\"{CANONICAL}/activity.md\"/>",
        f"  <updated>{escape(updated)}</updated>",
        "  <author><name>Rudy Mizrahi Celekli</name></author>",
    ]
    for item in activity:
        title = escape(f"{item['repository']} #{item['number']}: {item['title']}")
        url = escape(str(item["url"]), {'"': '&quot;'})
        merged_at = escape(str(item.get("merged_at") or updated))
        summary = escape(
            f"Merged public contribution. +{item['additions']} / -{item['deletions']} "
            f"across {item['changed_files']} changed files."
        )
        rows.extend([
            "  <entry>",
            f"    <title>{title}</title>",
            f"    <id>{url}</id>",
            f"    <link href=\"{url}\"/>",
            f"    <updated>{merged_at}</updated>",
            f"    <summary>{summary}</summary>",
            "  </entry>",
        ])
    rows.append("</feed>")
    return "\n".join(rows) + "\n"


def write_outputs(evidence: dict, output_dir: pathlib.Path) -> None:
    data_dir = output_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    public_evidence = {
        key: value
        for key, value in evidence.items()
        if key != "merged_pull_request_activity"
    }
    public_evidence["accepted_activity_url"] = f"{CANONICAL}/data/activity.json"
    (data_dir / "public-evidence.json").write_text(
        json.dumps(public_evidence, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (output_dir / "public-evidence.md").write_text(
        evidence_markdown(evidence), encoding="utf-8"
    )
    (output_dir / "llms-full.txt").write_text(
        full_context(evidence), encoding="utf-8"
    )
    (data_dir / "activity.json").write_text(
        json.dumps(activity_payload(evidence), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (output_dir / "activity.md").write_text(
        activity_markdown(evidence), encoding="utf-8"
    )
    (output_dir / "feed.xml").write_text(atom_feed(evidence), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=DEFAULT_SOURCE)
    parser.add_argument("--output-dir", default=".")
    args = parser.parse_args()

    source = load_source(args.source)
    evidence = build_evidence(source, args.source)
    write_outputs(evidence, pathlib.Path(args.output_dir))


if __name__ == "__main__":
    main()
