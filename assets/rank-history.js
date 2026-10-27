(() => {
  "use strict";
  const status = document.querySelector("#rank-status");
  const chart = document.querySelector("#rank-chart");
  const legend = document.querySelector("#rank-legend");
  let repos = [];
  function render() {
    const drawing = RankChart.render(repos, chart.clientWidth);
    chart.innerHTML = drawing.svg;
    legend.replaceChildren();
    const focusSeries = (index) => chart.querySelectorAll("[data-series]").forEach((group) => {
      group.style.opacity = index == null || group.dataset.series === String(index) ? "1" : "0.06";
    });
    chart.querySelectorAll("[data-series]").forEach((group) => {
      group.addEventListener("pointerenter", () => focusSeries(group.dataset.series));
      group.addEventListener("pointerleave", () => focusSeries(null));
      group.addEventListener("focus", () => focusSeries(group.dataset.series));
      group.addEventListener("blur", () => focusSeries(null));
    });
    drawing.series.forEach(({repo,color}, index) => {
      const link = document.createElement("a");
      link.href = `https://github.com/${repo.full_name.split('/').map(encodeURIComponent).join('/')}`;
      const swatch = document.createElement("span");
      swatch.className = "rank-swatch";
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-hidden", "true");
      const current = RankChart.latest(repo);
      link.append(swatch, `${repo.full_name} · best #${RankChart.bestRank(repo)} · ${RankChart.validRank(current) ? `now #${current}` : "latest unavailable"}`);
      link.addEventListener("pointerenter", () => focusSeries(index));
      link.addEventListener("pointerleave", () => focusSeries(null));
      link.addEventListener("focus", () => focusSeries(index));
      link.addEventListener("blur", () => focusSeries(null));
      legend.append(link);
    });
    status.textContent = `${repos.length} repositories with a recorded top-ten rank. All qualifying histories are shown, including repositories that later left the top ten or have no current rank.`;
    if (!drawing.svg) chart.textContent = "No top-ten rank has been recorded yet.";
  }
  async function load() {
    try {
      const response = await fetch("/data/rank-history.json", {cache:"no-store"});
      if (!response.ok) throw new Error(`Rank history request failed (${response.status})`);
      const history = await response.json();
      repos = RankChart.everTopTen(history.repositories);
      window.addEventListener("resize", render);
      render();
    } catch (error) {
      status.textContent = "Rank history could not be loaded. The current contribution ledger below is still available.";
      console.error(error);
    }
  }
  load();
})();
