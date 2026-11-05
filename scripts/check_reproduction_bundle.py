#!/usr/bin/env python3
"""Verify and replay the published evidence ZIP, offline in a fresh directory."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, help='Override input for integrity checks')
    args = parser.parse_args()
    lock = json.loads((ROOT / 'docs/engineering-reproduction-lock.json').read_text())
    bundle = args.bundle or ROOT / lock['bundle']
    raw = bundle.read_bytes()
    if len(raw) != lock['bytes'] or hashlib.sha256(raw).hexdigest() != lock['sha256']:
        raise ValueError('Published ZIP size/hash mismatch')
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory)
        with zipfile.ZipFile(bundle) as archive:
            members = archive.infolist()
            if len(members) != lock['members'] or sum(m.file_size for m in members) > 10_000_000:
                raise ValueError('Unexpected ZIP member count or expanded size')
            for member in members:
                path = PurePosixPath(member.filename)
                if (path.is_absolute() or '..' in path.parts or '\\' in member.filename
                        or stat.S_ISLNK(member.external_attr >> 16)):
                    raise ValueError('Unsafe ZIP member')
            archive.extractall(target)
        subprocess.run([sys.executable, 'run_reconstruction.py'], cwd=target, check=True)
        subprocess.run([sys.executable, '-m', 'unittest', '-v', 'test_evidence_guards.py'],
                       cwd=target, check=True)
        receipt = json.loads((target / 'reproduction-receipt.json').read_text())
        if receipt['baseline'] != lock['baseline'] or receipt['candidate'] != lock['candidate']:
            raise ValueError('Replay source revisions differ from publication lock')
        if receipt['exercised_entrypoint'] != 'reconstruct_base_file_checked':
            raise ValueError('Unexpected exercised entrypoint')
        print(json.dumps({'bundle_sha256': lock['sha256'], 'python': receipt['python'],
                          'status': receipt['status'], 'cases_per_variant': receipt['cases_per_variant'],
                          'scope': lock['scope']}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print(f'FAIL CLOSED: {error}', file=sys.stderr)
        sys.exit(2)
