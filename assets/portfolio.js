const chapters = Array.from(document.querySelectorAll('.top nav a'), link => ({
  link,
  section: document.querySelector(link.hash),
}));
const papers = Array.from(document.querySelectorAll('[data-paper]'));
const panels = Array.from(document.querySelectorAll('[data-feature]'));
const markers = Array.from(document.querySelectorAll('.feature-map a'));
const researchFigure = document.querySelector('.research-figure');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activePaper = -1;
let activeChapter = -1;
let pendingFrame = false;

function currentIndex(elements, offset) {
  return elements.findLastIndex(element => element.getBoundingClientRect().top <= offset);
}

function updateScroll() {
  pendingFrame = false;
  const root = document.documentElement;
  const distance = root.scrollHeight - root.clientHeight;
  const progress = distance > 0 ? window.scrollY / distance : 0;
  root.style.setProperty('--progress', Math.max(0, Math.min(1, progress)));

  const threshold = Math.min(160, window.innerHeight * .35);
  const chapter = currentIndex(chapters.map(item => item.section), threshold);
  if (chapter !== activeChapter) {
    chapters[activeChapter]?.link.removeAttribute('aria-current');
    chapters[chapter]?.link.setAttribute('aria-current', 'location');
    activeChapter = chapter;
  }

  const paper = Math.max(0, currentIndex(papers, threshold));
  if (!reducedMotion.matches && researchFigure.offsetWidth) {
    const bounds = papers[paper].getBoundingClientRect();
    const readingProgress = (threshold - bounds.top) / bounds.height;
    researchFigure.style.setProperty('--study-progress', Math.max(.12, Math.min(1, readingProgress)));
  }
  if (paper !== activePaper) {
    panels.forEach((panel, index) => {
      panel.hidden = panel.dataset.feature !== papers[paper].dataset.paper;
      if (panel.hidden) markers[index].removeAttribute('aria-current');
      else markers[index].setAttribute('aria-current', 'location');
    });
    activePaper = paper;
  }
}

function scheduleScroll() {
  if (pendingFrame) return;
  pendingFrame = true;
  requestAnimationFrame(updateScroll);
}

document.querySelector('.feature-map').classList.add('is-ready');
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', scheduleScroll);
window.addEventListener('load', scheduleScroll, { once: true });
scheduleScroll();

if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const entrances = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('entered');
      entrances.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -64px 0px' });
  document.querySelectorAll('[data-entrance]').forEach(section => entrances.observe(section));
}

const printButton = document.querySelector('#print-resume');
printButton.hidden = false;
printButton.addEventListener('click', () => window.print());

function renderContributionMap(rows) {
  if (!Array.isArray(rows)) return;
  const ranks = new Map(rows
    .filter(row => typeof row?.full_name === 'string')
    .map(row => [row.full_name.toLowerCase(), row.contributor_rank]));
  document.querySelectorAll('[data-project-rank]').forEach(field => {
    const rank = ranks.get(field.dataset.projectRank);
    field.textContent = Number.isSafeInteger(rank) && rank > 0 ? `#${rank}` : '—';
  });
  const projects = rows
    .filter(row => typeof row?.full_name === 'string'
      && /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(row.full_name)
      && Number.isSafeInteger(row.merged_pull_requests) && row.merged_pull_requests > 0)
    .sort((left, right) => left.merged_pull_requests - right.merged_pull_requests
      || left.full_name.localeCompare(right.full_name));
  if (!projects.length) return;

  const map = document.querySelector('.map-chart');
  const scrubber = document.querySelector('#project-scrubber');
  const name = document.querySelector('#project-name');
  const metrics = document.querySelector('#project-metrics');
  const pulls = document.querySelector('#project-pulls');
  const peak = projects[projects.length - 1].merged_pull_requests;
  let active = -1;

  const traces = projects.map((project, index) => {
    const trace = document.createElement('i');
    trace.style.setProperty('--height', `${100 * project.merged_pull_requests / peak}%`);
    trace.style.setProperty('--delay', `${Math.round(360 * index / projects.length)}ms`);
    return trace;
  });

  function showProject(index) {
    if (index === active) return;
    traces[active]?.classList.remove('is-selected');
    traces[index].classList.add('is-selected');
    active = index;

    const project = projects[index];
    const merged = project.merged_pull_requests.toLocaleString('en-US');
    const rank = ranks.get(project.full_name.toLowerCase());
    const count = `${merged} merged ${project.merged_pull_requests === 1 ? 'PR' : 'PRs'}`;
    const detail = Number.isSafeInteger(rank) && rank > 0 ? `${count} · #${rank} contributor` : count;
    const query = new URLSearchParams({q: 'is:pr author:rudycelekli is:merged'});
    name.textContent = project.full_name;
    metrics.textContent = detail;
    pulls.href = `https://github.com/${project.full_name}/pulls?${query}`;
    pulls.setAttribute('aria-label', `View merged pull requests for ${project.full_name}`);
    scrubber.value = index;
    scrubber.setAttribute('aria-valuetext', `${project.full_name}, ${detail}`);
  }

  map.replaceChildren(...traces);
  map.hidden = false;
  scrubber.max = projects.length - 1;
  scrubber.addEventListener('input', () => showProject(scrubber.valueAsNumber));
  function selectTrace(event) {
    const bounds = map.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width;
    const index = Math.min(projects.length - 1, Math.max(0, Math.floor(position * projects.length)));
    showProject(index);
  }

  map.addEventListener('click', selectTrace);
  map.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' && document.activeElement !== scrubber) selectTrace(event);
  });
  document.querySelector('.map-explorer').hidden = false;
  const highlighted = projects.findIndex(project => project.full_name.toLowerCase() === 'ifixai-ai/ifixai');
  showProject(highlighted >= 0 ? highlighted : projects.length - 1);
}

async function refreshMetrics() {
  const fields = Array.from(document.querySelectorAll('[data-metric]'));
  const date = document.querySelector('#ledger-date');
  try {
    const response = await fetch('/data/public-evidence.json');
    if (!response.ok) return;
    const evidence = await response.json();
    const values = fields.map(field => evidence.summary?.[field.dataset.metric]);
    const updated = evidence.updated_at_utc;
    if (!values.every(value => Number.isSafeInteger(value) && value >= 0)
      || typeof updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updated)
      || updated < date.dateTime) return;
    fields.forEach((field, index) => {
      field.textContent = values[index].toLocaleString('en-US');
    });
    date.dateTime = updated;
    date.textContent = `${updated} UTC`;
    renderContributionMap(evidence.upstream_contributions);
  } catch {
    // The dated HTML snapshot remains available when fetching fails.
  }
}

refreshMetrics();
