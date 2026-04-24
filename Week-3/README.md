# Week 3: Interactive Article Fetcher Agent

This directory contains `fetch_article.py`, an interactive AI agent built upon a custom loop that utilizes the `google-genai` SDK and Google's Gemini models to act as your personal reading assistant.

## Features

- **Google Search Grounding**: Instead of relying on third-party APIs (like Algolia/Hacker News), this agent uses Gemini's native Google Search grounding (`{"google_search": {}}`) to accurately search the live web for the latest and most relevant articles matching your topic.
- **Dynamic Topic Selection**: Interactively prompts you for a specific topic or field of interest.
- **Browser Automation Tool**: Employs Python's standard `webbrowser` module as a custom tool that the LLM can call to launch your default web browser to the discovered URL.
- **Custom Agentic Loop**: Implements a step-by-step reasoning loop (up to 5 iterations) that parses JSON tool-call responses, executes local Python functions, enforces wait times to respect API rate limits, and provides a final answer.
- **Background Logging**: Transparently monkey-patches the standard `print` function to record all agent interactions and terminal output directly to `agent_logs.txt`.

## Prerequisites

- Python 3.9+
- A Google Gemini API Key

## Setup & Configuration

1. **Environment Setup**:
   Create a `.env` file in the same directory as the script. You can start by copying the example if one exists:
   ```bash
   cp .env.example .env
   ```
   
   Open `.env` and add your valid Gemini API Key. You can optionally change the model depending on what you have access to:
   ```env
   GEMINI_API_KEY="your-gemini-key-goes-here"
   
   # Optional: Defaults to gemini-3-flash-preview if not specified
   GEMINI_MODEL="gemini-3-flash-preview" 
   ```

2. **Install Dependencies**:
   The script requires the `google-genai` and `python-dotenv` packages.

   **Using `uv`** (Recommended):
   If you have [`uv`](https://github.com/astral-sh/uv) installed, you can effortlessly run the script with dependencies managed automatically:
   ```bash
   uv run --with python-dotenv --with google-genai fetch_article.py
   ```

   **Using standard `pip`**:
   ```bash
   pip install google-genai python-dotenv
   python fetch_article.py
   ```

## Usage

1. Run the script using one of the run methods above.
2. The agent will prompt: 
   ```text
   Enter the topic you want an article about (e.g., 'Agentic AI'): 
   ```
3. Type a topic (e.g., `Multimodal Language Models`) and hit Enter.
4. Watch the agent's thought process unfold in the terminal. It will gracefully throttle its API requests (default waiting 5s) to avoid hitting free-tier limits, search the web via grounding, evaluate URLs, and pop open the best one in a new browser tab.
5. You can view a full trace of its internal operations and outputs anytime in the locally generated `agent_logs.txt` file.

## Under the Hood

- **`run_agent(user_query)`**: The core reasoning loop managing conversation history and handling consecutive agent interactions until a "final answer" is generated.
- **`call_llm(prompt)`**: The wrapper for `client.models.generate_content` configuring temperature and natively integrating the Google Search tool.
- **`open_in_browser(url)`**: The explicit tool function registered for the LLM to call via JSON command.
- **`parse_llm_response(text)`**: A robust JSON parser that extracts tool invocation commands correctly, gracefully handling markdown artifacts or conversational padding from the model.
