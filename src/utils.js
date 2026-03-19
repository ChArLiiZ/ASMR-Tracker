export function nowIso() {
  return new Date().toISOString();
}

export function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('zh-Hant', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function extractItemId(url) {
  const s = String(url);
  const m = s.match(/japaneseasmr\.com\/(\d+)\/?/);
  return m ? m[1] : '';
}

export function extractRjCode(doc = document) {
  const content = doc.querySelector('.entry-content, .post-content, article, .code-block');
  if (!content) return '';
  const text = content.textContent || '';
  const m = text.match(/\b(RJ|VJ)\d{6,}\b/i);
  return m ? m[0].toUpperCase() : '';
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function isoDateOnly(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/**
 * Bigram-based Dice coefficient between two strings.
 * Returns 0-1 (1 = identical).
 */
export function titleSimilarity(a, b) {
  if (!a || !b) return 0;
  const norm = s => s.toLowerCase()
    .replace(/[\[\]【】（）()《》\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sa = norm(a);
  const sb = norm(b);
  if (sa === sb) return 1;
  if (sa.length < 2 || sb.length < 2) return 0;

  const bigrams = (str) => {
    const set = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bi = str.slice(i, i + 2);
      set.set(bi, (set.get(bi) || 0) + 1);
    }
    return set;
  };

  const bg1 = bigrams(sa);
  const bg2 = bigrams(sb);
  let intersection = 0;
  for (const [bi, count] of bg1) {
    if (bg2.has(bi)) intersection += Math.min(count, bg2.get(bi));
  }
  return (2 * intersection) / (sa.length - 1 + sb.length - 1);
}
