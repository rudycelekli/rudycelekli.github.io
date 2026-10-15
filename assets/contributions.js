(() => {
  "use strict";

  const state = {
    rows: [],
    sort: "balanced",
    direction: "desc",
    query: "",
    topFiveOnly: false,
  };

  const elements = {
    body: document.querySelector("#contribution-rows"),
    filter: document.querySelector("#project-filter"),
    sort: document.querySelector("#sort-key"),
    direction: document.querySelector("#sort-direction"),
    topFive: document.querySelector("#top-five-only"),
    status: document.querySelector("#result-status"),
    freshness: document.querySelector("#evidence-freshness"),
    headers: Array.from(document.querySelectorAll("th[data-sort]")),
  };

  const format = new Intl.NumberFormat("en-US");
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

  function logRatio(value, maximum) {
    if (maximum <= 0 || value <= 0) return 0;
    return Math.log1p(value) / Math.log1p(maximum);
  }

  function calculateBalanced(rows) {
    const maxPrs = Math.max(0, ...rows.map((row) => row.merged_pull_requests));
    const maxStars = Math.max(0, ...rows.map((row) => row.repository_stars));
    return rows.map((row) => {
      const rankStrength = row.contributor_rank ? 1 / Math.sqrt(row.contributor_rank) : 0;
      const balanced = Math.round(100 * (
        0.5 * logRatio(row.merged_pull_requests, maxPrs) +
        0.3 * rankStrength +
        0.2 * logRatio(row.repository_stars, maxStars)
      ));
      return {
        ...row,
        accepted_line_changes: row.accepted_additions + row.accepted_deletions,
        balanced,
      };
    });
  }

  function defaultDirection(key) {
    return key === "rank" || key === "name" ? "asc" : "desc";
  }

  function valueFor(row, key) {
    const values = {
      name: row.name.toLocaleLowerCase(),
      rank: row.contributor_rank ?? Number.POSITIVE_INFINITY,
      prs: row.merged_pull_requests,
      commits: row.attributed_commits,
      lines: row.accepted_line_changes,
      stars: row.repository_stars,
      forks: row.repository_forks,
      balanced: row.balanced,
    };
    return values[key];
  }

  function comparison(left, right) {
    const a = valueFor(left, state.sort);
    const b = valueFor(right, state.sort);
    const result = typeof a === "string" ? a.localeCompare(b) : a - b;
    if (result !== 0) return state.direction === "asc" ? result : -result;
    return left.name.localeCompare(right.name);
  }

  function evidenceLink(row) {
    if (row.verification_tier === "github_listed_contributor") return row.contributors_url;
    if (row.verification_tier === "default_branch_commit_verified") return row.commits_url;
    return row.pull_requests_url || row.url;
  }

  function rowMarkup(row) {
    const rank = row.contributor_rank ? `#${format.format(row.contributor_rank)}` : "—";
    return `<tr>
      <th scope="row">
        <a class="project-link" href="${row.url}">${row.name}</a>
        <a class="evidence-link" href="${evidenceLink(row)}">${row.verification_label} ↗</a>
      </th>
      <td data-label="API rank">${rank}</td>
      <td data-label="Merged PRs"><a href="${row.pull_requests_url}">${format.format(row.merged_pull_requests)}</a></td>
      <td data-label="Commits">${format.format(row.attributed_commits)}</td>
      <td data-label="Line changes"><span class="positive">+${format.format(row.accepted_additions)}</span><span class="negative">−${format.format(row.accepted_deletions)}</span></td>
      <td data-label="Stars">${format.format(row.repository_stars)}</td>
      <td data-label="Forks">${format.format(row.repository_forks)}</td>
      <td data-label="Balanced"><span class="score-value">${row.balanced}</span></td>
    </tr>`;
  }

  function setQueryString() {
    const params = new URLSearchParams();
    if (state.sort !== "balanced") params.set("sort", state.sort);
    if (state.direction !== defaultDirection(state.sort)) params.set("direction", state.direction);
    if (state.query) params.set("q", state.query);
    if (state.topFiveOnly) params.set("top5", "1");
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }

  function render() {
    const query = state.query.toLocaleLowerCase();
    const rows = state.rows
      .filter((row) => !query || `${row.name} ${row.full_name}`.toLocaleLowerCase().includes(query))
      .filter((row) => !state.topFiveOnly || (row.contributor_rank && row.contributor_rank <= 5))
      .sort(comparison);

    elements.body.innerHTML = rows.length
      ? rows.map(rowMarkup).join("")
      : '<tr><td colspan="8" class="loading-cell">No verified projects match these filters.</td></tr>';
    elements.status.textContent = `${format.format(rows.length)} verified project${rows.length === 1 ? "" : "s"}, sorted by ${elements.sort.selectedOptions[0].text.toLocaleLowerCase()} ${state.direction === "asc" ? "ascending" : "descending"}.`;
    elements.direction.dataset.direction = state.direction;
    elements.direction.innerHTML = `<span aria-hidden="true">${state.direction === "asc" ? "↑" : "↓"}</span> ${state.direction === "asc" ? "Ascending" : "Descending"}`;
    elements.direction.setAttribute("aria-label", `Sort ${state.direction === "asc" ? "descending" : "ascending"}`);

    elements.headers.forEach((header) => {
      const active = header.dataset.sort === state.sort;
      header.setAttribute("aria-sort", active ? (state.direction === "asc" ? "ascending" : "descending") : "none");
      const indicator = header.querySelector("span");
      indicator.textContent = active ? (state.direction === "asc" ? "↑" : "↓") : "";
    });
    setQueryString();
  }

  function setSort(key, toggle = false) {
    if (toggle && state.sort === key) {
      state.direction = state.direction === "asc" ? "desc" : "asc";
    } else {
      state.sort = key;
      state.direction = defaultDirection(key);
    }
    elements.sort.value = key;
    render();
  }

  function bindControls() {
    elements.filter.addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      render();
    });
    elements.sort.addEventListener("change", (event) => setSort(event.target.value));
    elements.direction.addEventListener("click", () => {
      state.direction = state.direction === "asc" ? "desc" : "asc";
      render();
    });
    elements.topFive.addEventListener("change", (event) => {
      state.topFiveOnly = event.target.checked;
      render();
    });
    elements.headers.forEach((header) => {
      header.querySelector("button").addEventListener("click", () => setSort(header.dataset.sort, true));
    });
  }

  function restoreQuery() {
    const params = new URLSearchParams(location.search);
    const allowedSorts = new Set(["balanced", "rank", "prs", "commits", "lines", "stars", "forks", "name"]);
    const requestedSort = params.get("sort");
    if (allowedSorts.has(requestedSort)) state.sort = requestedSort;
    const requestedDirection = params.get("direction");
    state.direction = requestedDirection === "asc" || requestedDirection === "desc"
      ? requestedDirection
      : defaultDirection(state.sort);
    state.query = params.get("q") || "";
    state.topFiveOnly = params.get("top5") === "1";
    elements.sort.value = state.sort;
    elements.filter.value = state.query;
    elements.topFive.checked = state.topFiveOnly;
  }

  async function load() {
    bindControls();
    restoreQuery();
    try {
      const response = await fetch("/data/public-evidence.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Evidence request failed (${response.status})`);
      const evidence = await response.json();
      state.rows = calculateBalanced(evidence.upstream_contributions || []);
      document.querySelector("#summary-projects").textContent = format.format(evidence.summary.verified_upstream_projects);
      document.querySelector("#summary-prs").textContent = compact.format(evidence.summary.merged_pull_requests);
      document.querySelector("#summary-commits").textContent = compact.format(evidence.summary.attributed_commits);
      document.querySelector("#summary-stars").textContent = compact.format(evidence.summary.combined_repository_stars);
      const updated = String(evidence.updated_at_utc || "");
      const date = new Date(updated);
      elements.freshness.textContent = /^\d{4}-\d{2}-\d{2}$/.test(updated)
        ? `Evidence dated ${date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })} UTC`
        : `Evidence refreshed ${date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })}`;
      render();
    } catch (error) {
      elements.body.innerHTML = '<tr><td colspan="8" class="load-error">The live ledger could not be loaded. <a href="/public-evidence.md">Open the synchronized Markdown evidence.</a></td></tr>';
      elements.freshness.textContent = "Live evidence temporarily unavailable";
      elements.status.textContent = "Contribution evidence failed to load.";
      console.error(error);
    }
  }

  load();
})();
