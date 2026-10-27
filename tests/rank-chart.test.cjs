const {test} = require('node:test');
const assert = require('node:assert/strict');
const chart = require('../assets/rank-chart.js');
function repo(name, ranks) {
  return {full_name:`org/${name}`,name, observations:ranks.map((rank,i)=>({rank,at:`2026-10-${String(i+1).padStart(2,'0')}T00:00:00Z`}))};
}
test('top-five eligibility uses the latest observation and excludes unknowns',()=>{
  const rows=[repo('reached',[10,5]),repo('lost',[2,6]),repo('unknown',[2,null]),repo('invalid',[0,true]),repo('first',[4])];
  assert.deepEqual(chart.group(rows,'top5').repos.map(r=>r.name),['reached','first']);
});
test('paging covers every eligible repo exactly once in bounded batches',()=>{
  const rows=Array.from({length:41},(_,i)=>repo(`r${i}`,[i+5,3]));
  const seen=[];
  for(let page=0;page<7;page++) {const result=chart.group(rows,'top5',page);assert.ok(result.repos.length<=6);seen.push(...result.repos.map(r=>r.full_name));}
  assert.equal(new Set(seen).size,41);
  assert.equal(chart.group(rows,'top5',99).page,6);
  assert.equal(chart.group(rows,'top5',-1).page,0);
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
