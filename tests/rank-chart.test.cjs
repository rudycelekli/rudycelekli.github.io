const {test} = require('node:test');
const assert = require('node:assert/strict');
const chart = require('../assets/rank-chart.js');
function repo(name, ranks) {
  return {full_name:`org/${name}`,name, observations:ranks.map((rank,i)=>({rank,at:`2026-10-${String(i+1).padStart(2,'0')}T00:00:00Z`}))};
}
test('ever-top-ten membership includes former and unavailable ranks, with an inclusive tenth place',()=>{
  const rows=[repo('reached',[18,10]),repo('former',[2,16]),repo('unknown',[9,null]),repo('invalid',[0,true,-1]),repo('never',[11,12]),repo('first',[4])];
  assert.deepEqual(chart.everTopTen(rows).map(r=>r.name),['former','first','unknown','reached']);
});
test('every qualifying history renders at once, including unknown latest ranks',()=>{
  const rows=Array.from({length:53},(_,i)=>repo(`r${i}`,[9,i===52 ? null : 3]));
  const qualified=chart.everTopTen(rows);
  const {svg,series}=chart.render(qualified,1000);
  assert.equal(series.length,53);
  assert.equal((svg.match(/<g data-series=/g)||[]).length,53);
  assert.equal(new Set(series.map(s=>s.color)).size,53);
  assert.match(svg,/last #9/);
  const labelYs=[...svg.matchAll(/<text x="806" y="([^"]+)"/g)].map(m=>Number(m[1])).sort((a,b)=>a-b);
  assert.equal(labelYs.length,53);
  assert.ok(labelYs[0]>=44);
  labelYs.slice(1).forEach((y,i)=>assert.ok(y-labelYs[i]>=24));
  const height=Number(svg.match(/viewBox="0 0 1000 (\d+)"/)[1]);
  assert.ok(labelYs.at(-1)<height-40);
});
test('all strokes explicitly avoid black SVG default fill without external CSS',()=>{
  const {svg}=chart.render([repo('climb',[36,18,5,3])]);
  const paths=svg.match(/<path\b[^>]*>/g);
  assert.ok(paths.length>0);
  paths.forEach(path=>assert.match(path,/fill="none"/));
  assert.doesNotMatch(svg,/<rect\b/);
});
test('unknown observations split paths rather than bridging gaps',()=>{
  const {svg}=chart.render([repo('gaps',[8,null,4])]);
  const paths=svg.match(/<path class="rank-line"[^>]*>/g);
  assert.equal(paths.length,2);
  paths.forEach(path=>assert.doesNotMatch(path,/d="[^"]*L/));
});
test('ties retain identical rank coordinates and labels are separated',()=>{
  const {svg}=chart.render([repo('one',[5,3]),repo('two',[4,3])],1000);
  const groups=svg.split('<g data-series=').slice(1);
  const labels=groups.map(g=>Number(g.match(/<text x="806" y="([^"]+)"/)[1]));
  assert.ok(labels[1]-labels[0]>=40);
  const lastY=groups.map(g=>[...g.matchAll(/<circle[^>]*cy="([^"]+)"/g)].at(-1)[1]);
  assert.equal(lastY[0],lastY[1]);
});
test('large historical ranks use a disclosed log axis and preserve rank numbers',()=>{
  const {svg}=chart.render([repo('large',[103,25,4])]);
  assert.match(svg,/log spacing/);
  assert.match(svg,/>103<\/text>/);
  assert.match(svg,/large · #4/);
});
test('empty, singleton and escaped names render without invalid geometry',()=>{
  assert.equal(chart.render([repo('none',[null])]).svg,'');
  const {svg}=chart.render([repo('<script>',[3])],300);
  assert.doesNotMatch(svg,/NaN|Infinity|<script>/);
  assert.match(svg,/&lt;script&gt;/);
  assert.match(svg,/min-width:760px/);
});

test('the chart surface has no selector, pagination, or single-series view',()=>{
  const fs=require('node:fs');
  const html=fs.readFileSync(require('node:path').join(__dirname,'../contributions.html'),'utf8');
  const panel=html.split('class="explorer-panel rank-panel"')[1].split('</section>')[0];
  assert.doesNotMatch(panel,/<select|rank-prev|rank-next|rank-project|<button/);
});
