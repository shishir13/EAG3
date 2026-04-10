// CareerFlow Pro - Popup Script v2.0

document.addEventListener('DOMContentLoaded', () => {

  // ─── State ────────────────────────────────────────────────────────────────
  let profiles = [];
  let currentIndex = 0;

  const SIMPLE_FIELDS = [
    'fullName', 'email', 'phone', 'linkedin', 'github', 'portfolio',
    'dob', 'yearsOfExperience', 'city', 'state', 'country', 'zipCode',
    'currentAddress', 'summary', 'skills', 'languages'
  ];

  // ─── Element References ───────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const inputs = {};
  SIMPLE_FIELDS.forEach(f => { inputs[f] = $(f); });

  const expContainer = $('experienceContainer');
  const eduContainer = $('educationContainer');

  // ─── TAB NAVIGATION ───────────────────────────────────────────────────────
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $(`tab-${tab.dataset.tab}`).classList.add('active');

      // Hide action bar on non-profile tabs (except profile)
      const actionBar = $('mainActionBar');
      actionBar.style.display = tab.dataset.tab === 'profile' ? '' : 'none';

      if (tab.dataset.tab === 'history') renderHistory();
    });
  });

  // ─── PROFILE CREATION HELPERS ─────────────────────────────────────────────
  function createEmptyProfile(name = 'My Profile') {
    return {
      name,
      fullName: '', firstName: '', lastName: '',
      email: '', phone: '', linkedin: '', github: '', portfolio: '',
      dob: '', yearsOfExperience: '',
      city: '', state: '', country: '', zipCode: '',
      currentAddress: '', summary: '', skills: '', languages: '',
      experience: [{ company: '', role: '', startDate: '', endDate: '', description: '', location: '' }],
      education: [{ institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' }]
    };
  }

  // ─── EXPERIENCE BLOCKS ────────────────────────────────────────────────────
  function createExpBlock(job = {}, index) {
    const div = document.createElement('div');
    div.className = 'exp-block';
    div.innerHTML = `
      <div class="exp-block-header">
        <div class="exp-block-label">
          <span>💼</span> Job ${index + 1}
          ${job.company ? `<span style="color:var(--text-muted);font-weight:400">— ${job.company}</span>` : ''}
        </div>
        <button class="btn btn-icon remove-exp" data-idx="${index}" title="Remove">✕</button>
      </div>
      <div class="field">
        <label>Company</label>
        <input type="text" class="job-company" value="${esc(job.company)}" placeholder="Acme Corp">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Job Title / Role</label>
          <input type="text" class="job-role" value="${esc(job.role)}" placeholder="Software Engineer">
        </div>
        <div class="field">
          <label>Location</label>
          <input type="text" class="job-location" value="${esc(job.location)}" placeholder="San Francisco, CA">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Start Date</label>
          <input type="month" class="job-start" value="${esc(job.startDate)}">
        </div>
        <div class="field">
          <label>End Date</label>
          <input type="month" class="job-end" value="${esc(job.endDate)}" placeholder="Present">
        </div>
      </div>
      <div class="field">
        <label>Description / Responsibilities</label>
        <textarea class="job-desc" rows="3" placeholder="• Led development of core features that increased performance by 40%...">${esc(job.description)}</textarea>
      </div>
    `;
    return div;
  }

  function renderExp(list) {
    expContainer.innerHTML = '';
    if (!list || list.length === 0) {
      expContainer.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-dim);font-size:12px">No experience added yet</div>`;
      return;
    }
    list.forEach((job, i) => expContainer.appendChild(createExpBlock(job, i)));
    expContainer.querySelectorAll('.remove-exp').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const list = collectExp();
        list.splice(idx, 1);
        renderExp(list);
      });
    });
  }

  function collectExp() {
    return Array.from(expContainer.querySelectorAll('.exp-block')).map(b => ({
      company: b.querySelector('.job-company')?.value || '',
      role: b.querySelector('.job-role')?.value || '',
      location: b.querySelector('.job-location')?.value || '',
      startDate: b.querySelector('.job-start')?.value || '',
      endDate: b.querySelector('.job-end')?.value || '',
      description: b.querySelector('.job-desc')?.value || ''
    }));
  }

  $('addJob').addEventListener('click', () => {
    const list = collectExp();
    list.push({ company: '', role: '', startDate: '', endDate: '', description: '', location: '' });
    renderExp(list);
    expContainer.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ─── EDUCATION BLOCKS ─────────────────────────────────────────────────────
  function createEduBlock(edu = {}, index) {
    const div = document.createElement('div');
    div.className = 'exp-block';
    div.innerHTML = `
      <div class="exp-block-header">
        <div class="exp-block-label">
          <span>🎓</span> Education ${index + 1}
          ${edu.institution ? `<span style="color:var(--text-muted);font-weight:400">— ${edu.institution}</span>` : ''}
        </div>
        <button class="btn btn-icon remove-edu" data-idx="${index}" title="Remove">✕</button>
      </div>
      <div class="field">
        <label>Institution</label>
        <input type="text" class="edu-inst" value="${esc(edu.institution)}" placeholder="MIT, Stanford...">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Degree</label>
          <input type="text" class="edu-degree" value="${esc(edu.degree)}" placeholder="B.S., M.S., Ph.D.">
        </div>
        <div class="field">
          <label>Field of Study</label>
          <input type="text" class="edu-field" value="${esc(edu.field)}" placeholder="Computer Science">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Start Date</label>
          <input type="month" class="edu-start" value="${esc(edu.startDate)}">
        </div>
        <div class="field">
          <label>End Date</label>
          <input type="month" class="edu-end" value="${esc(edu.endDate)}">
        </div>
        <div class="field">
          <label>GPA</label>
          <input type="text" class="edu-gpa" value="${esc(edu.gpa)}" placeholder="3.8">
        </div>
      </div>
    `;
    return div;
  }

  function renderEdu(list) {
    eduContainer.innerHTML = '';
    if (!list || list.length === 0) {
      eduContainer.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-dim);font-size:12px">No education added yet</div>`;
      return;
    }
    list.forEach((edu, i) => eduContainer.appendChild(createEduBlock(edu, i)));
    eduContainer.querySelectorAll('.remove-edu').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const list = collectEdu();
        list.splice(idx, 1);
        renderEdu(list);
      });
    });
  }

  function collectEdu() {
    return Array.from(eduContainer.querySelectorAll('.exp-block')).map(b => ({
      institution: b.querySelector('.edu-inst')?.value || '',
      degree: b.querySelector('.edu-degree')?.value || '',
      field: b.querySelector('.edu-field')?.value || '',
      startDate: b.querySelector('.edu-start')?.value || '',
      endDate: b.querySelector('.edu-end')?.value || '',
      gpa: b.querySelector('.edu-gpa')?.value || ''
    }));
  }

  $('addEdu').addEventListener('click', () => {
    const list = collectEdu();
    list.push({ institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' });
    renderEdu(list);
    eduContainer.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ─── PROFILE SELECT & MANAGEMENT ─────────────────────────────────────────
  function renderProfileSelect() {
    const sel = $('profileSelect');
    sel.innerHTML = '';
    profiles.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.name || p.fullName || `Profile ${i + 1}`;
      sel.appendChild(opt);
    });
    sel.value = currentIndex;
  }

  function loadProfile(index) {
    const p = profiles[index] || createEmptyProfile();
    SIMPLE_FIELDS.forEach(f => { if (inputs[f]) inputs[f].value = p[f] || ''; });
    renderExp(p.experience?.length ? p.experience : []);
    renderEdu(p.education?.length ? p.education : []);
  }

  function saveCurrentToMemory() {
    const p = profiles[currentIndex] || createEmptyProfile();
    SIMPLE_FIELDS.forEach(f => { p[f] = inputs[f]?.value || ''; });
    // Auto-derive first/last name
    if (p.fullName) {
      const parts = p.fullName.trim().split(' ');
      p.firstName = parts[0];
      p.lastName = parts.slice(1).join(' ');
    }
    p.name = p.fullName || p.name || `Profile ${currentIndex + 1}`;
    p.experience = collectExp();
    p.education = collectEdu();
    profiles[currentIndex] = p;
  }

  $('profileSelect').addEventListener('change', e => {
    saveCurrentToMemory();
    currentIndex = parseInt(e.target.value);
    loadProfile(currentIndex);
    chrome.storage.local.set({ currentProfileIndex: currentIndex, userProfile: profiles[currentIndex] });
  });

  $('addNewProfile').addEventListener('click', () => {
    if (profiles.length >= 10) { showStatus('Maximum 10 profiles reached', true); return; }
    saveCurrentToMemory();
    const name = prompt('Profile name (e.g. "Engineering", "Product"):', `Profile ${profiles.length + 1}`);
    if (!name) return;
    profiles.push(createEmptyProfile(name));
    currentIndex = profiles.length - 1;
    renderProfileSelect();
    loadProfile(currentIndex);
    saveAll(false);
  });

  $('deleteProfile').addEventListener('click', () => {
    if (profiles.length <= 1) { showStatus('Need at least one profile', true); return; }
    if (!confirm(`Delete "${profiles[currentIndex].name || 'this profile'}"?`)) return;
    profiles.splice(currentIndex, 1);
    currentIndex = Math.max(0, currentIndex - 1);
    renderProfileSelect();
    loadProfile(currentIndex);
    saveAll(false);
  });

  // ─── SAVE & STORAGE ───────────────────────────────────────────────────────
  function saveAll(toast = true) {
    saveCurrentToMemory();
    chrome.storage.local.set({
      userProfiles: profiles,
      currentProfileIndex: currentIndex,
      userProfile: profiles[currentIndex]
    }, () => {
      renderProfileSelect();
      if (toast) showStatus('✓ Profile saved!');
    });
  }

  $('save').addEventListener('click', () => saveAll(true));

  $('clearForm').addEventListener('click', () => {
    if (!confirm('Clear all fields in this profile?')) return;
    SIMPLE_FIELDS.forEach(f => { if (inputs[f]) inputs[f].value = ''; });
    renderExp([]);
    renderEdu([]);
    showStatus('Profile cleared', false);
  });

  // ─── AUTO-FILL ────────────────────────────────────────────────────────────
  $('autofill').addEventListener('click', async () => {
    saveCurrentToMemory();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, {
      action: 'FILL_FORM',
      data: profiles[currentIndex]
    }, response => {
      if (chrome.runtime.lastError) {
        showStatus('⚠ Cannot fill this page — try reloading', true);
      } else if (response?.filled === 0) {
        showStatus('No matching fields found', true);
      } else {
        showStatus(`⚡ Filled ${response?.filled || 0} fields!`);
      }
    });
  });

  // ─── PAGE SCAN ────────────────────────────────────────────────────────────
  $('scanBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' }, response => {
      if (chrome.runtime.lastError || !response) {
        showStatus('Cannot scan this page', true);
        return;
      }

      const existing = document.getElementById('scanModal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'scanModal';
      modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999;
        display:flex; align-items:center; justify-content:center; padding:16px;
      `;
      modal.innerHTML = `
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:18px;width:100%;max-height:400px;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="font-size:13px;font-weight:700;color:var(--text)">
              🔍 Page Scan — ${response.fields?.length || 0} fillable fields
            </div>
            <button id="closeModal" style="background:var(--surface3);border:none;color:var(--text-muted);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">✕</button>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">
            Platform: <strong style="color:var(--indigo-light)">${response.platform || 'generic'}</strong> 
            · Total inputs: ${response.total}
          </div>
          ${(response.fields || []).map(f => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
              <div style="width:6px;height:6px;border-radius:50%;background:var(--emerald);flex-shrink:0"></div>
              <div style="font-size:12px;color:var(--text-muted);flex:1">${f.label || '—'}</div>
              <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--indigo-light);background:rgba(99,102,241,0.1);padding:2px 6px;border-radius:4px">${f.field}</div>
            </div>
          `).join('')}
          ${!response.fields?.length ? `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px">No recognizable fields found</div>` : ''}
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('#closeModal').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    });
  });

  // ─── AI: COVER LETTER ─────────────────────────────────────────────────────
  $('generateCoverLetter').addEventListener('click', async () => {
    saveCurrentToMemory();
    const apiKey = await getApiKey();
    if (!apiKey) { showAiStatus('clResult', 'Please add your Anthropic API key in Settings.', true); return; }

    const jobTitle = $('aiJobTitle').value.trim();
    const company = $('aiCompany').value.trim();
    if (!jobTitle || !company) {
      showAiStatus('clResult', 'Please enter a job title and company name.', true);
      return;
    }

    setLoading('clSpinner', 'clResult', true);
    chrome.runtime.sendMessage({
      type: 'AI_COVER_LETTER',
      payload: {
        profile: profiles[currentIndex],
        jobTitle, company,
        jobDescription: $('aiJobDesc').value,
        tone: $('aiTone').value,
        apiKey
      }
    }, response => {
      setLoading('clSpinner', 'clResult', false);
      if (response?.error) {
        showAiStatus('clResult', '❌ ' + response.error, true);
      } else {
        $('clResult').textContent = response.coverLetter;
        $('clResult').classList.add('show');
        $('clActions').style.display = 'flex';
      }
    });
  });

  $('copyCL').addEventListener('click', () => {
    navigator.clipboard.writeText($('clResult').textContent);
    $('copyCL').textContent = '✓ Copied!';
    setTimeout(() => { $('copyCL').textContent = '📋 Copy'; }, 2000);
  });

  // ─── AI: RESUME PARSER ────────────────────────────────────────────────────
  $('parseResume').addEventListener('click', async () => {
    const apiKey = await getApiKey();
    if (!apiKey) { showAiStatus('parseResult', 'Please add your Anthropic API key in Settings.', true); return; }

    const resumeText = $('resumeText').value.trim();
    if (!resumeText) { showAiStatus('parseResult', 'Please paste your resume text.', true); return; }

    setLoading('parseSpinner', 'parseResult', true);
    chrome.runtime.sendMessage({
      type: 'AI_PARSE_RESUME',
      payload: { resumeText, apiKey }
    }, response => {
      setLoading('parseSpinner', 'parseResult', false);
      if (response?.error) {
        showAiStatus('parseResult', '❌ ' + response.error, true);
      } else {
        const parsed = response.profile;
        // Merge into current profile
        SIMPLE_FIELDS.forEach(f => {
          if (parsed[f] && inputs[f]) inputs[f].value = parsed[f];
        });
        if (parsed.experience?.length) renderExp(parsed.experience);
        if (parsed.education?.length) renderEdu(parsed.education);

        $('parseResult').textContent = `✓ Parsed successfully! Found ${parsed.experience?.length || 0} jobs, ${parsed.education?.length || 0} education entries. Review & save your profile.`;
        $('parseResult').classList.add('show');
        $('parseResult').style.color = 'var(--emerald)';

        // Switch to profile tab
        setTimeout(() => {
          document.querySelector('[data-tab="profile"]').click();
          showStatus('✓ Resume imported! Review & save.');
        }, 1500);
      }
    });
  });

  // ─── AI: IMPROVE SUMMARY ─────────────────────────────────────────────────
  $('improveSummary').addEventListener('click', async () => {
    saveCurrentToMemory();
    const apiKey = await getApiKey();
    if (!apiKey) { showAiStatus('summaryResult', 'Please add your Anthropic API key in Settings.', true); return; }

    const summary = inputs.summary?.value?.trim();
    if (!summary) { showAiStatus('summaryResult', 'Add a summary in your profile first.', true); return; }

    setLoading('summarySpinner', 'summaryResult', true);
    chrome.runtime.sendMessage({
      type: 'AI_IMPROVE_SUMMARY',
      payload: { summary, targetRole: $('aiTargetRole').value, apiKey }
    }, response => {
      setLoading('summarySpinner', 'summaryResult', false);
      if (response?.error) {
        showAiStatus('summaryResult', '❌ ' + response.error, true);
      } else {
        $('summaryResult').textContent = response.improved;
        $('summaryResult').classList.add('show');
        $('applySummary').style.display = '';
        $('applySummary').onclick = () => {
          if (inputs.summary) inputs.summary.value = response.improved;
          document.querySelector('[data-tab="profile"]').click();
          showStatus('✓ Summary applied!');
        };
      }
    });
  });

  // ─── HISTORY ─────────────────────────────────────────────────────────────
  function renderHistory() {
    const list = $('historyList');
    chrome.storage.local.get(['fillHistory'], result => {
      const history = result.fillHistory || [];
      if (!history.length) {
        list.innerHTML = `
          <div class="empty">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No fill history yet</div>
            <div class="empty-desc">Your autofill activity will appear here</div>
          </div>`;
        return;
      }
      list.innerHTML = history.map(h => {
        const url = new URL(h.url).hostname;
        const date = new Date(h.timestamp);
        const rel = formatRelTime(date);
        return `
          <div class="history-item">
            <div class="history-icon">⚡</div>
            <div style="flex:1;min-width:0">
              <div class="history-url">${h.title || url}</div>
              <div class="history-meta">${url} · ${rel} · ${h.platform || 'generic'}</div>
            </div>
            <div class="history-count">${h.filled} fields</div>
          </div>`;
      }).join('');
    });
  }

  $('clearHistory').addEventListener('click', () => {
    if (!confirm('Clear all fill history?')) return;
    chrome.storage.local.set({ fillHistory: [] }, renderHistory);
  });

  function formatRelTime(date) {
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  chrome.storage.local.get(['apiKey', 'settings'], result => {
    if (result.apiKey) $('apiKey').value = result.apiKey;
    const s = result.settings || {};
    $('settingHighlight').checked = s.highlightFilled !== false;
    $('settingSkipFilled').checked = s.skipFilled !== false;
  });

  $('saveApiKey').addEventListener('click', () => {
    const key = $('apiKey').value.trim();
    chrome.storage.local.set({ apiKey: key }, () => {
      $('saveApiKey').textContent = '✓ Saved!';
      setTimeout(() => { $('saveApiKey').textContent = 'Save API Key'; }, 2000);
    });
  });

  ['settingHighlight', 'settingSkipFilled'].forEach(id => {
    $(id).addEventListener('change', () => {
      chrome.storage.local.get(['settings'], r => {
        const s = r.settings || {};
        s.highlightFilled = $('settingHighlight').checked;
        s.skipFilled = $('settingSkipFilled').checked;
        chrome.storage.local.set({ settings: s });
      });
    });
  });

  // Export/Import
  $('exportData').addEventListener('click', () => {
    saveCurrentToMemory();
    const data = JSON.stringify({ profiles, version: '2.0' }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'careerflow-profiles.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  $('importData').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.profiles?.length) {
          profiles = data.profiles;
          currentIndex = 0;
          renderProfileSelect();
          loadProfile(0);
          saveAll(false);
          showStatus(`✓ Imported ${profiles.length} profile(s)!`);
        }
      } catch {
        showStatus('Invalid file format', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  function showStatus(msg, isError = false) {
    const s = $('status');
    s.textContent = msg;
    s.style.color = isError ? 'var(--rose)' : 'var(--emerald)';
    s.classList.add('show');
    s.classList.toggle('error', isError);
    clearTimeout(s._t);
    s._t = setTimeout(() => s.classList.remove('show'), 3000);
  }

  function showAiStatus(resultId, msg, isError = false) {
    const el = $(resultId);
    el.textContent = msg;
    el.style.color = isError ? 'var(--rose)' : 'var(--emerald)';
    el.classList.add('show');
  }

  function setLoading(spinnerId, resultId, loading) {
    $(spinnerId).classList.toggle('show', loading);
    if (loading) {
      $(resultId).classList.remove('show');
      $(resultId).textContent = '';
    }
  }

  function getApiKey() {
    return new Promise(res => {
      chrome.storage.local.get(['apiKey'], r => res(r.apiKey || ''));
    });
  }

  function esc(str = '') {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // ─── INIT: LOAD DATA ─────────────────────────────────────────────────────
  chrome.storage.local.get(['userProfiles', 'currentProfileIndex', 'userProfile'], result => {
    if (result.userProfiles?.length) {
      profiles = result.userProfiles;
      currentIndex = result.currentProfileIndex || 0;
    } else if (result.userProfile) {
      profiles = [result.userProfile];
      currentIndex = 0;
    } else {
      profiles = [createEmptyProfile('My Profile')];
      currentIndex = 0;
    }
    if (currentIndex >= profiles.length) currentIndex = 0;
    renderProfileSelect();
    loadProfile(currentIndex);
  });

});
