# AI Article Suggester

This directory contains a Python script (`article_search.py`) powered by Gemma 4 (via Google Gemini API) that surfaces the best, most relevant, and most recent articles on AI, LLMs, and deployment.

## Prerequisites
- Python 3.x
- `google-genai` package

## Setup

1. **Install Dependencies:**
   ```bash
   pip install google-genai
   ```

2. **Configure API Key:**
   You must set your Gemini API key as an environment variable before running the script.
   ```bash
   # On Windows (PowerShell)
   $env:GEMINI_API_KEY="your-api-key"
   
   # On macOS/Linux
   export GEMINI_API_KEY="your-api-key"
   ```

## Usage

You can run the script from your terminal using different arguments depending on what kind of search you want to perform.

1. **One-shot Default Search:**
   Runs a default search on the latest LLM deployment and AI news.
   ```bash
   python article_search.py
   ```

2. **Custom Topic Search:**
   Specify a custom topic and how many articles to return.
   ```bash
   python article_search.py --topic "latest agentic frameworks" --n 3
   ```

3. **Interactive Multi-turn Chat:**
   Starts a continuous conversational search session. The chat remembers context across queries.
   ```bash
   python article_search.py --chat
   ```
   *Type `quit` or `exit` to end the chat session.*

4. **Preset Search:**
   Cycle through 5 pre-configured AI topics using an index (0 to 4).
   ```bash
   python article_search.py --preset 1
   ```

## Grounding Feature
The script utilizes Google Search grounding (`tools=[{"google_search": {}}]`), ensuring that the results provided by the LLM have real, live working URLs and current information.
