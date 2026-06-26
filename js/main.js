// ===========================================================
// main.js — 엔트리 포인트: 엘리먼트 참조 / 테마 / SPA 내비 / 데이터 로드
// ===========================================================
import { sortByCriterion } from './utils.js';
import { state, loadLikes, getTheme, setTheme, getSortPref } from './state.js';
import { updateHomeStats } from './render.js';
import { initSearchAndLists, applySearch, renderMypick } from './search.js';
import { initModal } from './modal.js';

// ===== 엘리먼트 =====
const els = {
  searchInput: document.getElementById('searchInput'),
  searchLyricsToggle: document.getElementById('searchLyrics'),
  cardsGrid: document.getElementById('cardsGrid'),
  emptyState: document.getElementById('emptyState'),
  countNum: document.getElementById('countNum'),
  loadMoreTrigger: document.getElementById('loadMoreTrigger'),
  sortSelectSongbook: document.getElementById('sortSelectSongbook'),
  recommendFilterSongbook: document.getElementById('recommendFilterSongbook'),
  mypickGrid: document.getElementById('mypickGrid'),
  mypickEmpty: document.getElementById('mypickEmpty'),
  mypickCount: document.getElementById('mypickCount'),
  sortSelectMypick: document.getElementById('sortSelectMypick'),
  recommendFilterMypick: document.getElementById('recommendFilterMypick'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalClose: document.getElementById('modalClose'),
  modalTitle: document.getElementById('modalTitle'),
  modalMeta: document.getElementById('modalMeta'),
  modalLyrics: document.getElementById('modalLyrics'),
  lyricsPanel: document.getElementById('lyricsPanel'),
  videoArea: document.getElementById('videoArea'),
  videoToggleEl: document.getElementById('videoToggle'),
  recordPlate: document.getElementById('recordPlate'),
  tonearm: document.getElementById('tonearm'),
};
const themeBtn = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');
const searchWrap = document.getElementById('searchWrap');
const lyricsToggleEl = document.querySelector('.lyric-toggle');

// ===== 테마 =====
function updateThemeIcon(t) {
  themeIcon.innerHTML = t === 'dark'
    ? `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none"/>`
    : `<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`;
}
const savedTheme = getTheme();
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  setTheme(next);
  updateThemeIcon(next);
});

// ===== 토스트 =====
function showToast(msg, cls = '') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast' + (cls ? ' ' + cls : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 300); }, 2000);
}

// ===== SPA 내비 =====
let currentPage = 'home';
document.getElementById('mainNav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  navigateTo(btn.dataset.page);
});
function navigateTo(page) {
  if (page === currentPage) return;
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  const showSearch = page === 'songbook';
  searchWrap.style.display = showSearch ? '' : 'none';
  lyricsToggleEl.style.display = showSearch ? '' : 'none';
  if (page === 'home') updateHomeStats();
  if (page === 'mypick') renderMypick();
}

// ===== JSON 데이터 로드 =====
async function loadSongs() {
  try {
    const res = await fetch('songs.json');
    if (!res.ok) throw 0;
    state.allSongs = sortByCriterion(await res.json(), getSortPref('songbook'));
  } catch { state.allSongs = []; }
  updateHomeStats();
  applySearch();
}

// ===== INIT =====
loadLikes();
initModal(els);
initSearchAndLists(els, showToast);
searchWrap.style.display = 'none';
lyricsToggleEl.style.display = 'none';
loadSongs();