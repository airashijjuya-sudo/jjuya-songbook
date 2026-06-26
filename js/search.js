// ===========================================================
// search.js — 노래책 검색/정렬/무한스크롤, 마이픽 정렬/렌더
// ===========================================================
import { normalize, sortByCriterion, filterRecommendedOnly } from './utils.js';
import { state, getSortPref, setSortPref, getFilterPref, setFilterPref } from './state.js';
import { createCard, toggleLike, updateHomeStats, copySongInfo } from './render.js';

let cardsGrid, emptyState, countNum, loadMoreTrigger, searchInput, searchLyricsToggle, sortSelectSongbook, recommendFilterSongbook;
let mypickGrid, mypickEmpty, mypickCount, sortSelectMypick, recommendFilterMypick;
let showToastFn;

export function initSearchAndLists(els, showToast) {
  cardsGrid = els.cardsGrid; emptyState = els.emptyState; countNum = els.countNum;
  loadMoreTrigger = els.loadMoreTrigger; searchInput = els.searchInput;
  searchLyricsToggle = els.searchLyricsToggle; sortSelectSongbook = els.sortSelectSongbook;
  recommendFilterSongbook = els.recommendFilterSongbook;
  mypickGrid = els.mypickGrid; mypickEmpty = els.mypickEmpty; mypickCount = els.mypickCount;
  sortSelectMypick = els.sortSelectMypick; recommendFilterMypick = els.recommendFilterMypick;
  showToastFn = showToast;

  sortSelectSongbook.value = getSortPref('songbook');
  sortSelectMypick.value = getSortPref('mypick');
  recommendFilterSongbook.checked = getFilterPref('songbook');
  recommendFilterMypick.checked = getFilterPref('mypick');

  searchInput.addEventListener('input', applySearch);
  searchLyricsToggle.addEventListener('change', applySearch);
  sortSelectSongbook.addEventListener('change', () => {
    setSortPref('songbook', sortSelectSongbook.value);
    applySearch();
  });
  sortSelectMypick.addEventListener('change', () => {
    setSortPref('mypick', sortSelectMypick.value);
    renderMypick();
  });
  recommendFilterSongbook.addEventListener('change', () => {
    setFilterPref('songbook', recommendFilterSongbook.checked);
    applySearch();
  });
  recommendFilterMypick.addEventListener('change', () => {
    setFilterPref('mypick', recommendFilterMypick.checked);
    renderMypick();
  });

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && state.renderIndex < state.filteredSongs.length) renderNextBatch();
  }, { rootMargin: '200px' });
  observer.observe(loadMoreTrigger);
}

const cardCallbacks = () => ({
  onOpen: window.__openModal,
  onToggleLike: (id, e) => toggleLike(id, { updateHomeStats, renderMypick, showToast: showToastFn }),
  onCopy: (song) => copySongInfo(song, showToastFn),
});

export function applySearch() {
  const q = normalize(searchInput.value);
  const inc = searchLyricsToggle.checked;
  let base = q ? state.allSongs.filter(s => {
    const f = [s.title, s.artist, ...(s.tags || []), ...(s.searchKeywords || [])].map(normalize);
    if (inc && s.lyrics) f.push(normalize(s.lyrics));
    return f.some(x => x.includes(q));
  }) : [...state.allSongs];

  if (recommendFilterSongbook.checked) base = filterRecommendedOnly(base);

  state.filteredSongs = sortByCriterion(base, sortSelectSongbook.value);
  state.renderIndex = 0;
  cardsGrid.innerHTML = '';
  emptyState.style.display = 'none';
  countNum.textContent = state.filteredSongs.length;
  renderNextBatch();
}

export function renderNextBatch() {
  const batch = state.filteredSongs.slice(state.renderIndex, state.renderIndex + state.PAGE_SIZE);
  if (!batch.length && !state.renderIndex) { emptyState.style.display = 'block'; return; }
  batch.forEach(s => cardsGrid.appendChild(createCard(s, cardCallbacks())));
  state.renderIndex += batch.length;
}

export function renderMypick() {
  let liked = state.allSongs.filter(s => state.likedIds.has(s.id));
  if (recommendFilterMypick.checked) liked = filterRecommendedOnly(liked);
  liked = sortByCriterion(liked, sortSelectMypick.value);
  mypickCount.textContent = liked.length;
  mypickGrid.innerHTML = '';
  mypickEmpty.style.display = liked.length ? 'none' : 'block';
  mypickGrid.style.display = liked.length ? 'grid' : 'none';
  liked.forEach(s => mypickGrid.appendChild(createCard(s, cardCallbacks())));
}