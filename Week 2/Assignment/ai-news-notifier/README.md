# AI News Notifier and Article Suggester

This assignment directory merges an **AI News Notifier Chrome Extension** and an advanced **Python Article Search Backend (`article_search.py`)**. 

## Part 1: Python Article Search

The `article_search.py` script included here is a robust, production-ready version of the AI Article Suggester powered by Gemma 4 via the Google Gemini API. It features multi-turn chat, structured command-line arguments, `.env` file management, and rich terminal logging.

### Prerequisites & Setup

1. **Install Python Packages:**
   ```bash
   pip install google-genai python-dotenv
   ```

2. **Environment Variables:**
   Copy the example environment file and insert your Gemini API Key.
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and set your key:
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

### Usage Commands

Run the script from your terminal:

- **One-shot default search:**
  ```bash
  python article_search.py
  ```
- **Custom topic search (with custom return count):**
  ```bash
  python article_search.py --topic "RAG Best Practices 2025" --n 5
  ```
- **Use a preset topic (Indexes 0 to 4):**
  ```bash
  python article_search.py --preset 2
  ```
- **Interactive Multi-Turn Chat Mode:**
  ```bash
  python article_search.py --chat
  ```
- **Debug Mode (Shows full HTTP traffic and SDK internals):**
  ```bash
  python article_search.py --debug
  ```

---

## Part 2: Chrome Extension

The AI News Notifier is a browser extension that periodically checks Hacker News for the latest AI, LLM, and deployment news to keep you up-to-date.

### How to Install the Extension

1. Open Google Chrome and navigate to the Manage Extensions page: `chrome://extensions/`.
2. Turn on **Developer mode** using the toggle switch in the top right corner.
3. Click the **Load unpacked** button in the top left menu.
4. In the file dialog, select the `ai-news-notifier` directory.
5. The **AI News Notifier** extension should now appear in your browser's extensions page. 
6. (Optional) Pin the extension to your Chrome toolbar for quick access to the popup UI.

### Extension Components
- `manifest.json`: Defines extension metadata and permissions (alarms, notifications, storage, and Host access to Hacker News).
- `background.js`: The service worker responsible for fetching news in the background and triggering notifications.
- `popup.html` & `popup.css`: The user interface displayed when you click the extension icon.
- `popup.js`: Manages interactions and logic within the popup interface.
- `icons/`: Contains extension icons in various sizes.
