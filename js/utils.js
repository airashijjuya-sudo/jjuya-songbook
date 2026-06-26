// ===========================================================
// utils.js — 헬퍼 함수 모음
// ===========================================================

export function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function normalize(str) {
  return String(str || '').replace(/\s/g, '').toLowerCase();
}

// 문자 종류로 1차 그룹핑 (영문 → 한글 → 일본어/그외) 후 로케일 비교.
// 정렬(artist/title) 양쪽에서 재사용.
function scriptCategory(str) {
  const c = (str || '').charCodeAt(0);
  if (c >= 0x41 && c <= 0x7A) return 0;                                       // A-Z, a-z 부근
  if (c >= 0xAC00 && c <= 0xD7A3) return 1;                                   // 한글
  if ((c >= 0x3040 && c <= 0x30FF) || (c >= 0x4E00 && c <= 0x9FFF)) return 2; // 가나/한자
  return 3;
}

function compareByField(a, b, field) {
  const va = (a[field] || '').trim();
  const vb = (b[field] || '').trim();
  const ca = scriptCategory(va), cb = scriptCategory(vb);
  if (ca !== cb) return ca - cb;
  return va.localeCompare(vb, undefined, { sensitivity: 'base' });
}

// 정렬 기준: 'newest' | 'oldest' | 'title' | 'artist' | 'recommend'
export function sortByCriterion(list, criterion) {
  const arr = [...list];
  switch (criterion) {
    case 'newest':
      arr.sort((a, b) => Number(b.id) - Number(a.id));
      break;
    case 'oldest':
      arr.sort((a, b) => Number(a.id) - Number(b.id));
      break;
    case 'title':
      arr.sort((a, b) => compareByField(a, b, 'title'));
      break;
    case 'recommend':
      // 추천 순서(낮은 값이 우선)가 있는 곡을 먼저, 그 안에서는 지정한 순서대로.
      // 추천되지 않은 곡(0/미설정)은 뒤로 보내고 제목순으로 정렬.
      arr.sort((a, b) => {
        const ra = a.recommendOrder || 0, rb = b.recommendOrder || 0;
        if (ra && rb) return ra - rb;
        if (ra && !rb) return -1;
        if (!ra && rb) return 1;
        return compareByField(a, b, 'title');
      });
      break;
    case 'artist':
    default:
      arr.sort((a, b) => compareByField(a, b, 'artist'));
      break;
  }
  return arr;
}

// 추천(필터)된 곡만 남기기: recommendOrder가 0/미설정이 아닌 경우
export function filterRecommendedOnly(list) {
  return list.filter(s => (s.recommendOrder || 0) > 0);
}

export function langLabel(lang) {
  if (lang === 'ko') return ['lang-ko', '한국어'];
  if (lang === 'en') return ['lang-en', 'English'];
  if (lang === 'ja') return ['lang-ja', '日本語'];
  return ['lang-ko', lang];
}

// ===== 가사 파서 (-it 특별 문법 적용) =====
export function parseLyrics(raw) {
  if (!raw) return '';
  return raw.split('\n').map(line => {
    if (line.startsWith('-it ')) {
      return `<span class="lyrics-it">${esc(line.slice(4))}</span>`;
    }
    return esc(line);
  }).join('\n');
}

// ===== YOUTUBE ID 추출 / 자동 썸네일 등록 습박 복잡해 =====
export function extractYouTubeId(raw) {
  if (!raw || !raw.trim()) return '';
  const url = raw.trim();
  let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = url.match(/(?:youtube(?:-nocookie)?\.com)\/embed\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return '';
}

// 썸네일 추출 기준 우선순위: 원곡 → MR → 첫 번째 추가 슬롯
export function getYouTubeIdForThumbnail(song) {
  const candidates = [song.videoOriginal, song.videoMR, ...(song.videoSlots || []).map(s => s.url)];
  for (const url of candidates) {
    const id = extractYouTubeId(url);
    if (id) return id;
  }
  return '';
}

// 기본 폴백 순서: maxresdefault → hqdefault → mqdefault → default → 모두 실패 시 placeholder 사용
// 근데 이거 200 OK 이슈로 거의 안 쓰일듯 ... 
export const THUMB_FALLBACK_ORDER = ['maxres', 'hq', 'mq', 'default'];

export function thumbnailUrls(id) {
  return {
    maxres: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    hq: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    mq: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    default: `https://img.youtube.com/vi/${id}/default.jpg`,
  };
}

export function toNocookieEmbedUrl(raw) {
  if (!raw || !raw.trim()) return '';
  let url = raw.trim();
  const sh = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (sh) url = `https://www.youtube-nocookie.com/embed/${sh[1]}`;
  const wa = url.match(/(?:youtube\.com|youtube-nocookie\.com)\/watch\?.*v=([A-Za-z0-9_-]{11})/);
  if (wa) url = `https://www.youtube-nocookie.com/embed/${wa[1]}`;
  url = url
    .replace(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\//, 'https://www.youtube-nocookie.com/embed/')
    .replace(/(?:https?:\/\/)?(?:www\.)?youtube-nocookie\.com\/embed\//, 'https://www.youtube-nocookie.com/embed/');
  const [base, qs] = url.split('?');
  const p = new URLSearchParams(qs || '');
  p.set('rel', '0'); p.set('modestbranding', '1');
  return `${base}?${p.toString()}`;
}

// ===== 별점(난이도) HTML =====
export function buildDifficultyHTML(difficulty) {
  const d = Math.max(0, Math.min(5, Number(difficulty) || 0));
  if (!d) return '';
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<span class="star${i <= d ? ' filled' : ''}">★</span>`;
  }
  return `<div class="card-difficulty" aria-label="난이도 ${d}/5">${stars}</div>`;
}