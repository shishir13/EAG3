const ALARM_NAME = 'ai-news-fetch';
const DEFAULT_INTERVAL = 60; // minutes

// Rotating search queries for variety
const QUERIES = [
  'LLM deployment production 2025',
  'large language model AI news',
  'GPT Claude Gemini AI update',
  'AI machine learning research 2025',
  'AI startup deployment infrastructure',
  'LLM fine-tuning RAG AI',
  'artificial intelligence regulation policy',
  'AI agents automation 2025'
];
const MAX_SEEN = 30; // remember this many URLs to avoid repeats

// ── Lifecycle ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled, interval } = await chrome.storage.local.get(['enabled', 'interval']);
  if (enabled === undefined) {
    await chrome.storage.local.set({ enabled: true, interval: DEFAULT_INTERVAL });
  }
  if (enabled !== false) {
    setupAlarm(interval || DEFAULT_INTERVAL);
    fetchAndNotify(); // immediate first fetch
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled, interval } = await chrome.storage.local.get(['enabled', 'interval']);
  if (enabled !== false) {
    setupAlarm(interval || DEFAULT_INTERVAL);
  }
});

// ── Alarm ──────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const { enabled } = await chrome.storage.local.get('enabled');
  if (enabled !== false) fetchAndNotify();
});

function setupAlarm(intervalMinutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes
    });
  });
}

// ── Notifications ──────────────────────────────────────────────────────────

chrome.notifications.onClicked.addListener(async (notifId) => {
  const { lastArticle } = await chrome.storage.local.get('lastArticle');
  if (lastArticle?.url) {
    chrome.tabs.create({ url: lastArticle.url });
  }
  chrome.notifications.clear(notifId);
});

// ── Messages from popup ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(() => sendResponse({ ok: false }));
  return true;
});

async function handleMessage(msg) {
  switch (msg.action) {
    case 'setEnabled': {
      await chrome.storage.local.set({ enabled: msg.value });
      if (msg.value) {
        const { interval } = await chrome.storage.local.get('interval');
        setupAlarm(interval || DEFAULT_INTERVAL);
        await fetchAndNotify();
      } else {
        chrome.alarms.clear(ALARM_NAME);
      }
      return { ok: true };
    }
    case 'setInterval': {
      await chrome.storage.local.set({ interval: msg.value });
      const { enabled } = await chrome.storage.local.get('enabled');
      if (enabled !== false) setupAlarm(msg.value);
      return { ok: true };
    }
    case 'fetchNow': {
      const article = await fetchAndNotify();
      return { ok: true, article };
    }
    default:
      return { ok: false };
  }
}

// ── Article fetching ───────────────────────────────────────────────────────

async function fetchAndNotify() {
  const article = await fetchBestArticle();
  if (!article) return null;

  await chrome.storage.local.set({
    lastArticle: article,
    lastFetched: Date.now()
  });

  chrome.notifications.create(`ai-news-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'AI & LLM News',
    message: article.title,
    contextMessage: `${article.points} pts on Hacker News — click to read`,
    priority: 1,
    requireInteraction: false
  });

  return article;
}

async function fetchBestArticle() {
  // Persist query rotation across service-worker restarts
  const stored = await chrome.storage.local.get(['queryRotation', 'seenUrls']);
  const rotation = (stored.queryRotation || 0);
  const seenUrls = new Set(stored.seenUrls || []);

  const query = QUERIES[rotation % QUERIES.length];
  await chrome.storage.local.set({ queryRotation: rotation + 1 });

  const twoWeeksAgo = Math.floor(Date.now() / 1000) - 14 * 24 * 3600;

  const url =
    `https://hn.algolia.com/api/v1/search` +
    `?query=${encodeURIComponent(query)}` +
    `&tags=story` +
    `&hitsPerPage=50` +
    `&numericFilters=points%3E10,created_at_i%3E${twoWeeksAgo}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Filter valid URLs, skip already-seen ones
    const unseen = (data.hits || [])
      .filter(h => h.url && h.url.startsWith('http') && h.title && h.points >= 10)
      .filter(h => !seenUrls.has(h.url))
      .sort((a, b) => b.points - a.points);

    // If everything was seen, fall back to oldest-seen (clear half the history)
    const candidates = unseen.length > 0
      ? unseen
      : (data.hits || []).filter(h => h.url && h.url.startsWith('http') && h.title);

    if (candidates.length === 0) return fetchFallback(seenUrls);

    // Pick randomly from top 8 for variety
    const pick = candidates[Math.floor(Math.random() * Math.min(8, candidates.length))];

    // Record as seen, cap list at MAX_SEEN
    const updatedSeen = [...seenUrls, pick.url].slice(-MAX_SEEN);
    await chrome.storage.local.set({ seenUrls: updatedSeen });

    return toArticle(pick);
  } catch (err) {
    console.error('[AI News] Primary fetch failed:', err);
    return fetchFallback(seenUrls);
  }
}

async function fetchFallback(seenUrls = new Set()) {
  try {
    const resp = await fetch(
      'https://hn.algolia.com/api/v1/search?query=AI+LLM&tags=story&hitsPerPage=50&numericFilters=points%3E5'
    );
    const data = await resp.json();
    const valid = (data.hits || []).filter(h => h.url && h.url.startsWith('http') && h.title);
    if (valid.length === 0) return null;
    // Prefer unseen, otherwise just pick any
    const unseen = valid.filter(h => !seenUrls.has(h.url));
    const pick = (unseen.length > 0 ? unseen : valid)[Math.floor(Math.random() * Math.min(5, valid.length))];
    const updatedSeen = [...seenUrls, pick.url].slice(-MAX_SEEN);
    await chrome.storage.local.set({ seenUrls: updatedSeen });
    return toArticle(pick);
  } catch {
    return null;
  }
}

function toArticle(hit) {
  return {
    title: hit.title,
    url: hit.url,
    points: hit.points || 0,
    author: hit.author || 'unknown',
    comments: hit.num_comments || 0,
    hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`
  };
}
