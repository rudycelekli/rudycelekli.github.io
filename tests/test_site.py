import json
import pathlib
import unittest
from html.parser import HTMLParser


ROOT = pathlib.Path(__file__).resolve().parents[1]


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.description = None
        self.json_ld = []
        self._in_json_ld = False
        self._json_chunks = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href")
        if tag == "meta" and values.get("name") == "description":
            self.description = values.get("content")
        if tag == "script" and values.get("type") == "application/ld+json":
            self._in_json_ld = True
            self._json_chunks = []

    def handle_data(self, data):
        if self._in_json_ld:
            self._json_chunks.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._in_json_ld:
            self.json_ld.append(json.loads("".join(self._json_chunks)))
            self._in_json_ld = False


class ResearchProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.parser = SiteParser()
        cls.parser.feed(cls.html)

    def test_canonical_url(self):
        self.assertEqual(self.parser.canonical, "https://rudycelekli.github.io/")

    def test_description_is_specific(self):
        self.assertIn("verifiable long-horizon agents", self.parser.description)
        self.assertLessEqual(len(self.parser.description), 180)

    def test_person_structured_data_matches_visible_identity(self):
        graph = self.parser.json_ld[0]["@graph"]
        person = next(item for item in graph if item["@type"] == "Person")
        self.assertEqual(person["name"], "Rudy Mizrahi Celekli")
        self.assertIn(person["name"], self.html)
        self.assertIn("https://github.com/rudycelekli", person["sameAs"])
        self.assertIn("https://orcid.org/0009-0000-7043-3766", person["sameAs"])

    def test_crawler_files_exist(self):
        self.assertTrue((ROOT / "robots.txt").is_file())
        self.assertTrue((ROOT / "sitemap.xml").is_file())
        robots = (ROOT / "robots.txt").read_text()
        for crawler in (
            "OAI-SearchBot",
            "ChatGPT-User",
            "Claude-SearchBot",
            "Claude-User",
            "PerplexityBot",
            "Perplexity-User",
        ):
            self.assertIn(crawler, robots)

    def test_model_readable_surfaces_exist(self):
        for path in (
            "llms.txt",
            "llms-full.txt",
            "research.md",
            "sources.md",
            "profile.json",
            "public-evidence.md",
            "data/public-evidence.json",
            "activity.md",
            "data/activity.json",
            "feed.xml",
            "brand.md",
            "brand.json",
            "humans.txt",
            "CITATION.cff",
        ):
            self.assertTrue((ROOT / path).is_file(), path)

        profile = json.loads((ROOT / "profile.json").read_text())
        self.assertEqual(profile["name"], "Rudy Mizrahi Celekli")

        evidence = json.loads((ROOT / "data/public-evidence.json").read_text())
        self.assertGreater(evidence["summary"]["verified_upstream_projects"], 0)
        self.assertEqual(
            evidence["summary"]["verified_upstream_projects"],
            len(evidence["upstream_contributions"]),
        )

        activity = json.loads((ROOT / "data/activity.json").read_text())
        self.assertEqual(activity["record_count"], len(activity["items"]))
        self.assertGreater(activity["record_count"], 0)
        evidence = json.loads((ROOT / "data/public-evidence.json").read_text())
        self.assertEqual(
            activity["record_count"],
            evidence["summary"]["merged_pull_request_records"],
        )

    def test_required_local_assets_exist(self):
        for path in ("assets/site.css", "assets/mark.svg"):
            self.assertTrue((ROOT / path).is_file(), path)


if __name__ == "__main__":
    unittest.main()
