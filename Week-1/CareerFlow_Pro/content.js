// CareerFlow Pro - Content Script v2.0
// Smart form detection with support for React, Angular, Vue, Workday, Greenhouse, Lever, AshbyHQ

const FIELD_MAP = {
  firstName:        ['first name', 'given name', 'fname', 'first_name', 'firstname'],
  lastName:         ['last name', 'surname', 'lname', 'last_name', 'lastname', 'family name'],
  fullName:         ['full name', 'your name', 'candidate name', 'name'],
  email:            ['email', 'e-mail', 'email address', 'work email', 'contact email'],
  phone:            ['phone', 'mobile', 'cell', 'contact number', 'telephone', 'phone number'],
  linkedin:         ['linkedin', 'linked in', 'linkedin url', 'linkedin profile'],
  github:           ['github', 'github url', 'github profile'],
  portfolio:        ['portfolio', 'website', 'personal website', 'personal url'],
  city:             ['city', 'town', 'municipality'],
  state:            ['state', 'province', 'region'],
  country:          ['country', 'nation'],
  zipCode:          ['zip', 'postal', 'zip code', 'postal code'],
  currentAddress:   ['current address', 'present address', 'address', 'mailing address', 'street address'],
  permanentAddress: ['permanent address', 'home address'],
  dob:              ['dob', 'date of birth', 'birth date', 'birthdate', 'birthday'],
  summary:          ['summary', 'bio', 'about', 'professional summary', 'cover', 'objective', 'about yourself', 'about you'],
  skills:           ['skills', 'technologies', 'expertise', 'tech stack', 'competencies'],
  yearsOfExperience:['years of experience', 'total experience', 'experience (years)', 'years experience'],
  languages:        ['languages', 'spoken languages'],
  // Experience array fields
  company:          ['company', 'employer', 'organization', 'company name'],
  role:             ['job title', 'role', 'position', 'title', 'designation'],
  description:      ['description', 'responsibilities', 'duties', 'achievements', 'job description'],
  startDate:        ['start date', 'from date', 'start month', 'start year', 'from'],
  endDate:          ['end date', 'to date', 'end month', 'end year', 'to'],
  // Education array fields
  institution:      ['university', 'college', 'school', 'institution', 'educational institution'],
  degree:           ['degree', 'qualification', 'education level'],
  field:            ['field of study', 'major', 'area of study', 'specialization'],
  gpa:              ['gpa', 'grade', 'cgpa', 'grade point']
};

const ARRAY_EXP_FIELDS = ['company', 'role', 'description', 'startDate', 'endDate'];
const ARRAY_EDU_FIELDS = ['institution', 'degree', 'field', 'gpa'];

// Platform-specific selectors for popular ATS
const ATS_PLATFORMS = {
  workday: ['[data-automation-id]', '[data-uxi-widget-type]'],
  greenhouse: ['[id^="question_"]', '.application-field'],
  lever: ['.application-field', '[class*="lever"]'],
  ashby: ['[data-testid]', '.ashby-field'],
  smartrecruiters: ['[data-field-id]']
};

function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('myworkdayjobs') || host.includes('workday')) return 'workday';
  if (host.includes('greenhouse')) return 'greenhouse';
  if (host.includes('lever')) return 'lever';
  if (host.includes('ashby')) return 'ashby';
  if (host.includes('smartrecruiters')) return 'smartrecruiters';
  return 'generic';
}

function getAttributesFromElement(el) {
  const attrs = [
    el.name, el.id, el.placeholder,
    el.getAttribute('aria-label'),
    el.getAttribute('data-automation-id'),
    el.getAttribute('data-testid'),
    el.getAttribute('data-field-id'),
    el.getAttribute('name'),
    el.getAttribute('autocomplete')
  ].filter(Boolean).map(v => v.toLowerCase().trim());

  // Check associated label
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) attrs.push(label.innerText.toLowerCase().trim());
  }
  const closestLabel = el.closest('label');
  if (closestLabel) attrs.push(closestLabel.innerText.toLowerCase().trim());

  // Check nearby label siblings
  const parent = el.parentElement;
  if (parent) {
    const labels = parent.querySelectorAll('label, .label, [class*="label"]');
    labels.forEach(l => attrs.push(l.innerText.toLowerCase().trim()));
    // Also check previous sibling text
    const prevSibling = el.previousElementSibling;
    if (prevSibling) attrs.push(prevSibling.innerText.toLowerCase().trim());
  }

  return [...new Set(attrs)];
}

