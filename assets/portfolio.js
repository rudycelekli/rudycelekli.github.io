const chapters = Array.from(document.querySelectorAll('.top nav a'), link => ({
  link,
  section: document.querySelector(link.hash),
}));
const papers = Array.from(document.querySelectorAll('[data-paper]'));
const panels = Array.from(document.querySelectorAll('[data-feature]'));
const markers = Array.from(document.querySelectorAll('.feature-map i'));
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
  if (paper !== activePaper) {
    panels.forEach((panel, index) => {
      panel.hidden = panel.dataset.feature !== papers[paper].dataset.paper;
      markers[index].classList.toggle('is-current', !panel.hidden);
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

const printButton = document.querySelector('#print-resume');
printButton.hidden = false;
printButton.addEventListener('click', () => window.print());

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
  } catch {
    // The dated HTML snapshot remains available when fetching fails.
  }
}

refreshMetrics();
