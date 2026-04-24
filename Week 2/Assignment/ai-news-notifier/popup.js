const enabledToggle = document.getElementById('enabledToggle');
const intervalSelect = document.getElementById('intervalSelect');
const fetchNowBtn = document.getElementById('fetchNow');
const fetchLabel = document.getElementById('fetchLabel');
const statusBadge = document.getElementById('statusBadge');
const articleLink = document.getElementById('articleLink');
const articleMeta = document.getElementById('articleMeta');
const articleActions = document.getElementById('articleActions');
const hnLink = document.getElementById('hnLink');
const lastFetched = document.getElementById('lastFetched');

// ── Load saved state ──────────────────────────────────────────────

chrome.storage.local.get(
  ['enabled', 'interval', 'lastArticle', 'lastFetched'],
  (data) => {
    const isEnabled = data.enabled !== false;
    setToggleState(isEnabled);

    if (data.interval) {
      intervalSelect.value = String(data.interval);
    }

    if (data.lastArticle) {
      renderArticle(data.lastArticle);
    }

    if (data.lastFetched) {
      lastFetched.textContent = `Last checked ${timeAgo(data.lastFetched)}`;
    }
  }
);

// ── Controls ──────────────────────────────────────────────────────

enabledToggle.addEventListener('change', async () => {
  const enabled = enabledToggle.checked;
  setToggleState(enabled);
  await chrome.runtime.sendMessage({ action: 'setEnabled', value: enabled });
});

intervalSelect.addEventListener('change', async () => {
  const mins = parseInt(intervalSelect.value, 10);
  await chrome.runtime.sendMessage({ action: 'setInterval', value: mins });
});

fetchNowBtn.addEventListener('click', async () => {
  fetchLabel.textContent = '⏳ Fetching…';
  fetchNowBtn.disabled = true;

  try {
    await chrome.runtime.sendMessage({ action: 'fetchNow' });
    // Give background a moment to write to storage
    await delay(1800);

    chrome.storage.local.get(['lastArticle', 'lastFetched'], (data) => {
      if (data.lastArticle) renderArticle(data.lastArticle);
      if (data.lastFetched) lastFetched.textContent = `Last checked just now`;
    });
  } finally {
    fetchLabel.textContent = '⚡ Fetch Now';
    fetchNowBtn.disabled = false;
  }
});

// ── Helpers ───────────────────────────────────────────────────────

function setToggleState(enabled) {
  enabledToggle.checked = enabled;
  statusBadge.textContent = enabled ? 'ON' : 'OFF';
  statusBadge.className = `badge badge--${enabled ? 'on' : 'off'}`;
}

function renderArticle(article) {
  articleLink.textContent = article.title;
  articleLink.href = article.url;

  const meta = [];
  if (article.points) meta.push(`${article.points} pts`);
  if (article.author) meta.push(`by ${article.author}`);
  if (article.comments) meta.push(`${article.comments} comments`);
  articleMeta.textContent = meta.join(' · ');

  if (article.hnUrl) {
    hnLink.href = article.hnUrl;
    articleActions.style.display = 'block';
  }
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
