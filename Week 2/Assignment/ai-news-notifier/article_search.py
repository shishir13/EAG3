"""
AI Article Suggester — powered by Gemma 4 via Google Gemini API
Reference: https://www.philschmid.de/gemma-4-gemini-api

Usage:
    python article_search.py                          # one-shot default search
    python article_search.py --topic "RAG 2025" --n 5
    python article_search.py --preset 2
    python article_search.py --chat                   # interactive multi-turn
    python article_search.py --debug                  # full HTTP + SDK trace

Setup:
    pip install google-genai python-dotenv
    Add GEMINI_API_KEY=your-key to a .env file in this folder.
"""

import os
import sys
import logging
import argparse
import textwrap
import time
from pathlib import Path

# ── 1. Load .env BEFORE anything else touches os.environ ─────────────────────

from dotenv import load_dotenv

_env_path = Path(__file__).parent / ".env"
loaded = load_dotenv(dotenv_path=_env_path, override=False)

# ── 2. Logging setup ──────────────────────────────────────────────────────────

_LOG_FMT = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s"
_DATE_FMT = "%H:%M:%S"


def setup_logging(debug: bool = False) -> logging.Logger:
    """
    Configure root logger and return the module logger.

    debug=False → INFO level (clean, readable output)
    debug=True  → DEBUG level (full HTTP request/response bodies + SDK internals)
    """
    level = logging.DEBUG if debug else logging.INFO

    # Root logger
    logging.basicConfig(
        level=level,
        format=_LOG_FMT,
        datefmt=_DATE_FMT,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    if debug:
        # Show raw HTTP traffic from the google-genai SDK (uses httpx internally)
        logging.getLogger("httpx").setLevel(logging.DEBUG)
        logging.getLogger("httpcore").setLevel(logging.DEBUG)
        logging.getLogger("google.genai").setLevel(logging.DEBUG)
        logging.getLogger("google.auth").setLevel(logging.DEBUG)
    else:
        # Silence noisy third-party loggers in normal mode
        for noisy in ("httpx", "httpcore", "google.auth"):
            logging.getLogger(noisy).setLevel(logging.WARNING)

    return logging.getLogger("article_search")


# Initialise at import time with INFO; --debug overrides later in main()
log = setup_logging(debug=False)

# ── 3. Google GenAI client ────────────────────────────────────────────────────

from google import genai
from google.genai import types

MODEL = "gemma-4-27b-it"   # swap to "gemma-4-26b-a4b-it" for the MoE variant

SYSTEM_INSTRUCTION = """
You are an expert AI research curator. Your sole job is to surface the best,
most relevant and most recent articles on these topics:

  • Large Language Models (LLMs) — architecture, fine-tuning, RAG, evaluation
  • AI deployment & MLOps — serving, inference optimisation, scaling
  • Model releases & benchmarks — GPT-4o, Claude, Gemini, Gemma, Llama, Mistral
  • AI infrastructure — GPUs, cloud, edge, quantisation
  • Industry news — funding rounds, regulation, research lab announcements

For every article you return:
  1. Title  (exact)
  2. URL    (direct, real, working link — never a search results page)
  3. Source (e.g. arXiv, Hacker News, TechCrunch, VentureBeat …)
  4. One-sentence reason why it matters right now

Prefer articles published in the last 7 days. Never fabricate URLs.
""".strip()

PRESET_TOPICS = [
    "LLM deployment and inference optimisation",
    "latest AI model releases and benchmarks",
    "AI agents and multi-agent systems",
    "AI regulation and safety research",
    "open-source LLM news this week",
]


def _make_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        log.error(
            ".env file not found or GEMINI_API_KEY missing.\n"
            "  Create  %s  and add:\n"
            "  GEMINI_API_KEY=your-key-here",
            _env_path,
        )
        sys.exit(1)

    masked = api_key[:6] + "..." + api_key[-4:]
    log.info("API key loaded from .env  (%s)", masked)
    log.info(".env path : %s  (found=%s)", _env_path, loaded)
    return genai.Client(api_key=api_key)


def _build_config(temperature: float = 0.2) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        tools=[{"google_search": {}}],
        temperature=temperature,
    )


# ── 4. Core search functions ──────────────────────────────────────────────────

def search_articles(client: genai.Client, topic: str, n: int = 5) -> str:
    """One-shot article search with full terminal logging."""
    prompt = (
        f"Find me {n} of the best and most recent articles about: {topic}. "
        "Return only real, working URLs. Format each result clearly."
    )

    log.info("━" * 56)
    log.info("MODEL    : %s", MODEL)
    log.info("TOPIC    : %s", topic)
    log.info("COUNT    : %d articles requested", n)
    log.info("TOOL     : google_search (grounding enabled)")
    log.info("PROMPT   ↓\n%s", textwrap.indent(prompt, "           "))
    log.info("━" * 56)
    log.info("Sending request …")

    t0 = time.perf_counter()
    response = client.models.generate_content(
        model=MODEL,
        config=_build_config(),
        contents=prompt,
    )
    elapsed = time.perf_counter() - t0

    _log_response(response, elapsed)
    return response.text


def search_articles_with_context(client: genai.Client,
                                  topic: str,
                                  extra_context: str = "") -> str:
    """Search with optional extra context using multi-part contents."""
    parts = [topic]
    if extra_context:
        parts.append(f"Additional focus: {extra_context}")
    parts.append("Return real working URLs only. Prioritise articles from the last 7 days.")
    contents = "\n".join(parts)

    log.info("━" * 56)
    log.info("MODEL    : %s  (multi-part contents)", MODEL)
    log.info("CONTENTS ↓\n%s", textwrap.indent(contents, "           "))
    log.info("━" * 56)
    log.info("Sending request …")

    t0 = time.perf_counter()
    response = client.models.generate_content(
        model=MODEL,
        config=_build_config(),
        contents=contents,
    )
    elapsed = time.perf_counter() - t0

    _log_response(response, elapsed)
    return response.text


