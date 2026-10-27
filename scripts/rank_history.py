#!/usr/bin/env python3
"""Preserve observed Contributors API positions; never infer unobserved ranks."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess


def utc(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def empty_history():
    return {
        'schema_version': 1,
        'updated_at_utc': None,
        'methodology': {
            'rank': 'One-based position returned by GitHub Contributors API; lower is better. Null means unavailable, not zero.',
            'observation_time': 'Historical Git commit timestamp records when a snapshot was saved, not the exact instant GitHub rank changed. New refreshes use the time the source snapshot was saved/synced in UTC; this does not assert a fresh API collection.',
            'coverage': 'Only saved observations are shown. Missing repository entries are unknown. Consecutive equal ranks retain their first and latest observations.',
            'baseline': 'first_merged_at is the earliest authored merged pull request in the available accepted-activity receipts; it is not necessarily the first commit or contribution.',
            'top5': 'first_top5_at is the first saved rank 1–5. If the first known rank is already top five, top5_left_censored is true and exact climb duration is unknown.',
            'duration': 'days_to_top5 measures elapsed days from first_merged_at to first observed top-five snapshot only when a preceding known rank above five exists. It is an observed bound, not an exact crossing time.',
            'source': 'https://github.com/rudycelekli/rudycelekli.github.io/commits/main/data/public-evidence.json',
        },
        'repositories': [],
    }


def append_observation(observations, observation):
    if observations and observation['at'] < observations[-1]['at']:
        raise ValueError('Observations must be appended chronologically')
    if observations and observation['at'] == observations[-1]['at']:
        observations[-1] = observation
        return
    # Keep both ends of a constant run, and every rank/unknown transition.
    if len(observations) >= 2 and observations[-1]['rank'] == observations[-2]['rank'] == observation['rank']:
        observations[-1] = observation
    else:
        observations.append(observation)


def ingest(history, evidence, at, source_commit=None, source_repository='rudycelekli/rudycelekli.github.io'):
    at = utc(at)
    repos = {r['full_name']: r for r in history['repositories']}
    current = {r['full_name']: r for r in evidence.get('upstream_contributions', [])}
    for name in sorted(set(repos) | set(current)):
        source = current.get(name, {})
        repo = repos.setdefault(name, {
            'full_name': name, 'name': source.get('name', name.split('/')[-1]),
            'url': source.get('url', 'https://github.com/' + name),
            'first_merged_at': None, 'observations': [],
        })
        rank = source.get('contributor_rank')
        if not isinstance(rank, int) or isinstance(rank, bool) or rank < 1:
            rank = None
        append_observation(repo['observations'], {'at': at, 'rank': rank, 'source_commit': source_commit, 'source_repository': source_repository, 'source_updated_at': evidence.get('updated_at_utc')})
    for receipt in evidence.get('merged_pull_request_activity', []):
        name, merged = receipt.get('repository'), receipt.get('merged_at')
        if name in repos and merged:
            merged = utc(merged)
            old = repos[name].get('first_merged_at')
            if old is None or merged < old:
                repos[name]['first_merged_at'] = merged
    history['repositories'] = sorted(repos.values(), key=lambda r: r['full_name'].lower())
    history['updated_at_utc'] = at
    summarize(history)
    return history


def summarize(history):
    for repo in history['repositories']:
        observations = repo['observations']
        known = [o for o in observations if o['rank'] is not None]
        top = next((o for o in known if o['rank'] <= 5), None)
        repo['first_observed_at'] = observations[0]['at'] if observations else None
        repo['first_top5_at'] = top['at'] if top else None
        repo['top5_left_censored'] = bool(top and known[0]['rank'] <= 5)
        repo['days_to_top5'] = None
        baseline = repo.get('first_merged_at')
        if top and baseline and not repo['top5_left_censored'] and baseline <= top['at']:
            repo['days_to_top5'] = round((datetime.fromisoformat(top['at'].replace('Z', '+00:00')) - datetime.fromisoformat(baseline.replace('Z', '+00:00'))).total_seconds() / 86400, 2)


def write_history(history, output_dir):
    path = Path(output_dir) / 'rank-history.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(history, ensure_ascii=False, separators=(',', ':')) + '\n')
    return path


def update_history(evidence, output_dir):
    """Append one refresh, preserving historical observations and unknown values."""
    output_dir = Path(output_dir) / 'data'
    path = output_dir / 'rank-history.json'
    history = json.loads(path.read_text()) if path.exists() else empty_history()
    ingest(history, evidence, datetime.now(timezone.utc).isoformat())
    write_history(history, output_dir)
    return history


def backfill(root, profile_repo=None):
    """Read local snapshots; profile origin/main extends the site's earlier coverage."""
    root = Path(root)
    sources = [(root, 'HEAD', 'data/public-evidence.json', 'rudycelekli/rudycelekli.github.io')]
    if profile_repo:
        sources.append((Path(profile_repo), 'origin/main', 'data/contributions.json', 'rudycelekli/rudycelekli'))
    snapshots = []
    for directory, ref, path, repository in sources:
        rows = subprocess.check_output(['git', 'log', ref, '--format=%H%x09%cI', '--', path], cwd=directory, text=True).splitlines()
        for row in rows:
            sha, at = row.split('\t')
            snapshots.append((utc(at), sha, directory, path, repository))
    site_start = min(row[0] for row in snapshots if row[4].endswith('.github.io'))
    # Use one source per era so a delayed site copy cannot rewind a fresher profile rank.
    snapshots = sorted(row for row in snapshots if row[4].endswith('.github.io') or row[0] < site_start)
    history = empty_history()
    history['methodology']['history_sources'] = 'Profile origin/main snapshots extend coverage before the first website snapshot; website snapshots are authoritative thereafter, avoiding delayed copies being counted as new rank changes.'
    processes = {}
    try:
        for at, sha, directory, path, repository in snapshots:
            if directory not in processes:
                processes[directory] = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=directory, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
            process = processes[directory]
            process.stdin.write((sha + ':' + path + '\n').encode())
            process.stdin.flush()
            header = process.stdout.readline().decode().split()
            if len(header) != 3 or header[1] != 'blob':
                raise ValueError('Missing Git snapshot: ' + sha)
            content = process.stdout.read(int(header[2]))
            process.stdout.read(1)
            evidence = json.loads(content)
            if repository == 'rudycelekli/rudycelekli':
                evidence = {'upstream_contributions': evidence.get('repositories', []), 'merged_pull_request_activity': evidence.get('merged_pull_requests', []), 'updated_at_utc': evidence.get('updated_at_utc')}
            ingest(history, evidence, at, sha, repository)
    finally:
        for process in processes.values():
            process.stdin.close()
            process.stdout.close()
            process.wait()
    # Current activity contains historical accepted receipts absent from early snapshots.
    activity = root / 'data' / 'activity.json'
    if activity.exists():
        receipts = json.loads(activity.read_text()).get('items', [])
        repos = {r['full_name']: r for r in history['repositories']}
        for receipt in receipts:
            name, merged = receipt.get('repository'), receipt.get('merged_at')
            if name in repos and merged:
                merged = utc(merged)
                old = repos[name].get('first_merged_at')
                if old is None or merged < old:
                    repos[name]['first_merged_at'] = merged
        summarize(history)
    write_history(history, root / 'data')
    return history


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backfill', action='store_true', help='Rebuild from local Git snapshots')
    parser.add_argument('--profile-repo', type=Path, help='Local profile Git repository with fetched origin/main')
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    if not args.backfill:
        parser.error('--backfill is required; refreshes call update_history directly')
    result = backfill(args.root, args.profile_repo)
    print('Saved rank history for', len(result['repositories']), 'repositories')
