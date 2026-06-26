// ===========================================================
// modal.js — 곡 정보 모달
// ===========================================================
import { esc, langLabel, parseLyrics, toNocookieEmbedUrl } from './utils.js';
import { state } from './state.js';
import { buildArtistHTML } from './render.js';

let modalOverlay, modalClose, modalTitle, modalMeta, modalLyrics, lyricsPanel;
let videoArea, videoToggleEl, recordPlate, tonearm;

export function initModal(els) {
  modalOverlay = els.modalOverlay; modalClose = els.modalClose;
  modalTitle = els.modalTitle; modalMeta = els.modalMeta;
  modalLyrics = els.modalLyrics; lyricsPanel = els.lyricsPanel;
  videoArea = els.videoArea; videoToggleEl = els.videoToggleEl;
  recordPlate = els.recordPlate; tonearm = els.tonearm;

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // 다른 모듈(search.js 등)에서 카드 클릭 시 호출할 수 있도록 전역 노출
  window.__openModal = openModal;
}

function buildSlots(song) {
  const fixed = [
    { key: 'original', label: '🎬 원곡', url: song.videoOriginal },
    { key: 'mr', label: '🎹 MR', url: song.videoMR },
  ];
  const dynamic = (song.videoSlots || []).map((s, i) => ({
    key: `slot${i + 1}`, label: s.label || `슬롯${i + 1}`, url: s.url,
  }));
  return [...fixed, ...dynamic].filter(s => s.url && s.url.trim());
}

function renderVideoToggle(song) {
  const slots = buildSlots(song);
  videoToggleEl.innerHTML = '';
  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.textContent = slot.label;
    btn.dataset.key = slot.key;
    if (slot.key === state.currentVideoType) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (state.currentVideoType === slot.key) return;
      state.currentVideoType = slot.key;
      videoToggleEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.key === slot.key));
      renderVideo(song);
    });
    videoToggleEl.appendChild(btn);
  });
  if (slots.length && !slots.find(s => s.key === state.currentVideoType)) {
    state.currentVideoType = slots[0].key;
    videoToggleEl.querySelectorAll('button')[0]?.classList.add('active');
  }
}

function renderVideo(song) {
  song = song || state.currentSong;
  const slots = buildSlots(song);
  const slot = slots.find(s => s.key === state.currentVideoType) || slots[0];
  const embedUrl = slot ? toNocookieEmbedUrl(slot.url) : '';
  if (embedUrl) {
    videoArea.innerHTML = `<div class="video-embed"><iframe src="${embedUrl}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      tonearm.style.transition = ''; tonearm.style.transform = 'rotate(52deg)';
      recordPlate.classList.add('spinning');
    }));
  } else {
    videoArea.innerHTML = `<div class="no-video"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14"/><rect x="3" y="8" width="12" height="8" rx="2"/></svg><span>영상 정보 없음</span></div>`;
    recordPlate.classList.remove('spinning');
    tonearm.style.transform = 'rotate(18deg)';
  }
}

// 가사 스크롤 위치 리셋 — 모달을 열 때마다 항상 맨 위에서 시작
function resetLyricsScroll() {
  lyricsPanel.scrollTop = 0;
  requestAnimationFrame(() => {
    lyricsPanel.scrollTop = 0;
    requestAnimationFrame(() => { lyricsPanel.scrollTop = 0; });
  });
}

function openModal(song) {
  state.currentSong = song;
  state.currentVideoType = 'original';

  modalTitle.textContent = song.title;
  document.getElementById('modalArtist').outerHTML = buildArtistHTML(song, 'modal');
  const [langClass, langText] = langLabel(song.language);
  modalMeta.innerHTML = `
    <span class="lang-badge ${langClass}">${langText}</span>
    ${(song.tags || []).slice(0, 6).map(t => `<span class="tag-badge">${esc(t)}</span>`).join('')}`;

  modalLyrics.innerHTML = (song.lyrics && song.lyrics.trim())
    ? `<div class="lyrics-text">${parseLyrics(song.lyrics)}</div>`
    : `<div class="no-lyrics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>가사 정보 없음</span></div>`;
  resetLyricsScroll();

  recordPlate.classList.remove('spinning');
  tonearm.style.transition = 'none';
  tonearm.style.transform = 'rotate(18deg)';

  renderVideoToggle(song);
  renderVideo(song);

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  videoArea.innerHTML = '';
  recordPlate.classList.remove('spinning');
  tonearm.style.transition = 'none'; tonearm.style.transform = 'rotate(18deg)';
  lyricsPanel.scrollTop = 0;
  state.currentSong = null;
}
