"""
AI Article Suggester — powered by Gemma 4 via Google Gemini API
Reference: https://www.philschmid.de/gemma-4-gemini-api

Usage:
    # One-shot search
    python article_search.py

    # Interactive multi-turn chat
    python article_search.py --chat

Setup:
    pip install google-genai
    export GEMINI_API_KEY="your-api-key"
"""

import argparse
import os

from google import genai

# ── Client setup (mirrors philschmid.de pattern) ─────────────────────────────

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

MODEL = "gemini-3-flash-preview"  # or "gemma-4-26b-a4b-it" for the MoE variant

# ── System instruction ────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """
You are an expert AI research curator. Your sole job is to surface the best,
most relevant and most recent articles on these topics:

  • Large Language Models (LLMs) — architecture, fine-tuning, RAG, evaluation
  • AI deployment & MLOps — serving, inference optimisation, scaling
  • Model releases & benchmarks — GPT-4o, Claude, Gemini, Gemma, Llama, Mistral
  • AI infrastructure — GPUs, cloud, edge, quantisation
  • Industry news — funding rounds, regulation, research lab announcements

For every article you return:
  1. Title (exact)
  2. URL  (must be a direct, real, working link — no search result pages)
  3. Source  (e.g. arXiv, Hacker News, TechCrunch, The Verge, VentureBeat …)
  

Prefer articles published in the last 7 days. Never fabricate URLs.
""".strip()

# ── Core helpers ──────────────────────────────────────────────────────────────

def build_config(temperature: float = 0.2) -> genai.types.GenerateContentConfig:
    """Config with Google Search grounding so results have real, live URLs."""
    return genai.types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        tools=[{"google_search": {}}],   # grounding — same as philschmid example
        temperature=temperature,
    )


def search_articles(topic: str = "latest LLM and AI deployment news",
                    n: int = 5) -> str:
    """
    One-shot article search.

    Args:
        topic: What to search for.
        n:     How many articles to return.

    Returns:
        Formatted string with article suggestions.
    """
    prompt = (
        f"Find me {n} of the best and most recent articles about: {topic}. "
        "Return only real, working URLs. Format each result clearly."
    )

    response = client.models.generate_content(
        model=MODEL,
        config=build_config(),
        contents=prompt,
    )
    return response.text


def search_articles_with_context(topic: str, extra_context: str = "") -> str:
    """
    Search with optional extra context (e.g. 'focus on open-source models').
    Uses the multi-part contents pattern from the philschmid blog.
    """
    parts = [topic]
    if extra_context:
        parts.append(f"Additional focus: {extra_context}")
    parts.append("Return real working URLs only. Prioritise articles from the last 7 days.")

    response = client.models.generate_content(
        model=MODEL,
        config=build_config(),
        contents="\n".join(parts),
    )
    return response.text


# ── Multi-turn chat mode ──────────────────────────────────────────────────────

def interactive_chat():
    """
    Multi-turn chat that remembers context across searches.
    Built exactly like the chat example on philschmid.de.
    """
    chat = client.chats.create(
        model=MODEL,
        config=build_config(temperature=0.3),
    )

    print("=" * 60)
    print("  AI & LLM Article Search  (Gemma 4 · Google Search)")
    print("  Type a topic to search, or 'quit' to exit.")
    print("=" * 60)

    while True:
        try:
            user_input = input("\n🔍 Search: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        response = chat.send_message(user_input)
        print(f"\n{response.text}")
        print("─" * 60)


# ── Preset topic searches ─────────────────────────────────────────────────────

PRESET_TOPICS = [
    "LLM deployment and inference optimisation",
    "latest AI model releases and benchmarks",
    "AI agents and multi-agent systems",
    "AI regulation and safety research",
    "open-source LLM news this week",
]


def run_preset_search(index: int = 0, n: int = 5) -> str:
    """Cycle through preset topics — useful for the Chrome extension backend."""
    topic = PRESET_TOPICS[index % len(PRESET_TOPICS)]
    print(f"Topic: {topic}\n")
    return search_articles(topic=topic, n=n)


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AI article search powered by Gemma 4")
    parser.add_argument("--chat", action="store_true", help="Start interactive multi-turn chat")
    parser.add_argument("--topic", type=str, default="", help="One-shot search topic")
    parser.add_argument("--n", type=int, default=5, help="Number of articles to return")
    parser.add_argument("--preset", type=int, default=None,
                        help="Use a preset topic by index (0-4)")
    args = parser.parse_args()

    if not os.environ.get("GEMINI_API_KEY"):
        print("⚠️  Set your GEMINI_API_KEY environment variable first.")
        print("   export GEMINI_API_KEY='your-key-here'")
        return

    if args.chat:
        interactive_chat()

    elif args.preset is not None:
        result = run_preset_search(index=args.preset, n=args.n)
        print(result)

    else:
        topic = args.topic or "latest LLM deployment and AI news"
        print(f"Searching: {topic}\n{'─'*60}")
        result = search_articles(topic=topic, n=args.n)
        print(result)


if __name__ == "__main__":
    main()