def run_preset_search(client: genai.Client, index: int = 0, n: int = 5) -> str:
    topic = PRESET_TOPICS[index % len(PRESET_TOPICS)]
    log.info("Using preset topic [%d/%d]: %s", index, len(PRESET_TOPICS) - 1, topic)
    return search_articles(client, topic=topic, n=n)


# ── 5. Multi-turn chat ────────────────────────────────────────────────────────

def interactive_chat(client: genai.Client) -> None:
    """
    Multi-turn chat that carries context across searches.
    Pattern from: philschmid.de/gemma-4-gemini-api  (chats.create section)
    """
    log.info("Creating multi-turn chat session  (model=%s)", MODEL)
    chat = client.chats.create(
        model=MODEL,
        config=_build_config(temperature=0.3),
    )
    log.info("Chat session ready. History persists across turns.")

    print("\n" + "=" * 60)
    print("  AI & LLM Article Search  │  Gemma 4 · Google Search")
    print("  Type a topic, or 'quit' to exit.")
    print("=" * 60)

    turn = 0
    while True:
        try:
            user_input = input("\n🔍  Search: ").strip()
        except (EOFError, KeyboardInterrupt):
            log.info("Session interrupted by user.")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            log.info("User ended chat session after %d turn(s).", turn)
            break

        turn += 1
        log.info("─" * 56)
        log.info("TURN     : %d", turn)
        log.info("USER     : %s", user_input)
        log.info("Sending to model …")

        t0 = time.perf_counter()
        response = chat.send_message(user_input)
        elapsed = time.perf_counter() - t0

        _log_response(response, elapsed)
        print(f"\n{response.text}")
        print("─" * 60)


# ── 6. Response logger ────────────────────────────────────────────────────────

def _log_response(response, elapsed: float) -> None:
    """Log everything the SDK gives us back — usage, candidates, finish reason."""
    log.info("Response received in %.2fs", elapsed)

    # Usage metadata (token counts)
    meta = getattr(response, "usage_metadata", None)
    if meta:
        log.info(
            "TOKENS   : prompt=%s  candidates=%s  total=%s",
            getattr(meta, "prompt_token_count", "?"),
            getattr(meta, "candidates_token_count", "?"),
            getattr(meta, "total_token_count", "?"),
        )

    # Candidates & finish reason
    candidates = getattr(response, "candidates", [])
    log.info("CANDIDATES: %d", len(candidates))
    for i, c in enumerate(candidates):
        finish = getattr(c, "finish_reason", "?")
        safety = getattr(c, "safety_ratings", [])
        log.info("  [%d] finish_reason=%s  safety_ratings=%d", i, finish, len(safety))

        # Grounding metadata (search queries used)
        gm = getattr(c, "grounding_metadata", None)
        if gm:
            queries = getattr(gm, "web_search_queries", [])
            chunks  = getattr(gm, "grounding_chunks", [])
            log.info("  [%d] google_search queries : %s", i, queries)
            log.info("  [%d] grounding chunks      : %d sources returned", i, len(chunks))
            for j, chunk in enumerate(chunks[:5]):   # show first 5 sources
                web = getattr(chunk, "web", None)
                if web:
                    log.debug("       source[%d] %s  %s",
                              j,
                              getattr(web, "title", "")[:60],
                              getattr(web, "uri", ""))

    # Thinking / reasoning tokens (if model exposes them)
    for i, c in enumerate(candidates):
        content = getattr(c, "content", None)
        if not content:
            continue
        for part in getattr(content, "parts", []):
            thought = getattr(part, "thought", None)
            if thought:
                log.info("  [%d] REASONING (thought tokens) ↓", i)
                for line in str(thought).splitlines():
                    log.info("       %s", line)

    log.info("RESPONSE TEXT ↓\n%s", textwrap.indent(response.text or "(empty)", "  "))
    log.info("━" * 56)


# ── 7. CLI ────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="AI article search powered by Gemma 4 via Gemini API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--chat",   action="store_true", help="Interactive multi-turn chat mode")
    parser.add_argument("--topic",  type=str, default="", help="One-shot search topic")
    parser.add_argument("--n",      type=int, default=5,  help="Number of articles (default 5)")
    parser.add_argument("--preset", type=int, default=None,
                        metavar="0-4", help="Use preset topic by index")
    parser.add_argument("--debug",  action="store_true",
                        help="Enable DEBUG logging (shows raw HTTP + SDK internals)")
    args = parser.parse_args()

    # Re-init logging now that we know the --debug flag
    global log
    log = setup_logging(debug=args.debug)

    log.info("=" * 56)
    log.info("  AI Article Suggester  │  Gemma 4 · Gemini API")
    log.info("  .env  : %s", _env_path)
    log.info("  debug : %s", args.debug)
    log.info("=" * 56)

    client = _make_client()

    if args.chat:
        interactive_chat(client)

    elif args.preset is not None:
        result = run_preset_search(client, index=args.preset, n=args.n)
        print(result)

    else:
        topic = args.topic or "latest LLM deployment and AI news"
        result = search_articles(client, topic=topic, n=args.n)
        print(result)


if __name__ == "__main__":
    main()