function findMatch(el) {
  const attrs = getAttributesFromElement(el);
  for (const [key, patterns] of Object.entries(FIELD_MAP)) {
    if (patterns.some(p => attrs.some(attr => attr.includes(p)))) {
      return key;
    }
  }
  return null;
}

function setNativeValue(el, value) {
  el.focus();
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
  ['input', 'change', 'blur', 'keyup'].forEach(evt => {
    el.dispatchEvent(new Event(evt, { bubbles: true }));
  });
  // For React synthetic events
  el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value }));
}

function highlightField(el) {
  el.style.boxShadow = '0 0 0 2px #6366f1, 0 0 8px rgba(99, 102, 241, 0.4)';
  el.style.transition = 'box-shadow 0.3s ease';
  setTimeout(() => {
    el.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.3)';
  }, 1500);
}

function injectData(profile) {
  if (!profile) return { filled: 0, skipped: 0, total: 0 };

  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="image"]), textarea'
  );

  let filled = 0, skipped = 0;
  const arrayPositions = {
    company: 0, role: 0, description: 0, startDate: 0, endDate: 0,
    institution: 0, degree: 0, field: 0, gpa: 0
  };

  inputs.forEach(input => {
    if (input.value?.trim() !== '' || input.disabled || input.readOnly) {
      skipped++;
      return;
    }

    const matchType = findMatch(input);
    if (!matchType) return;

    let value = null;

    if (ARRAY_EXP_FIELDS.includes(matchType)) {
      const jobs = profile.experience || [];
      const idx = arrayPositions[matchType];
      if (idx < jobs.length) {
        value = jobs[idx][matchType];
        arrayPositions[matchType]++;
      }
    } else if (ARRAY_EDU_FIELDS.includes(matchType)) {
      const edu = profile.education || [];
      const idx = arrayPositions[matchType];
      if (idx < edu.length) {
        value = edu[idx][matchType];
        arrayPositions[matchType]++;
      }
    } else {
      value = profile[matchType];
    }

    if (value) {
      setNativeValue(input, value);
      highlightField(input);
      filled++;
    }
  });

  // Handle select dropdowns for country/state
  document.querySelectorAll('select').forEach(select => {
    const matchType = findMatch(select);
    if (!matchType || !profile[matchType]) return;
    const val = profile[matchType].toLowerCase();
    Array.from(select.options).forEach(opt => {
      if (opt.text.toLowerCase().includes(val) || opt.value.toLowerCase().includes(val)) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        highlightField(select);
        filled++;
      }
    });
  });

  return { filled, skipped, total: inputs.length };
}

// Show a subtle toast notification
function showToast(message, type = 'success') {
  const existing = document.getElementById('cf-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cf-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${type === 'success' ? '#4f46e5' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 10px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    z-index: 999999;
    animation: cfSlideIn 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 320px;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes cfSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes cfSlideOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(20px); opacity: 0; } }
  `;
  document.head.appendChild(style);

  toast.innerHTML = `<span style="font-size:18px">${type === 'success' ? '⚡' : '❌'}</span> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'cfSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FILL_FORM') {
    const result = injectData(request.data);
    if (result.filled > 0) {
      showToast(`✓ Filled ${result.filled} field${result.filled !== 1 ? 's' : ''} successfully`);
    } else {
      showToast('No matching fields found on this page', 'error');
    }
    sendResponse({ status: 'success', ...result });

    // Log to history
    chrome.runtime.sendMessage({
      type: 'LOG_FILL',
      payload: {
        url: window.location.href,
        title: document.title,
        filled: result.filled,
        platform: detectPlatform()
      }
    });
  }

  if (request.action === 'SCAN_PAGE') {
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
    const fields = [];
    inputs.forEach(el => {
      const match = findMatch(el);
      if (match) fields.push({ field: match, label: el.getAttribute('aria-label') || el.placeholder || el.name || '' });
    });
    sendResponse({ fields, platform: detectPlatform(), total: inputs.length });
  }

  return true;
});
