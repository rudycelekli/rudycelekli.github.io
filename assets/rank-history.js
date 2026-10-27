(() => {
  "use strict";
  const picker = document.querySelector("#rank-project");
  const status = document.querySelector("#rank-status");
  const chart = document.querySelector("#rank-chart");
  const milestones = document.querySelector("#rank-milestones");
  const observations = document.querySelector("#rank-observations");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const validRank = (r) => Number.isInteger(r) && r > 0;
  const date = (s) => new Date(s).toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
  const legend = document.querySelector("#rank-legend");
  const previous = document.querySelector("#rank-prev");
  const next = document.querySelector("#rank-next");
  let page = 0;
  let repos = [];
  const latest = (r) => r.observations.at(-1)?.rank;
  function render() {
    const comparison = picker.value === "top5" || picker.value === "all";
    const batch = RankChart.group(repos, picker.value, page);
    page = batch.page;
    const selected = comparison ? batch.repos : repos.filter((r) => r.full_name === picker.value);
    previous.hidden = next.hidden = !comparison;
    previous.disabled = page === 0;
    next.disabled = page >= batch.pages - 1;
    const drawing = RankChart.render(selected, chart.clientWidth);
    chart.innerHTML = drawing.svg;
    legend.replaceChildren();
    const focusSeries = (index) => chart.querySelectorAll("[data-series]").forEach((group) => {
      group.style.opacity = index == null || group.dataset.series === String(index) ? "1" : "0.1";
    });
    chart.querySelectorAll("[data-series]").forEach((group) => {
      group.addEventListener("pointerenter", () => focusSeries(group.dataset.series));
      group.addEventListener("pointerleave", () => focusSeries(null));
      group.addEventListener("focus", () => focusSeries(group.dataset.series));
      group.addEventListener("blur", () => focusSeries(null));
    });
    drawing.series.forEach(({repo,color}, index) => {
      const button = document.createElement("button");
      button.type = "button";
      const swatch = document.createElement("span");
      swatch.className = "rank-swatch";
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-hidden", "true");
      button.append(swatch, `${repo.full_name} · #${latest(repo) ?? "?"}`);
      button.setAttribute("aria-label", `Show rank history for ${repo.full_name}`);
      button.addEventListener("pointerenter", () => focusSeries(index));
      button.addEventListener("pointerleave", () => focusSeries(null));
      button.addEventListener("focus", () => focusSeries(index));
      button.addEventListener("blur", () => focusSeries(null));
      button.addEventListener("click", () => { picker.value = repo.full_name; render(); });
      legend.append(button);
    });
    if (!drawing.svg) {
      chart.textContent = "No numeric API rank has been recorded for this selection yet.";
      observations.textContent = "Unavailable ranks are retained in the downloadable history.";
      status.textContent = comparison ? "No repositories have a recorded rank in this selection." : "Awaiting a recorded contributor rank.";
      return;
    }
    status.textContent = !comparison
      ? `${selected[0].full_name} · ${selected[0].observations.length} retained observations · latest recorded rank ${validRank(latest(selected[0])) ? `#${latest(selected[0])}` : "unavailable"}. ${selected[0].top5_left_censored ? "Already in the top five when numeric rank tracking began; climb time is unknown." : selected[0].days_to_top5 != null ? `First merged PR ${date(selected[0].first_merged_at)}; top five first recorded ${date(selected[0].first_top5_at)}, by day ${selected[0].days_to_top5}.` : "No measurable top-five interval in the available history."}`
      : `${picker.value === "top5" ? "Currently top five" : "All repositories"}: ${page * 6 + 1}–${page * 6 + selected.length} of ${batch.total}. Each colored line is your rank within that repository, not a ranking of these repositories against each other.`;
    observations.replaceChildren();
    if (comparison) { observations.textContent = "Choose a repository above to inspect its dated observations and source commits."; return; }
    selected[0].observations.slice().reverse().forEach((p) => {
      const row = document.createElement("p");
      row.textContent = `${p.at} · ${validRank(p.rank) ? `#${p.rank}` : "Rank unavailable"}`;
      if (/^[a-f0-9]{40}$/.test(p.source_commit || "")) {
        const a = document.createElement("a");
        const sourceRepo = p.source_repository === "rudycelekli/rudycelekli" ? p.source_repository : "rudycelekli/rudycelekli.github.io";
        a.href = `https://github.com/${sourceRepo}/commit/${p.source_commit}`;
        a.textContent = "Snapshot ↗";
        row.append(a);
      }
      observations.append(row);
    });
  }
  async function load() {
    try {
      const response = await fetch("/data/rank-history.json", {cache:"no-store"});
      if (!response.ok) throw new Error(`Rank history request failed (${response.status})`);
      const history = await response.json();
      repos = history.repositories.sort((a,b) => (latest(a) ?? Infinity) - (latest(b) ?? Infinity) || a.full_name.localeCompare(b.full_name));
      picker.replaceChildren();
      picker.add(new Option("Currently top-five repositories", "top5"));
      picker.add(new Option("All repositories", "all"));
      repos.forEach((r) => picker.add(new Option(r.full_name, r.full_name)));
      picker.disabled = !repos.length;
      picker.value = "top5";
      milestones.innerHTML = [...repos].sort((a,b) => (a.days_to_top5 ?? Infinity) - (b.days_to_top5 ?? Infinity) || a.full_name.localeCompare(b.full_name)).map((r) => `<tr><th scope="row"><a href="${esc(r.url)}">${esc(r.full_name)}</a></th><td>${validRank(latest(r)) ? `#${latest(r)}` : "Unavailable"}</td><td>${r.first_top5_at ? date(r.first_top5_at) : "Not observed"}</td><td>${r.top5_left_censored ? "Already top five at first numeric snapshot" : r.days_to_top5 != null ? `Observed by day ${Number(r.days_to_top5).toFixed(1)}` : "Insufficient observations"}</td></tr>`).join("");
      picker.addEventListener("change", () => { page = 0; render(); });
      previous.addEventListener("click", () => { page -= 1; render(); });
      next.addEventListener("click", () => { page += 1; render(); });
      window.addEventListener("resize", render);
      render();
    } catch (error) {
      status.textContent = "Rank history could not be loaded. The current contribution ledger below is still available.";
      console.error(error);
    }
  }
  load();
})();
