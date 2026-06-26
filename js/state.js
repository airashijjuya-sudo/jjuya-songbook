// ===========================================================
// state.js — 공유 상태 + localStorage 영속화 (테마 / 좋아요 / 정렬 기준)
// ===========================================================

export const state = {
  allSongs: [],
  filteredSongs: [],
  renderIndex: 0,
  PAGE_SIZE: 20,
  currentSong: null,
  currentVideoType: 'original',
  likedIds: new Set(),
};

const LS_LIKES = 'songbook-likes';
const LS_THEME = 'songbook-theme';
const LS_SORT_SONGBOOK = 'songbook-sort-songbook';
const LS_SORT_MYPICK = 'songbook-sort-mypick';
const LS_FILTER_SONGBOOK = 'songbook-filter-recommend-songbook';
const LS_FILTER_MYPICK = 'songbook-filter-recommend-mypick';
const DEFAULT_SORT = 'title'; // 기본 정렬: 제목순 (기본 정렬 바꿔달라고 하면 여기 수정)

export function loadLikes() {
  try { state.likedIds = new Set(JSON.parse(localStorage.getItem(LS_LIKES) || '[]')); }
  catch { state.likedIds = new Set(); }
}
export function saveLikes() {
  localStorage.setItem(LS_LIKES, JSON.stringify([...state.likedIds]));
}

export function getTheme() {
  return localStorage.getItem(LS_THEME) || 'light';
}
export function setTheme(theme) {
  localStorage.setItem(LS_THEME, theme);
}

export function getSortPref(page) {
  const key = page === 'mypick' ? LS_SORT_MYPICK : LS_SORT_SONGBOOK;
  return localStorage.getItem(key) || DEFAULT_SORT;
}
export function setSortPref(page, value) {
  const key = page === 'mypick' ? LS_SORT_MYPICK : LS_SORT_SONGBOOK;
  localStorage.setItem(key, value);
}

export function getFilterPref(page) {
  const key = page === 'mypick' ? LS_FILTER_MYPICK : LS_FILTER_SONGBOOK;
  return localStorage.getItem(key) === '1';
}
export function setFilterPref(page, value) {
  const key = page === 'mypick' ? LS_FILTER_MYPICK : LS_FILTER_SONGBOOK;
  localStorage.setItem(key, value ? '1' : '0');
}