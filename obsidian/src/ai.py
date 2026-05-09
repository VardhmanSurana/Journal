import json
import requests
from typing import List, Dict, Any
from src.config import config
from src.models import Trade

def compute_advanced_analytics(trades: List[Trade]) -> Dict[str, Any]:
    if not trades:
        return {}
    
    gross_profits = sum(t.net_pnl for t in trades if t.net_pnl > 0)
    gross_losses = abs(sum(t.net_pnl for t in trades if t.net_pnl <= 0))
    profit_factor = round(gross_profits / gross_losses, 2) if gross_losses > 0 else float('inf')
    
    winners = [t.net_pnl for t in trades if t.net_pnl > 0]
    losers = [t.net_pnl for t in trades if t.net_pnl <= 0]
    
    avg_win = sum(winners) / len(winners) if winners else 0
    avg_loss = sum(losers) / len(losers) if losers else 0
    
    risk_reward = abs(round(avg_win / avg_loss, 2)) if avg_loss != 0 else float('inf')
    expectancy = round((len(winners) / len(trades)) * avg_win + (len(losers) / len(trades)) * avg_loss, 4)
    
    # Calculate Max Drawdown
    cumulative = 0
    peak = 0
    max_dd = 0
    for t in sorted(trades, key=lambda x: x.entry_time):
        cumulative += t.net_pnl
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd
            
    return {
        "Profit Factor": profit_factor,
        "Reward:Risk Ratio": risk_reward,
        "Expectancy ($/trade)": expectancy,
        "Max Drawdown ($)": round(max_dd, 4),
        "Avg Win": round(avg_win, 4),
        "Avg Loss": round(avg_loss, 4)
    }

def generate_ai_insight(trades: List[Trade], analytics: Dict[str, Any]) -> str:
    if not config.GEMINI_API_KEY and not config.USE_VERTEX_AI:
        return "> ⚠️ **AI Analysis Disabled:** Set `GEMINI_API_KEY` or `USE_VERTEX_AI=true` in your `.env` file to unlock automated trading coach insights."
        
    if not trades:
        return "> *Not enough trade data for AI analysis.*"
        
    recent_trades = sorted(trades, key=lambda x: x.entry_time, reverse=True)[:20]
    trade_lines = []
    for t in recent_trades:
        hold_time = (t.exit_time - t.entry_time).total_seconds() / 60 if t.exit_time else 0
        trade_lines.append(f"{t.symbol} {t.direction}: PnL {t.net_pnl:.2f}, Hold: {hold_time:.1f} mins")

    prompt = f"""
    You are an elite, objective quantitative trading coach analyzing a retail trader's log.

    Overall Analytics:
    Profit Factor: {analytics.get('Profit Factor')}
    Reward:Risk: {analytics.get('Reward:Risk Ratio')}
    Expectancy: ${analytics.get('Expectancy ($/trade)')}
    Max Drawdown: ${analytics.get('Max Drawdown ($)')}

    Recent Trades (Last {len(recent_trades)}):
    {chr(10).join(trade_lines)}

    Provide exactly 3 bullet points of punchy, actionable, and analytical feedback. Focus on risk management, holding times, win/loss disparities, or directional bias. Be direct, professional, and do not use generic fluff.
    """

    try:
        if config.USE_VERTEX_AI:
            import google.auth
            import google.auth.transport.requests
            
            creds, _ = google.auth.default()
            auth_req = google.auth.transport.requests.Request()
            creds.refresh(auth_req)
            
            url = f"https://{config.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/{config.VERTEX_PROJECT_ID}/locations/{config.VERTEX_LOCATION}/publishers/google/models/{config.VERTEX_MODEL}:streamGenerateContent"
            headers = {
                "Authorization": f"Bearer {creds.token}",
                "Content-Type": "application/json",
            }
            # Vertex AI streamGenerateContent returns a list of objects, but we only need the first one's text for now
            # or we can use :generateContent
            url = url.replace(":streamGenerateContent", ":generateContent")
        else:
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": config.GEMINI_API_KEY,
            }

        response = requests.post(
            url,
            headers=headers,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3},
            },
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        
        # Vertex AI and AI Studio have slightly different response formats for generateContent
        if "candidates" in data and len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                return candidate["content"]["parts"][0]["text"]
        
        return "> *AI analysis failed: Unexpected API response format.*"
    except ImportError:
        return "> *AI analysis unavailable: `google-auth` library missing. Run `uv add google-auth`.*"
    except Exception as e:
        return f"> *AI analysis unavailable: {str(e)}*"
