import sys
from pathlib import Path
import unittest
import tempfile
import json
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from rank_history import empty_history, ingest, update_history


def evidence(rank):
    return {'upstream_contributions': [{'full_name': 'org/repo', 'contributor_rank': rank}], 'merged_pull_request_activity': [{'repository': 'org/repo', 'merged_at': '2026-01-01T00:00:00Z'}]}


class HistoryTests(unittest.TestCase):
    def test_refresh_writes_site_data_and_provenance(self):
        with tempfile.TemporaryDirectory() as root:
            result = update_history(evidence(8), root)
            path = Path(root) / 'data' / 'rank-history.json'
            self.assertTrue(path.is_file())
            self.assertFalse((Path(root) / 'rank-history.json').exists())
            observation = json.loads(path.read_text())['repositories'][0]['observations'][0]
            self.assertEqual(observation['source_repository'], 'rudycelekli/rudycelekli.github.io')
            self.assertIsNone(observation['source_commit'])
            self.assertEqual(result['repositories'][0]['observations'][0], observation)

    def test_profile_source_is_preserved(self):
        history = ingest(empty_history(), evidence(9), '2026-01-02T00:00:00Z', 'abc', 'rudycelekli/rudycelekli')
        observation = history['repositories'][0]['observations'][0]
        self.assertEqual(observation['source_repository'], 'rudycelekli/rudycelekli')
        self.assertEqual(observation['source_commit'], 'abc')

    def test_observed_crossing_and_bounds(self):
        history = empty_history()
        ingest(history, evidence(9), '2026-01-02T00:00:00Z', 'a')
        ingest(history, evidence(4), '2026-01-04T00:00:00Z', 'b')
        repo = history['repositories'][0]
        self.assertEqual(repo['days_to_top5'], 3)
        self.assertFalse(repo['top5_left_censored'])
        self.assertEqual(repo['observations'][1]['source_commit'], 'b')

    def test_left_censored_has_no_exact_duration(self):
        history = ingest(empty_history(), evidence(2), '2026-01-04T00:00:00Z')
        repo = history['repositories'][0]
        self.assertTrue(repo['top5_left_censored'])
        self.assertIsNone(repo['days_to_top5'])

    def test_unknown_gap_and_missing_repo(self):
        history = ingest(empty_history(), evidence(9), '2026-01-02T00:00:00Z')
        ingest(history, {}, '2026-01-03T00:00:00Z')
        ingest(history, evidence(4), '2026-01-04T00:00:00Z')
        self.assertEqual([o['rank'] for o in history['repositories'][0]['observations']], [9, None, 4])

    def test_constant_runs_keep_endpoints_and_timezone(self):
        history = empty_history()
        for day in range(2, 6):
            ingest(history, evidence(9), f'2026-01-0{day}T00:00:00-04:00')
        obs = history['repositories'][0]['observations']
        self.assertEqual(len(obs), 2)
        self.assertEqual(obs[0]['at'], '2026-01-02T04:00:00Z')
        self.assertEqual(obs[-1]['at'], '2026-01-05T04:00:00Z')
        ingest(history, evidence(True), '2026-01-06T00:00:00Z')
        self.assertIsNone(history['repositories'][0]['observations'][-1]['rank'])


if __name__ == '__main__':
    unittest.main()
