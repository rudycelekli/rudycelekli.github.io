import copy
import importlib.util
import json
from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("sync_snapshot", ROOT / "scripts/sync_evidence.py")
SYNC = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SYNC)


class ParsedSnapshot(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = 0
        self.links = []
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.rows += tag == "tr" and "data-evidence-snapshot" in attrs
        if tag == "a":
            self.links.append(attrs.get("href"))
        self.scripts += tag == "script"


class ExplorerSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.template = (ROOT / "contributions.html").read_text()
        self.evidence = json.loads((ROOT / "data/public-evidence.json").read_text())

    def test_every_project_and_primary_evidence_link_is_readable_without_javascript(self):
        result = SYNC.explorer_snapshot(self.evidence, self.template)
        parsed = ParsedSnapshot()
        parsed.feed(result)
        self.assertEqual(parsed.rows, len(self.evidence["upstream_contributions"]))
        for row in self.evidence["upstream_contributions"]:
            self.assertIn(row["url"], parsed.links)
            self.assertIn(row["pull_requests_url"], parsed.links)
        self.assertNotIn("Loading verified public evidence", result)
        self.assertIn(self.evidence["updated_at_utc"], result)
        self.assertIn("not a worldwide impact ranking", result)

    def test_refresh_replaces_old_rows_and_preserves_editorial_context(self):
        original = SYNC.explorer_snapshot(self.evidence, self.template)
        updated = copy.deepcopy(self.evidence)
        updated["upstream_contributions"] = updated["upstream_contributions"][:1]
        updated["summary"]["verified_upstream_projects"] = 1
        result = SYNC.explorer_snapshot(updated, original)
        parsed = ParsedSnapshot()
        parsed.feed(result)
        self.assertEqual(parsed.rows, 1)
        self.assertIn('id="engineering-impact-title"', result)
        self.assertIn("Repository stars and forks describe the upstream project", result)
        self.assertEqual(SYNC.explorer_snapshot(updated, result), result)

    def test_untrusted_text_cannot_create_markup_and_unknown_rank_stays_unknown(self):
        data = copy.deepcopy(self.evidence)
        row = data["upstream_contributions"][0]
        row["name"] = '<script>alert("x")</script>'
        row["verification_label"] = '<img src=x onerror="bad()">'
        row["contributor_rank"] = None
        data["upstream_contributions"] = [row]
        result = SYNC.explorer_snapshot(data, self.template)
        parsed = ParsedSnapshot()
        parsed.feed(result)
        baseline = ParsedSnapshot()
        baseline.feed(self.template)
        self.assertEqual(parsed.scripts, baseline.scripts)
        self.assertIn("&lt;script&gt;", result)
        self.assertIn('<td data-label="API rank">—</td>', result)

    def test_unsafe_evidence_destination_fails_before_publication(self):
        for bad in ["javascript:alert(1)", "https://github.com.evil.test/a", "https://evil@github.com/a"]:
            with self.subTest(url=bad):
                data = copy.deepcopy(self.evidence)
                data["upstream_contributions"][0]["url"] = bad
                with self.assertRaises(ValueError):
                    SYNC.explorer_snapshot(data, self.template)

    def test_template_drift_fails_instead_of_silently_retaining_stale_evidence(self):
        for template in [self.template.replace('id="contribution-rows"', 'id="renamed"'),
                         self.template + '<tbody id="contribution-rows"></tbody>']:
            with self.assertRaises(ValueError):
                SYNC.explorer_snapshot(self.evidence, template)


if __name__ == "__main__":
    unittest.main()
