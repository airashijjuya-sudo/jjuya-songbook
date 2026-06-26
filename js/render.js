// ===========================================================
// render.js — 카드 생성 / 무한 스크롤 / 마이픽 렌더 / 홈 통계
// ===========================================================
import { esc, langLabel, getYouTubeIdForThumbnail, thumbnailUrls, THUMB_FALLBACK_ORDER, buildDifficultyHTML } from './utils.js';
import { state, saveLikes } from './state.js';

const PLACEHOLDER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

function buildPlaceholderEl() {
  const div = document.createElement('div');
  div.className = 'card-thumb-placeholder';
  div.innerHTML = PLACEHOLDER_SVG;
  return div;
}

// 로드 성공 시 naturalWidth(가로 해상도)를 검사해 1000px 미만이면 깨진 이미지로 간주하고 다음 단계로 넘어감 (두 번 쓰기 귀찮..)
const MIN_VALID_WIDTH = 1000;

function advanceThumbStep(img) {
  const id = img.dataset.ytid;
  const urls = thumbnailUrls(id);
  const nextStep = Number(img.dataset.step || '0') + 1;
  if (nextStep < THUMB_FALLBACK_ORDER.length) {
    img.dataset.step = String(nextStep);
    img.src = urls[THUMB_FALLBACK_ORDER[nextStep]];
  } else {
    img.closest('.card-thumb-wrap')?.replaceWith(buildPlaceholderEl());
  }
}

// 네트워크 오류 등으로 실제 로드 자체가 실패한 경우
window.__thumbErrorHandler = function (img) {
  advanceThumbStep(img);
};

// 로드는 성공했지만 maxresdefault의 회색 placeholder(저해상도)인 경우 다음 단계로 교체
window.__thumbLoadHandler = function (img) {
  const step = Number(img.dataset.step || '0');
  if (step === 0 && img.naturalWidth > 0 && img.naturalWidth < MIN_VALID_WIDTH) {
    advanceThumbStep(img);
  }
};

function buildThumbHTML(song) {
  const id = getYouTubeIdForThumbnail(song);
  if (!id) {
    return `<div class="card-thumb-placeholder">${PLACEHOLDER_SVG}</div>`;
  }
  const { maxres } = thumbnailUrls(id);
  return `<div class="card-thumb-wrap"><img src="${maxres}" data-ytid="${id}" data-step="0" alt="" loading="lazy"
      onload="window.__thumbLoadHandler(this)" onerror="window.__thumbErrorHandler(this)" /></div>`;
}

export function buildArtistHTML(song, context) {
  const artist = (song.artist || '').trim(), vocal = (song.vocal || '').trim();
  const same = !vocal || vocal === artist;
  if (context === 'card') {
    return same
      ? `<div class="card-artist">${esc(artist)}</div>`
      : `<div class="card-artist-wrap"><span class="card-artist-name">${esc(artist)}</span><span class="card-artist-sep">|</span><span class="card-vocal">${esc(vocal)}</span></div>`;
  }
  return same
    ? `<div class="modal-artist" id="modalArtist">${esc(artist)}</div>`
    : `<div class="modal-artist-wrap" id="modalArtist"><span>${esc(artist)}</span><span class="modal-artist-sep">|</span><span class="modal-vocal">${esc(vocal)}</span></div>`;
}

// 카드 클릭 시 "작곡가 - 곡 제목" 형식으로 클립보드에 복사
export async function copySongInfo(song, showToast) {
  const text = `${(song.artist || '').trim()} - ${(song.title || '').trim()}`;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast?.(`복사 완료: ${text}`);
  } catch {
    showToast?.('복사에 실패했어요');
  }
}

export function createCard(song, { onOpen, onToggleLike, onCopy }) {
  const card = document.createElement('div');
  card.className = 'song-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  const [langClass, langText] = langLabel(song.language);
  const tags = (song.tags || []).slice(0, 3);
  const liked = state.likedIds.has(song.id);

  card.innerHTML = `
    ${buildThumbHTML(song)}
    <button class="card-heart${liked ? ' liked' : ''}" data-id="${esc(song.id)}" aria-label="마이픽">
      <svg viewBox="0 0 24 24" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    </button>
    <div class="card-body">
      <div class="card-title">${esc(song.title)}</div>
      ${buildArtistHTML(song, 'card')}
      <div class="card-meta">
        <span class="lang-badge ${langClass}">${langText}</span>
        ${tags.map(t => `<span class="tag-badge">${esc(t)}</span>`).join('')}
      </div>
      ${buildDifficultyHTML(song.difficulty)}
    </div>`;

  card.querySelector('.card-heart').addEventListener('click', e => {
    e.stopPropagation();
    onToggleLike(song.id, e);
  });
  const activate = () => { onOpen(song); onCopy?.(song); };
  card.addEventListener('click', activate);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
  return card;
}

export function toggleLike(id, els) {
  state.likedIds.has(id) ? state.likedIds.delete(id) : state.likedIds.add(id);
  saveLikes();
  document.querySelectorAll(`.card-heart[data-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('liked', state.likedIds.has(id));
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  });
  els.updateHomeStats();
  els.renderMypick();
  els.showToast(state.likedIds.has(id) ? '마이픽에 추가됐어요 ♥' : '마이픽에서 제거됐어요', state.likedIds.has(id) ? 'liked-toast' : '');
}

export function updateHomeStats() {
  document.getElementById('statTotal').textContent = state.allSongs.length;
  document.getElementById('statKo').textContent = state.allSongs.filter(s => s.language === 'ko').length;
  document.getElementById('statEn').textContent = state.allSongs.filter(s => s.language === 'en').length;
  document.getElementById('statJa').textContent = state.allSongs.filter(s => s.language === 'ja').length;
  document.getElementById('statLiked').textContent = state.likedIds.size;
}