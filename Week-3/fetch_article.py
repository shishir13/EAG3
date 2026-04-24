"""
Reading Assistant Agent
Fetches real articles on a requested topic and opens the best match in the default web browser.

Before running:
  pip install google-genai python-dotenv
  Create a .env file next to this script with:
    GEMINI_API_KEY=your-key-here
"""
import json
import re
import os
import time
import urllib.request
import urllib.parse
import webbrowser
import builtins
from dotenv import load_dotenv
from google import genai
from google.genai import types

_original_print = builtins.print
def _logged_print(*args, **kwargs):
    _original_print(*args, **kwargs)
    try:
        if kwargs.get('file') is None:
            text = " ".join(str(a) for a in args)
            with open("agent_logs.txt", "a", encoding="utf-8") as f:
                f.write(text + "\n")
    except Exception:
        pass
builtins.print = _logged_print

# ============================================================
# Configuration
# ============================================================
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
THROTTLE_SECONDS = 5  # Wait before each LLM call to stay under free-tier RPM limits

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not set in .env! Things might fail if it's not exported in the shell.")

client = genai.Client(api_key=GEMINI_API_KEY)


def call_llm(prompt: str) -> str:
    """Send a prompt to Gemini and return the text response."""
    print(f"  [waiting {THROTTLE_SECONDS}s to respect rate limits...]", flush=True)
    time.sleep(THROTTLE_SECONDS)
    
    # Enable native Google Search tools
    config = types.GenerateContentConfig(
        tools=[{"google_search": {}}],
        temperature=0.2,
    )
    response = client.models.generate_content(
        model=GEMINI_MODEL, 
        contents=prompt,
        config=config
    )
    return response.text


# ============================================================
# System Prompt
# ============================================================
system_prompt = """You are a helpful AI Reading Assistant. Your goal is to find real articles using your built-in Google Search grounding and helpfully open the most relevant one in the user's web browser.

You have access to the Google Search tool natively to find top articles. Find the best active URL for the user's topic.
Once you have the URL, you MUST use the following custom tool to open it:

1. open_in_browser(url: str) -> str
   Open a specific URL in the user's default web browser.
   Examples: open_in_browser("https://news.ycombinator.com/item?id=12345")

You must respond in ONE of these two JSON formats:

If you need to use a tool:
{"tool_name": "open_in_browser", "tool_arguments": {"url": "<url>"}}

If you have the final answer:
{"answer": "<your final answer>"}

IMPORTANT RULES:
- Respond with ONLY the JSON. No other text. No markdown code fences.
- Do NOT make up URLs. You must use real URLs found via your background search.
- When given a topic, immediately output the JSON to use open_in_browser with the link you found.
- Finally, once the browser tool says opened, provide your final answer telling the user what article you opened for them!
"""


# ============================================================
# Tools
# ============================================================

def open_in_browser(url: str) -> str:
    """Open a URL in the user's default browser"""
    try:
        webbrowser.open_new_tab(url)
        return json.dumps({"status": f"Successfully opened {url} in browser"})
    except Exception as e:
        return json.dumps({"error": f"Failed to open browser: {str(e)}"})


# Tool registry
tools = {
    "open_in_browser": open_in_browser,
}


# ============================================================
# Response Parser
# ============================================================

def parse_llm_response(text: str) -> dict:
    """Parse the LLM's response, handling common formatting issues"""
    text = text.strip()

    # Remove markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
        if text.startswith("json"):
            text = text[4:].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse LLM response: {text[:200]}")


# ============================================================
# The Agent Loop
# ============================================================

def run_agent(user_query: str, max_iterations: int = 5, verbose: bool = True):
    if verbose:
        print(f"\n{'='*60}")
        print(f"  User: {user_query}")
        print(f"{'='*60}")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query},
    ]

    for iteration in range(max_iterations):
        if verbose:
            print(f"\n--- Iteration {iteration + 1} ---")

        prompt = ""
        for msg in messages:
            if msg["role"] == "system":
                prompt += msg["content"] + "\n\n"
            elif msg["role"] == "user":
                prompt += f"User: {msg['content']}\n\n"
            elif msg["role"] == "assistant":
                prompt += f"Assistant: {msg['content']}\n\n"
            elif msg["role"] == "tool":
                prompt += f"Tool Result: {msg['content']}\n\n"

        response_text = call_llm(prompt)
        if verbose:
            print(f"LLM: {response_text.strip()}")

        try:
            parsed = parse_llm_response(response_text)
        except (ValueError, json.JSONDecodeError) as e:
            if verbose:
                print(f"Parse error: {e}")
                print("Asking LLM to retry...")
            messages.append({"role": "assistant", "content": response_text})
            messages.append({"role": "user", "content": "Please respond with valid JSON only. No markdown, no extra text."})
            continue

        if "answer" in parsed:
            if verbose:
                print(f"\n{'='*60}")
                print(f"  Agent Answer: {parsed['answer']}")
                print(f"{'='*60}")
            return parsed["answer"]

        if "tool_name" in parsed:
            tool_name = parsed["tool_name"]
            tool_args = parsed.get("tool_arguments", {})

            if verbose:
                print(f"→ Calling tool: {tool_name}({tool_args})")

            if tool_name not in tools:
                error_msg = json.dumps({"error": f"Unknown tool: {tool_name}. Available: {list(tools.keys())}"})
                if verbose:
                    print(f"→ Error: {error_msg}")
                messages.append({"role": "assistant", "content": response_text})
                messages.append({"role": "tool", "content": error_msg})
                continue

            tool_result = tools[tool_name](**tool_args)
            if verbose:
                print(f"→ Result: {tool_result}")

            messages.append({"role": "assistant", "content": response_text})
            messages.append({"role": "tool", "content": tool_result})

    print("\nMax iterations reached. Agent could not complete the task.")
    return None


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  ARTICLE FETCHER AGENT")
    print("=" * 60)
    
    user_topic = input("\nEnter the topic you want an article about (e.g., 'Agentic AI'): ").strip()
    if user_topic:
        run_agent(f"Fetch an interesting, recent article about '{user_topic}' and open it in my browser.")
    else:
        print("No topic provided. Exiting.")

