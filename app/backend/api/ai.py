import json
import os
from ollama import Client
from pydantic import BaseModel, Field
from typing import List
from api.config import config


class TradeCritique(BaseModel):
    pattern_identified: str = Field(
        description="Core behavioral or market pattern identified (e.g., 'FOMO chasing', 'Early exit on winning trend')."
    )
    psychological_state: str = Field(
        description="Inferred emotional state based on execution timing, spread, and stop loss context."
    )
    mistakes: List[str] = Field(
        description="List of execution or tactical mistakes made during this trade lifecycle."
    )
    actionable_suggestion: str = Field(
        description="A concrete, specific prompt rule for future trades."
    )
    risk_metric_score: int = Field(
        description="A score from 1 to 10 evaluating emotional discipline, where 10 is flawless execution.",
        ge=1, le=10
    )


MODEL = "gemini-2.5-pro"

PROMPT = """You are an expert quantitative trading psychologist and risk management auditor.
Analyze the following execution profile for a closed trade:

---
Ticker: {symbol}
Direction: {direction}
Entry Price: {entry_price} | Size: {size}
Exit Price: {exit_price}
Gross P&L: ${gross_pnl:.2f} | Net P&L: ${net_pnl:.2f} | Fees: ${fees:.2f}
Result: {result}
Holding Period: {holding_minutes:.0f} minutes
Strategy: {strategy}
Pre-Trade Plan: "{pre_plan}"
Trader Notes: "{notes}"
Mistakes/Deviations: {mistakes}
---

Correlate the entry/exit timing against the P&L to determine if they cut winners early or held losers past safety thresholds.

Return ONLY valid JSON matching this exact schema:
{{
  "pattern_identified": "string",
  "psychological_state": "string",
  "mistakes": ["string", ...],
  "actionable_suggestion": "string",
  "risk_metric_score": integer (1-10)
}}"""

SYSTEM_MSG = "You are an expert quantitative trading psychologist."


def _format_prompt(trade: dict) -> str:
    return PROMPT.format(
        symbol=trade.get("symbol", "?"),
        direction=trade.get("direction", "?"),
        entry_price=trade.get("avg_entry", 0),
        size=trade.get("size", 0),
        exit_price=trade.get("avg_exit", 0),
        gross_pnl=float(trade.get("gross_profit", 0)),
        net_pnl=float(trade.get("net_profit", 0)),
        fees=float(trade.get("fees", 0)),
        result=trade.get("result", "?"),
        holding_minutes=float(trade.get("holding_minutes", 0)),
        strategy=trade.get("strategy", "none"),
        pre_plan=trade.get("pre_plan", "none"),
        notes=trade.get("notes", "none"),
        mistakes=trade.get("mistakes", "none"),
    )


def _analyze_vertex(prompt: str) -> TradeCritique:
    from google import genai
    from google.genai import types
    project_id = os.getenv("PROJECT_ID", "")
    if not project_id:
        raise ValueError("Set PROJECT_ID in .env for Vertex AI.")
    client = genai.Client(vertexai=True, project=project_id, location="us-central1")
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=TradeCritique,
        ),
    )
    analysis: TradeCritique | None = response.parsed
    if analysis is None:
        raise ValueError("Model returned empty response")
    return analysis


def _get_ollama_client() -> Client:
    return Client()


def _ensure_ollama_model() -> None:
    client = _get_ollama_client()
    model = config.OLLAMA_MODEL
    installed = [m["model"] for m in client.list().get("models", [])]
    if model in installed or f"{model}:latest" in installed:
        return
    print(f"Pulling Ollama model '{model}' (this may take a while)...")
    client.pull(model)
    print(f"Ollama model '{model}' pulled successfully.")


def _analyze_ollama(prompt: str) -> TradeCritique:
    _ensure_ollama_model()
    client = _get_ollama_client()
    response = client.chat(
        model=config.OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_MSG},
            {"role": "user", "content": prompt},
        ],
        format="json",
        options={"temperature": 0.1},
    )
    raw = response.get("message", {}).get("content", "")
    parsed = json.loads(raw)
    return TradeCritique(**parsed)


def analyze_trade(trade: dict) -> dict:
    prompt = _format_prompt(trade)
    try:
        if config.AI_PROVIDER == "ollama":
            analysis = _analyze_ollama(prompt)
        else:
            analysis = _analyze_vertex(prompt)
        return {
            "score": analysis.risk_metric_score,
            "strengths": "N/A",
            "weaknesses": "; ".join(analysis.mistakes) if analysis.mistakes else "N/A",
            "pattern": analysis.pattern_identified,
            "suggestion": analysis.actionable_suggestion,
            "psychological_state": analysis.psychological_state,
        }
    except Exception as e:
        raise ValueError(f"{config.AI_PROVIDER.title()} analysis failed: {e}")
