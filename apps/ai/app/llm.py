"""
LLM Client — thin wrapper around Groq (free Llama 3 inference).

Responsibilities:
  1. Load the API key from the environment
  2. Initialise the Groq client once (singleton)
  3. Expose a single `ask(prompt) -> str` function for the rest of the app

Why a separate module?
  extraction.py decides WHAT to ask (the prompt).
  llm.py decides HOW to talk to the model (SDK, retries, config).
  If we ever swap Groq for another provider, only this file changes.
"""

import logging
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()  # reads apps/ai/.env

logger = logging.getLogger(__name__)

# --- Initialise the Groq client ---
_api_key = os.getenv("GROQ_API_KEY")
if not _api_key:
    raise RuntimeError("GROQ_API_KEY is not set — add it to apps/ai/.env")

_client = Groq(api_key=_api_key)

# llama-3.3-70b-versatile — free, fast, excellent at structured JSON extraction
MODEL = "llama-3.3-70b-versatile"


def ask(prompt: str) -> str:
    """
    Send a prompt to Groq and return the raw text response.

    Args:
        prompt: The full prompt string (system instructions + user data).

    Returns:
        The model's text response as a plain string.

    Raises:
        RuntimeError: If the API call fails for any reason.
    """
    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,  # deterministic — we want consistent JSON, not creativity
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise RuntimeError(f"LLM call failed: {e}")
