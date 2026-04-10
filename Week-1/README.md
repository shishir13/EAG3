# ⚡ CareerFlow Pro

> AI-powered Chrome extension that auto-fills job applications, parses resumes, and generates tailored cover letters — in seconds.

![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-10b981?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)

---

## ✨ Features

### ⚡ Smart Auto-Fill
- Detects and fills form fields across **any job application page**
- Reads `name`, `id`, `placeholder`, `aria-label`, `data-testid`, `data-automation-id`, parent labels, and sibling text
- Handles `<input>`, `<textarea>`, and `<select>` dropdowns (for country/state)
- Compatible with React, Angular, and Vue SPAs using native value setters

### 🤖 AI Tools (Claude-Powered)
- **Cover Letter Generator** — enter a job title, company, and optional description to generate a fully tailored cover letter in your chosen tone
- **Resume Parser** — paste raw resume text and AI extracts all your data into your profile automatically
- **Summary Improver** — rewrites your professional summary to be ATS-optimized for a target role

### 🧩 ATS Platform Support
| Platform | Detection |
|---|---|
| Workday | `data-automation-id`, `myworkdayjobs.com` |
| Greenhouse | `question_*` fields, `greenhouse.io` |
| Lever | `.application-field`, `lever.co` |
| Ashby | `data-testid`, `ashbyhq.com` |
| SmartRecruiters | `data-field-id`, `smartrecruiters.com` |
| Generic | Label text, `aria-label`, `name`, `id` fallback |

### 👤 Profile Management
- Up to **10 named profiles** (e.g. "Engineering", "Product", "Freelance")
- Stores personal details, location, summary, skills, work experience, and education
- Export and import profiles as JSON for backup or sharing

### 📋 Fill History
- Tracks every autofill: URL, page title, platform, fields filled, and timestamp
- Keeps the last 50 events

### 🔍 Page Scanner
- Scans the active tab and shows exactly which fields CareerFlow can detect and fill before you commit to autofilling

---

## 🗂 Project Structure

```
CareerFlow_Pro/
├── manifest.json       # Chrome Extension Manifest v3
├── background.js       # Service worker: AI API calls, context menu, history logging
├── content.js          # Injected into pages: form detection & field filling
├── popup.html          # Extension popup UI (dark theme, 4-tab layout)
├── popup.js            # Popup logic: profiles, storage, AI triggers, settings
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Installation

### From Source (Developer Mode)

1. **Download or clone** this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer Mode** (toggle in the top-right)
4. Click **Load unpacked**
5. Select the `CareerFlow_Pro` folder
6. The ⚡ icon will appear in your Chrome toolbar

### For AI Features

1. Get a free API key at [console.anthropic.com](https://console.anthropic.com)
2. Open the extension → go to the **Settings** tab
3. Paste your key and click **Save API Key**

> Your API key is stored locally in `chrome.storage.local` and never sent anywhere except the Anthropic API.

---

## 🧭 How to Use

### Basic Auto-Fill

1. Navigate to any job application page
2. Open the CareerFlow Pro popup
3. Make sure your profile is filled out (one-time setup)
4. Click **⚡ Auto-Fill This Page**
5. Fields are highlighted in indigo as they're filled

You can also right-click anywhere on a page → **CareerFlow: Auto-Fill This Form**.

### AI Cover Letter

1. Go to the **AI Tools** tab
2. Enter the job title, company name, and optionally paste the job description
3. Select a tone (Professional / Enthusiastic / Concise / Creative)
4. Click **✨ Generate Cover Letter**
5. Copy the result directly to your clipboard

### Resume Import

1. Go to **AI Tools** → **Resume Parser**
2. Paste your full resume as plain text
3. Click **✨ Parse & Import Resume**
4. Your profile fields auto-populate — review and save

### Page Scan

Click the **🔍 Scan** button in the header to see a modal listing every field CareerFlow detected on the current page, along with the matched field type and ATS platform.

---

## 📦 Profile Fields

| Category | Fields |
|---|---|
| Personal | Full Name, Email, Phone, LinkedIn, GitHub, Portfolio |
| Location | City, State, Country, Zip Code, Current Address |
| Professional | Summary, Skills, Years of Experience, Languages |
| Experience | Company, Role, Location, Start/End Date, Description (multiple) |
| Education | Institution, Degree, Field of Study, Start/End Date, GPA (multiple) |

---

## 🔒 Permissions Explained

| Permission | Why it's needed |
|---|---|
| `storage` | Save profiles and settings locally |
| `activeTab` | Read and fill the current tab's form |
| `scripting` | Inject the content script to interact with page inputs |
| `tabs` | Query the active tab to send fill messages |
| `contextMenus` | Add the right-click "Auto-Fill" option |
| `host_permissions: <all_urls>` | Allow filling on any job site |

---

## 🛠 Technical Notes

### SPA Compatibility
CareerFlow uses native prototype setters (`HTMLInputElement.prototype.value`) and dispatches `input`, `change`, `blur`, and `keyup` events to ensure React/Angular/Vue state updates correctly alongside DOM value changes.

### Field Matching Strategy
Fields are matched using a priority chain:
1. `aria-label`
2. `data-automation-id` / `data-testid` / `data-field-id`
3. `name` and `id` attributes
4. `placeholder` text
5. Associated `<label for="...">` element
6. Closest parent `<label>`
7. Previous sibling element text

### AI Integration
AI features use the Anthropic Messages API (`claude-sonnet-4-20250514`) called from the background service worker. No data is stored externally; your profile and API key stay in `chrome.storage.local`.

---

## 🗺 Roadmap

- [ ] PDF resume upload (drag & drop)
- [ ] Auto-detect job title and company from the page
- [ ] One-click application tracking (log applied jobs)
- [ ] Salary expectation field support
- [ ] Firefox / Edge compatibility
- [ ] Cloud profile sync (optional)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

---

## 📄 License

MIT © 2026 CareerFlow Pro

---

<div align="center">
  <strong>Built with ⚡ and Claude AI</strong><br>
  <sub>Stop copy-pasting. Start applying.</sub>
</div>
