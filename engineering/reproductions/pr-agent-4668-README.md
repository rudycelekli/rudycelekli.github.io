# Reproduce PR-Agent #4668’s physical-line reconstruction fix

This small evidence pack freshly replays the reverse-reconstruction behavior described in [Rudy Celekli’s engineering case study](https://rudycelekli.github.io/engineering/git-physical-line-boundaries.html). It is an **isolated function replay**, not the complete upstream test suite or a live provider integration.

## Source selection

The [merged PR](https://github.com/The-PR-Agent/pr-agent/pull/4668) is authored by `rudycelekli`. GitHub’s current commit metadata identifies candidate `d8fcf7772cd531a36bdabebf145b819949d111ce` and its sole parent, baseline `d92765fc0e5bb2488b153947ef63e0da29fcffcc`. Both source snapshots and their complete MIT licenses are retained under `sources/`. Immutable raw GitHub URLs and complete file SHA256 values are recorded in `manifest.json`; `source-provenance.json` retains the selected commit metadata and inspected parent relationship.

The runner loads the unmodified AST definitions of `split_diff_lines`, `reconstruct_base_file_checked`, and `reconstruct_base_file`. The cases invoke `reconstruct_base_file_checked`, which calls the splitter; the wrapper definition is compiled but is not separately invoked. It does not import the entire PR-Agent package. It injects the exact upstream-pinned `unidiff==1.0.1` dependency’s `PatchSet` and `UnidiffParseError`, plus a standard-library logging adapter through `get_logger`. The dependency is imported directly from its hash-verified PyPI wheel, without installing global packages.

The source manifest’s SHA256 is pinned inside the runner. A changed source file, commit label in the manifest, or dependency wheel is rejected before the extracted functions execute. This is auditable source binding, not an independent signature or proof that every upstream behavior is correct.

## Run

Use Python 3.10 or later. The retained replay used Python **3.12.12**; run `python3 --version` to confirm your interpreter meets the requirement:

```sh
python3 run_reconstruction.py --fetch
python3 -m unittest -v test_evidence_guards.py
```

`--fetch` downloads **missing** immutable sources and the pinned wheel from the exact URLs in the manifest. Existing files with incorrect hashes are rejected, never silently overwritten. Once sources and wheel are present, omit `--fetch` for an offline replay:

```sh
python3 run_reconstruction.py
```

No API key, model call, repository checkout, application configuration, provider account or full-package installation is required. Network access is needed only to fetch missing recorded files. The wheel is 18,733 bytes; the complete pack is small.

## What the ground truth checks

Eleven regression cases, following the public upstream fix, cover seven non-LF separators inside context/source lines, a separator before a later hunk, repeated trailing carriage returns, an ordinary-LF positive control, and rejection of a mismatched head file. Expected complete base strings are literals in the runner, not computed by the implementation or its text splitter.

The captured replay finds:

| Variant | Ground-truth matches | Defect cases rejected by the evaluator |
| --- | ---: | ---: |
| Parent baseline | 2/11 | 9 |
| Merged candidate | 11/11 | 0 |
| Candidate with old `splitlines()` expression reintroduced | 2/11 | 9 |
| Candidate with old trailing-CR stripping reintroduced | 10/11 | 1 |

The mutants intentionally alter exactly one expression each. The normal candidate function bodies remain unmodified. Five harness guard tests additionally check the complete replay and fail-closed rejection of changed source, altered manifest commit labels and a corrupted dependency wheel. An optimized-Python (`-O`) guard test also deliberately supplies a wrong oracle and confirms the evaluator fails without emitting a success receipt. The runner uses explicit failure checks rather than optimization-sensitive `assert` statements.

`reproduction-receipt.json` records actual and expected outputs per case, interpreter/dependency versions, exact source revisions, manifest/runner hashes and limitations. It is a newly captured result, not a restatement of historical upstream CI.

## Limits

These are known development/regression cases, **not a protected holdout**. Expected output literals are independent of the reconstruction implementation, but the cases are selected to reproduce a disclosed fix. This checks reverse reconstruction only. It does **not** execute the sibling MOSAICO supplied-diff parser, full upstream package imports/configuration, all historical tests, live provider APIs, released packages, production traffic or customer acceptance. It does not establish a ranking, unaided authorship, commercial impact or visibility in an AI recommendation. The cited upstream PR and commit records carry the attribution and assistance history.

Upstream source remains under its recorded MIT license. The retained dependency wheel includes its own MIT LICENSE and AUTHORS files. Preserve these notices when redistributing the pack.
