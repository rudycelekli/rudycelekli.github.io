# Contributor rank history

The chart uses saved public GitHub Contributors API ordering. It does not infer
ranks from merged PR volume, current stars, or current commit totals.

A repository appears if **any saved observation contains an integer rank from
1 through 10, inclusive**. Its full recorded history stays visible if its latest
rank rises above ten or becomes unavailable. All qualifying repositories render
in one chart, with no selector, pagination, or single-repository view. The legend
shows the best recorded rank and the latest recorded state. An unavailable latest
rank is labeled explicitly; its line and end label stop at the last numeric
observation, marked “last”. Hover and keyboard focus highlight a series without
removing any repositories.

The initial backfill covers September 27 through October 27, 2026. Profile Git
snapshots cover the period before the website first saved its public evidence
ledger on October 13. Website snapshots supply subsequent observations. Each
retained point records its source repository, commit, source date, and saved time.
Commit timestamps date saved snapshots, not exact rank changes. Unknown periods
remain unknown. Constant runs retain endpoints; missing ranks break paths.

Solid connectors guide the eye without asserting intermediate ranks. Explicit
fill="none" prevents SVG’s default black fill without relying on external CSS.
Numbered points preserve API ranks, including ties. End labels spread vertically
with leader lines without moving data points. Chart height expands to fit all
labels; narrower screens scroll horizontally. Series use distinct colors.

Ranges above ten use a disclosed logarithmic axis to keep early ranks and
later top-ten changes legible. Smaller ranges use linear spacing. The dashed
reference line marks rank ten.

The existing evidence-sync workflow appends snapshots on its configured
30-minute schedule. A sync timestamp means the source ledger was saved, not that
GitHub was freshly queried at that instant. Earlier unrecorded top-ten membership
cannot be established from these observations.

Validation includes 13 Python tests and eight Node chart tests. Chart regressions
cover historical membership, inclusive rank ten, later rank loss/unavailability,
53 simultaneous series, unique colors, label bounds, absence of controls,
unknown gaps, exact tied coordinates, disclosed logarithmic spacing, empty data,
and explicit unfilled SVG paths. Both suites run in the hosted refresh workflow.
