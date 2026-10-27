/* Observed API ranks. Pure geometry shared by the browser and regression tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RankChart = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const palette = ["#2463c5", "#ac397b", "#16836a", "#bb5418", "#7552b2", "#157e96"];
  const validRank = (rank) => Number.isInteger(rank) && rank > 0;
  const latest = (repo) => repo.observations.at(-1)?.rank;
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const date = (value) => new Date(value).toLocaleDateString("en-US", {month:"short", day:"numeric", timeZone:"UTC"});
  function gain(repo) {
    const known = repo.observations.filter((p) => validRank(p.rank));
    return known.length && validRank(latest(repo)) ? known[0].rank - latest(repo) : -Infinity;
  }
  function group(repos, mode, page = 0) {
    const eligible = repos.filter((r) => mode !== "top5" || (validRank(latest(r)) && latest(r) <= 5));
    eligible.sort((a,b) => gain(b) - gain(a) || a.full_name.localeCompare(b.full_name));
    const pages = Math.max(1, Math.ceil(eligible.length / 6));
    const index = Math.max(0, Math.min(pages - 1, page));
    return {repos:eligible.slice(index * 6, index * 6 + 6), total:eligible.length, page:index, pages};
  }
  function render(repos, width = 1000) {
    const points = repos.flatMap((r) => r.observations).filter((p) => Number.isFinite(Date.parse(p.at)));
    const known = points.filter((p) => validRank(p.rank));
    if (!known.length) return {svg:"", series:[]};
    width = Math.max(760, width);
    const height = 490, left = 58, right = width - 245, top = 44, bottom = height - 58;
    const start = Math.min(...points.map((p) => Date.parse(p.at)));
    const end = Math.max(...points.map((p) => Date.parse(p.at)));
    const maxRank = Math.max(5, ...known.map((p) => p.rank));
    const x = (p) => end === start ? (left + right)/2 : left + (Date.parse(p.at)-start)/(end-start)*(right-left);
    const logScale = maxRank > 10;
    const y = (rank) => top + (logScale ? Math.log(rank)/Math.log(maxRank) : (rank-1)/(maxRank-1))*(bottom-top);
    const ticks = [...new Set([1,2,3,4,5,10,25,50,100,maxRank].filter((rank) => rank <= maxRank))].sort((a,b) => a-b);
    // Labels spread vertically; leader lines return to the unmodified rank coordinates.
    const series = repos.map((r,i) => ({repo:r, index:i, color:palette[i % palette.length], last:r.observations.at(-1)}))
      .filter((s) => validRank(s.last?.rank)).sort((a,b) => a.last.rank-b.last.rank || a.index-b.index);
    let labelY = top - 40;
    series.forEach((s) => { s.labelY = Math.max(y(s.last.rank), labelY+40); labelY = s.labelY; });
    if (labelY > bottom) {
      const shift = labelY-bottom;
      series.forEach((s) => { s.labelY -= shift; });
    }
    const font = 'font-family="system-ui, sans-serif"';
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;width:100%;height:auto;min-width:760px" role="img" aria-labelledby="rank-svg-title rank-svg-desc"><title id="rank-svg-title">Contributor rank over time</title><desc id="rank-svg-desc">Each colored line follows one repository. Rank one is at the top. Numbered circles are recorded API ranks. Solid connectors guide the eye between saved observations; unavailable ranks break the line. Labels are spaced for readability without changing rank positions.</desc>`;
    let previousTickY = -Infinity;
    for (const rank of ticks) {
      // Closely spaced top ranks keep their exact positions; avoid overlapping axis labels.
      const nearFive = rank < 5 && rank > 1 && y(5)-y(rank) < 23;
      const visibleLabel = rank === 5 || rank === maxRank || (!nearFive && y(rank)-previousTickY >= 23 && y(maxRank)-y(rank) >= 23);
      if (visibleLabel) previousTickY = y(rank);
      svg += `<line x1="${left}" x2="${right}" y1="${y(rank)}" y2="${y(rank)}" stroke="${rank===5 ? '#a8c5b4' : '#d9d9d1'}" stroke-width="1" ${rank===5 ? 'stroke-dasharray="5 5"' : ''}/>`;
      if (visibleLabel) svg += `<text x="${left-14}" y="${y(rank)+5}" text-anchor="end" fill="#526177" font-size="13" ${font}>#${rank}</text>`;
    }
    svg += `<text x="${left}" y="20" fill="#526177" font-size="12" ${font}>API rank · higher is better ↑${logScale ? " · log spacing" : ""}</text><text x="${left}" y="${height-16}" fill="#526177" font-size="12" ${font}>${date(start)}</text><text x="${right}" y="${height-16}" text-anchor="end" fill="#526177" font-size="12" ${font}>${date(end)} · ${new Date(end).getUTCFullYear()}</text>`;
    repos.forEach((repo,i) => {
      const color = palette[i % palette.length];
      svg += `<g data-series="${i}" tabindex="0" role="group" aria-label="${escape(repo.full_name)}"><title>${escape(repo.full_name)}</title>`;
      const segments = []; let segment = [];
      for (const p of repo.observations) {
        if (validRank(p.rank) && Number.isFinite(Date.parse(p.at))) segment.push(p);
        else if (segment.length) { segments.push(segment); segment=[]; }
      }
      if (segment.length) segments.push(segment);
      segments.forEach((part) => {
        const d = part.map((p,j) => `${j ? 'L' : 'M'}${x(p).toFixed(2)},${y(p.rank).toFixed(2)}`).join(' ');
        // Explicit presentation attributes are essential: SVG defaults fill open paths black.
        svg += `<path class="rank-line" d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
        let lastLabelX = -Infinity, lastLabelY = -Infinity;
        part.forEach((p,j) => {
          if (j !== 0 && j !== part.length-1 && p.rank === part[j-1].rank) return;
          const px=x(p), py=y(p.rank);
          const numbered = j === part.length-1 || (px-lastLabelX >= 58 || Math.abs(py-lastLabelY) >= 40);
          const label = `${repo.full_name}: #${p.rank}, ${p.at}`;
          svg += `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${numbered ? 11 : 4}" fill="${color}" stroke="#faf8f1" stroke-width="2"><title>${escape(label)}</title></circle>`;
          if (numbered) {
            svg += `<text x="${px.toFixed(2)}" y="${(py+4).toFixed(2)}" text-anchor="middle" fill="#faf8f1" font-size="10" font-weight="700" ${font} pointer-events="none">${p.rank}</text>`;
            lastLabelX=px; lastLabelY=py;
          }
        });
      });
      const endLabel = series.find((s) => s.index === i);
      if (endLabel) {
        const p=endLabel.last, px=x(p), py=y(p.rank), ly=endLabel.labelY;
        svg += `<path d="M${px},${py} L${right+18},${py} L${right+34},${ly} L${right+44},${ly}" fill="none" stroke="${color}" stroke-width="1.25" opacity="0.65"/><text x="${right+51}" y="${ly+5}" fill="${color}" font-size="13" font-weight="650" ${font}>${escape(repo.name)} · #${p.rank}<title>${escape(repo.full_name)}</title></text>`;
      }
      svg += '</g>';
    });
    return {svg:svg+'</svg>', series:repos.map((repo,i) => ({repo,color:palette[i % palette.length]}))};
  }
  return {validRank,latest,group,render,palette};
});
