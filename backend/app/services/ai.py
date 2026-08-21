"""
AI service - Claude LLM integration
-------------------------------------
Used for:
  1. Summarising a government scheme into plain, easy-to-understand language.
  2. Suggesting alternative schemes/actions for citizens who missed one.

Requires ANTHROPIC_API_KEY. Falls back to a deterministic templated
response in DEMO_MODE / when no key is configured, so the endpoints keep
working during local development.
"""
from app.config import settings

try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None


def _client():
    if not settings.ANTHROPIC_API_KEY or anthropic is None:
        return None
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def summarize_scheme(name: str, raw_description: str = "") -> dict:
    client = _client()
    if client is None:
        return {
            "summary": f"{name} is a welfare initiative designed to provide essential support and benefits to eligible citizens.",
            "pros": [],
            "cons": [],
        }
    prompt = (
        f"Summarize the Indian government scheme '{name}' in simple, easy-to-understand words (1-2 sentences) "
        f"explaining who benefits and what assistance is provided. Avoid any technical jargon or citations. Context: {raw_description or 'no extra context provided'}.\n"
        "Respond ONLY as JSON with key: summary (1-2 clear sentences in simple English)."
    )
    msg = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    import json
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    try:
        data = json.loads(text)
        return {"summary": data.get("summary", text), "pros": [], "cons": []}
    except Exception:
        return {"summary": text, "pros": [], "cons": []}


def suggest_alternatives(citizen_context: dict, missed_scheme_name: str) -> str:
    client = _client()
    if client is None:
        return (
            f"Citizen missed '{missed_scheme_name}'. Suggested next step: check "
            f"nearby camps for re-enrolment and review adjacent schemes matching "
            f"the citizen's verified documents. Configure ANTHROPIC_API_KEY for "
            f"live, personalised AI suggestions."
        )
    prompt = (
        f"A citizen missed the scheme '{missed_scheme_name}'. Citizen context: "
        f"{citizen_context}. In 2-3 sentences, suggest what the government "
        f"official should do next or which alternative scheme to recommend."
    )
    msg = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
