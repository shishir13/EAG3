// CareerFlow Pro - Background Service Worker v2.0

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['userProfiles'], (result) => {
    if (!result.userProfiles) {
      chrome.storage.local.set({
        userProfiles: [createEmptyProfile('My Profile')],
        currentProfileIndex: 0,
        settings: {
          aiEnabled: true,
          highlightFilled: true,
          autoDetect: true
        },
        fillHistory: [],
        apiKey: ''
      });
    }
  });

  // Context menu for quick fill
  chrome.contextMenus.create({
    id: 'careerflow-fill',
    title: 'CareerFlow: Auto-Fill This Form',
    contexts: ['page']
  });
});

function createEmptyProfile(name) {
  return {
    name,
    fullName: '', firstName: '', lastName: '',
    email: '', phone: '', linkedin: '', github: '', portfolio: '',
    dob: '', currentAddress: '', permanentAddress: '',
    city: '', state: '', country: '', zipCode: '',
    skills: '', summary: '', yearsOfExperience: '',
    education: [],
    experience: [],
    certifications: [],
    languages: ''
  };
}

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'careerflow-fill') {
    chrome.storage.local.get(['userProfiles', 'currentProfileIndex'], (result) => {
      const idx = result.currentProfileIndex || 0;
      const profile = result.userProfiles?.[idx];
      if (profile && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'FILL_FORM', data: profile });
      }
    });
  }
});

// Handle AI calls from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'AI_COVER_LETTER') {
    generateCoverLetter(message.payload).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (message.type === 'AI_PARSE_RESUME') {
    parseResume(message.payload).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (message.type === 'AI_IMPROVE_SUMMARY') {
    improveSummary(message.payload).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (message.type === 'LOG_FILL') {
    logFillEvent(message.payload);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

async function callClaude(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function generateCoverLetter({ profile, jobTitle, company, jobDescription, tone, apiKey }) {
  if (!apiKey) throw new Error('No API key configured. Add your Anthropic API key in Settings.');

  const system = `You are an expert career coach and professional writer who crafts compelling, personalized cover letters. 
Write in a ${tone || 'professional'} tone. Be concise, authentic, and impactful. 
Return ONLY the cover letter text, no extra commentary.`;

  const user = `Write a cover letter for this person applying to this job:

APPLICANT PROFILE:
Name: ${profile.fullName}
Current Role: ${profile.experience?.[0]?.role || 'Professional'}
Years of Experience: ${profile.yearsOfExperience || 'Several'}
Key Skills: ${profile.skills}
Summary: ${profile.summary || ''}

JOB DETAILS:
Position: ${jobTitle}
Company: ${company}
${jobDescription ? `Job Description:\n${jobDescription}` : ''}

Write a tailored, 3-paragraph cover letter that:
1. Opens with a compelling hook referencing the specific role and company
2. Highlights 2-3 most relevant achievements from their experience
3. Closes with enthusiasm and a clear call to action`;

  const text = await callClaude(apiKey, system, user);
  return { coverLetter: text };
}

async function parseResume({ resumeText, apiKey }) {
  if (!apiKey) throw new Error('No API key configured. Add your Anthropic API key in Settings.');

  const system = `You are a resume parser. Extract structured data from resumes and return ONLY valid JSON with no markdown or extra text.`;

  const user = `Parse this resume and return a JSON object with these exact fields:
{
  "fullName": "", "email": "", "phone": "", "linkedin": "", "github": "", "portfolio": "",
  "city": "", "state": "", "country": "", "zipCode": "",
  "summary": "", "skills": "", "yearsOfExperience": "",
  "experience": [{"company": "", "role": "", "startDate": "", "endDate": "", "description": "", "location": ""}],
  "education": [{"institution": "", "degree": "", "field": "", "startDate": "", "endDate": "", "gpa": ""}],
  "certifications": [{"name": "", "issuer": "", "date": ""}],
  "languages": ""
}

RESUME TEXT:
${resumeText}`;

  const text = await callClaude(apiKey, system, user);
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return { profile: JSON.parse(clean) };
  } catch {
    throw new Error('Could not parse resume. Please check the text and try again.');
  }
}

async function improveSummary({ summary, targetRole, apiKey }) {
  if (!apiKey) throw new Error('No API key configured. Add your Anthropic API key in Settings.');

  const system = `You are a career coach specializing in professional branding. Return ONLY the improved summary text, nothing else.`;

  const user = `Improve this professional summary for someone targeting "${targetRole || 'senior roles'}":

CURRENT SUMMARY:
${summary}

Make it more compelling, keyword-rich for ATS systems, and impactful. Keep it 3-4 sentences max.`;

  const text = await callClaude(apiKey, system, user);
  return { improved: text };
}

function logFillEvent(payload) {
  chrome.storage.local.get(['fillHistory'], (result) => {
    const history = result.fillHistory || [];
    history.unshift({
      ...payload,
      timestamp: new Date().toISOString()
    });
    // Keep last 50 events
    chrome.storage.local.set({ fillHistory: history.slice(0, 50) });
  });
}
