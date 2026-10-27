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
  const colors = ["oklch(0.51 0.188 258)","oklch(0.48 0.12 170)","oklch(0.5 0.17 310)","oklch(0.53 0.15 45)","oklch(0.42 0.08 220)"];
  let repos = [];
  const latest = (r) => r.observations.at(-1)?.rank;
  function render() {
    const selected = picker.value === "all" ? repos : repos.filter((r) => r.full_name === picker.value);
    const points = selected.flatMap((r) => r.observations);
    const known = points.filter((p) => validRank(p.rank));
    if (!known.length) {
      chart.textContent = "No numeric API rank has been recorded for this selection yet.";
      observations.textContent = "Unavailable ranks are retained in the downloadable history.";
      status.textContent = "Awaiting a recorded contributor rank.";
      return;
    }
    const start = Math.min(...points.map((p) => Date.parse(p.at)));
    const end = Math.max(...points.map((p) => Date.parse(p.at)));
    const maxRank = Math.max(6, ...known.map((p) => p.rank));
    const width = Math.max(340, chart.clientWidth), height = 380, left = 55, right = width - 20, top = 35, bottom = 315;
    const x = (p) => end === start ? (left + right) / 2 : left + (Date.parse(p.at) - start) / (end - start) * (right - left);
    const y = (rank) => top + (rank - 1) / (maxRank - 1) * (bottom - top);
    const ticks = [...new Set([1,5,Math.round(maxRank / 2),maxRank])].sort((a,b) => a-b);
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="rank-svg-title rank-svg-desc"><title id="rank-svg-title">GitHub API contributor rank over time</title><desc id="rank-svg-desc">Rank one is at the top. Recorded observations only. Top five is shaded green. The observation list below supplies dates and ranks.</desc><rect class="rank-band" x="${left}" y="${top}" width="${right-left}" height="${y(5)-top}"/>`;
    for (const rank of ticks) svg += `<line class="rank-grid" x1="${left}" x2="${right}" y1="${y(rank)}" y2="${y(rank)}"/><text x="${left-14}" y="${y(rank)+5}" text-anchor="end">#${rank}</text>`;
    svg += `<text x="${left}" y="${height-30}">${date(start)}</text><text x="${right}" y="${height-30}" text-anchor="end">${date(end)}</text><text x="${right}" y="22" text-anchor="end">Higher position ↑</text>`;
    selected.forEach((repo, i) => {
      const color = colors[i % colors.length];
      let segment = [];
      const segments = [];
      for (const p of repo.observations) {
        if (validRank(p.rank)) segment.push(p);
        else if (segment.length) { segments.push(segment); segment = []; }
      }
      if (segment.length) segments.push(segment);
      segments.forEach((part) => {
        svg += `<path class="rank-line" stroke="${color}" d="${part.map((p,j) => `${j ? "L" : "M"}${x(p).toFixed(2)},${y(p.rank).toFixed(2)}`).join(" ")}"/>`;
        // Mark every change and endpoint; repeated stable observations remain in the text ledger.
        part.filter((p,j) => j === 0 || j === part.length-1 || p.rank !== part[j-1].rank).forEach((p) => {
          const label = `${repo.full_name}: #${p.rank}, ${date(p.at)}`;
          svg += `<circle cx="${x(p).toFixed(2)}" cy="${y(p.rank).toFixed(2)}" r="4" fill="${color}"><title>${esc(label)}</title></circle>`;
        });
      });
    });
    chart.innerHTML = svg + "</svg>";
    status.textContent = selected.length === 1
      ? `${selected[0].full_name} · ${selected[0].observations.length} retained observations · latest recorded rank ${validRank(latest(selected[0])) ? `#${latest(selected[0])}` : "unavailable"}. ${selected[0].top5_left_censored ? "Already in the top five when numeric rank tracking began; climb time is unknown." : selected[0].days_to_top5 != null ? `First merged PR ${date(selected[0].first_merged_at)}; top five first recorded ${date(selected[0].first_top5_at)}, by day ${selected[0].days_to_top5}.` : "No measurable top-five interval in the available history."}`
      : `${selected.length} repositories compared. Choose one repository for a readable individual trajectory and snapshot list.`;
    observations.replaceChildren();
    if (selected.length !== 1) { observations.textContent = "Choose a repository above to inspect its dated observations and source commits."; return; }
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
      repos.forEach((r) => picker.add(new Option(r.full_name, r.full_name)));
      picker.add(new Option("Compare all repositories", "all"));
      picker.disabled = !repos.length;
      const climbs = repos.filter((r) => r.days_to_top5 != null).sort((a,b) => Math.max(...b.observations.map((p) => p.rank || 0)) - Math.max(...a.observations.map((p) => p.rank || 0)));
      if (climbs.length) picker.value = climbs[0].full_name;
      milestones.innerHTML = [...repos].sort((a,b) => (a.days_to_top5 ?? Infinity) - (b.days_to_top5 ?? Infinity) || a.full_name.localeCompare(b.full_name)).map((r) => `<tr><th scope="row"><a href="${esc(r.url)}">${esc(r.full_name)}</a></th><td>${validRank(latest(r)) ? `#${latest(r)}` : "Unavailable"}</td><td>${r.first_top5_at ? date(r.first_top5_at) : "Not observed"}</td><td>${r.top5_left_censored ? "Already top five at first numeric snapshot" : r.days_to_top5 != null ? `Observed by day ${Number(r.days_to_top5).toFixed(1)}` : "Insufficient observations"}</td></tr>`).join("");
      picker.addEventListener("change", render);
      window.addEventListener("resize", render);
      render();
    } catch (error) {
      status.textContent = "Rank history could not be loaded. The current contribution ledger below is still available.";
      console.error(error);
    }
  }
  load();
})();
