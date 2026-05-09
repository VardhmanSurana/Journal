"""
Master dashboard writer.
Generates the main dashboard.md with all plugin blocks (Charts, Tracker, Dataview).
"""
from datetime import datetime
from pathlib import Path

from src.models import Trade, build_summary
from src.config import config
from src.ai import compute_advanced_analytics, generate_ai_insight
from src.writer.charts import (
    _chart_pnl_bar,
    _chart_cumulative,
    _chart_by_symbol,
    _chart_win_loss_pie,
)
from src.writer.queries import (
    _tracker_net_pnl,
    _tracker_commission,
    _dv_all_trades,
    _dv_this_month,
    _dv_winners,
    _dv_losers,
    _dv_by_symbol,
    _dv_by_direction,
)


def write_dashboard(trades: list[Trade], balance: list[dict]) -> Path:
    """Write the master dashboard with all plugin blocks."""
    summary = build_summary(trades)
    output_path = config.VAULT_PATH / "dashboard.md"

    if not summary:
        output_path.write_text("# Dashboard\n\nNo trades synced yet.\n", encoding="utf-8")
        return output_path

    win_rate = summary["win_rate"]
    win_icon = "📈" if win_rate >= 50 else "📉"
    synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    adv_metrics = compute_advanced_analytics(trades)
    ai_insight = generate_ai_insight(trades, adv_metrics)

    wallet_rows = ""
    for w in balance:
        sym = w.get("asset_symbol", "")
        bal = float(w.get("balance", 0))
        avail = float(w.get("available_balance", 0))
        if bal > 0:
            wallet_rows += f"| {sym} | `{round(bal, 4)}` | `{round(avail, 4)}` |\n"

    daily_folder = config.query_path("daily")

    # DataviewJS block is kept as a raw string to avoid f-string/JS brace conflicts
    equity_curve_js = _equity_curve_js(daily_folder)
    currency_toggle_js = _currency_toggle_js()

    content = f"""# 📊 Trade Journal Dashboard

{currency_toggle_js}

> Last synced: `{synced_at}`

## ⚡ Quick Stats

| Avg Win | Avg Loss | Best Trade | Worst Trade | Profit Factor |
|:---:|:---:|:---:|:---:|:---:|
| `+${adv_metrics.get('Avg Win', 0):.4f}` | `${adv_metrics.get('Avg Loss', 0):.4f}` | `+${summary.get('best_trade', 0):.4f}` | `${summary.get('worst_trade', 0):.4f}` | `{adv_metrics.get('Profit Factor', 'N/A')}` |
|:---:|:---:|:---:|:---:|:---:|

## 🤖 AI Trading Coach
{ai_insight}

---

## 📈 Performance Overview

| Metric | Value |
|---|---|
| Total Trades | `{summary["total_trades"]}` |
| Winners | 📈 `{summary["winners"]}` |
| Losers | 📉 `{summary["losers"]}` |
| Win Rate | {win_icon} `{win_rate}%` |
| Total Gross P&L | `${summary["total_gross_pnl"]}` |
| Total Commission | `${summary["total_commission"]}` |
| **Total Net P&L** | **`${summary["total_net_pnl"]}`** |




---

## 🏛️ Estimated Tax & Compliance

> [!NOTE]
> Performance is measured on **Net P&L** (after fees). Tax is an external obligation based on annual income.

| Provision Metric | Value |
|---|---|
| Est. Income Tax ({int(config.INCOME_TAX_SLAB*100)}% Slab) | `${summary["total_income_tax"]}` |
| **Est. Profit After Tax** | **`${summary["total_profit_after_tax"]}`** |
| Trading Turnover (Audit Limit: ₹10Cr) | `${summary["total_turnover"]}` |

### 📅 Advance Tax Deadlines
| Deadline | Percentage Due |
|---|---|
| June 15 | 15% |
| September 15 | 45% |
| December 15 | 75% |
| March 15 | 100% |


---

## 💰 Wallet Balances

| Asset | Balance | Available |
|---|---|---|
{wallet_rows}
---

## 📊 Charts

### Net P&L — Last 20 Trades

{_chart_pnl_bar(trades)}

### Cumulative P&L

{_chart_cumulative(trades)}

### P&L by Symbol

{_chart_by_symbol(trades)}

### Win / Loss Split

{_chart_win_loss_pie(summary)}

---

## 📈 Tracker — P&L Trend

{_tracker_net_pnl()}

### Commission Over Time

{_tracker_commission()}

---

## 📅 Calendar & Heatmap

> Daily notes are generated in `{daily_folder}` for compatibility with the **Calendar** and **Heatmap Calendar** plugins.

---

## 🗃️ Dataview Queries

### All Trades (newest first)

{_dv_all_trades()}

### Last 30 Days

{_dv_this_month()}

### Top 10 Winners

{_dv_winners()}

### Top 10 Losers

{_dv_losers()}

### P&L by Symbol

{_dv_by_symbol()}

### Long vs Short

{_dv_by_direction()}

---

## 📈 Interactive Equity Curve

> Live cumulative P&L chart powered by **Chart.js**.

{equity_curve_js}
"""

    output_path.write_text(content, encoding="utf-8")
    return output_path


def _equity_curve_js(daily_folder: str) -> str:
    """
    Return the DataviewJS equity curve block as a plain string.
    Kept separate from the f-string dashboard to avoid mixing Python
    brace-escaping with JavaScript object literal syntax.
    """
    return (
        "```dataviewjs\n"
        'dv.span("*(Loading Equity Curve...)*");\n'
        f'const pages = dv.pages(\'"{daily_folder}"\').where(p => p.net_pnl !== undefined).sort(p => p.file.name, "asc");\n'
        "\n"
        "let labels = [];\n"
        "let data = [];\n"
        "let cumulative = 0;\n"
        "\n"
        "for (let p of pages) {\n"
        '    labels.push(moment(p.file.name).format("MMM D"));\n'
        "    cumulative += p.net_pnl;\n"
        "    data.push(cumulative);\n"
        "}\n"
        "\n"
        'const chartId = "equity-chart-canvas";\n'
        "let canvas = document.getElementById(chartId);\n"
        "if (!canvas) {\n"
        "    canvas = document.createElement(\"canvas\");\n"
        "    canvas.id = chartId;\n"
        '    canvas.style.maxHeight = "400px";\n'
        '    canvas.style.marginTop = "20px";\n'
        "    this.container.appendChild(canvas);\n"
        "}\n"
        "\n"
        "function drawChart() {\n"
        "    if (window.myEquityChart) {\n"
        "        window.myEquityChart.destroy();\n"
        "    }\n"
        "    const ctx = canvas.getContext('2d');\n"
        "\n"
        "    const gradient = ctx.createLinearGradient(0, 0, 0, 400);\n"
        "    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');\n"
        "    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');\n"
        "\n"
        "    window.myEquityChart = new Chart(canvas, {\n"
        "        type: 'line',\n"
        "        data: {\n"
        "            labels: labels,\n"
        "            datasets: [{\n"
        "                label: 'Cumulative Net P&L',\n"
        "                data: data,\n"
        "                borderColor: '#22c55e',\n"
        "                backgroundColor: gradient,\n"
        "                borderWidth: 2,\n"
        "                pointBackgroundColor: '#18181b',\n"
        "                pointBorderColor: '#22c55e',\n"
        "                pointBorderWidth: 2,\n"
        "                pointRadius: 4,\n"
        "                pointHoverRadius: 6,\n"
        "                fill: true,\n"
        "                tension: 0.3\n"
        "            }]\n"
        "        },\n"
        "        options: {\n"
        "            responsive: true,\n"
        "            maintainAspectRatio: false,\n"
        "            plugins: {\n"
        "                legend: { display: false },\n"
        "                tooltip: {\n"
        "                    backgroundColor: 'rgba(0,0,0,0.8)',\n"
        "                    titleFont: { size: 14 },\n"
        "                    bodyFont: { size: 14 },\n"
        "                    callbacks: {\n"
        "                        label: function(context) {\n"
        "                            let val = context.parsed.y;\n"
        "                            return \" Net P&L: $\" + val.toFixed(2);\n"
        "                        }\n"
        "                    }\n"
        "                }\n"
        "            },\n"
        "            scales: {\n"
        "                x: { grid: { color: 'rgba(255,255,255,0.05)' } },\n"
        "                y: {\n"
        "                    grid: { color: 'rgba(255,255,255,0.05)' },\n"
        "                    ticks: { callback: function(value) { return '$' + value; } }\n"
        "                }\n"
        "            }\n"
        "        }\n"
        "    });\n"
        "}\n"
        "\n"
        'if (typeof Chart === "undefined") {\n'
        '    const script = document.createElement("script");\n'
        '    script.src = "https://cdn.jsdelivr.net/npm/chart.js";\n'
        "    script.onload = () => drawChart();\n"
        "    document.head.appendChild(script);\n"
        "} else {\n"
        "    drawChart();\n"
        "}\n"
        "\n"
        'setTimeout(() => { this.container.querySelector("span").style.display = "none"; }, 500);\n'
        "```"
    )

def _currency_toggle_js() -> str:
    """
    Returns a DataviewJS block that injects a global USD/INR toggle switch.
    Processes all text nodes to wrap currency values for dynamic conversion.
    """
    return r"""```dataviewjs
// --- Currency Conversion System ---
const RATE = 85;
let isINR = window.journal_isINR || false;
let isUpdating = false;
let hasProcessed = false;

const container = this.container;

// Inject Switch Styles (only once)
if (!document.getElementById('journal-switch-styles')) {
    const style = document.createElement('style');
    style.id = 'journal-switch-styles';
    style.innerHTML = `
        .journal-switch-container {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            margin: 10px 0 25px 0;
            font-family: var(--font-interface);
            font-size: 0.85em;
            font-weight: 600;
            color: var(--text-muted);
            user-select: none;
        }
        .journal-switch {
            position: relative;
            display: inline-block;
            width: 38px;
            height: 20px;
        }
        .journal-switch input {
            opacity: 0; width: 0; height: 0;
        }
        .journal-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: var(--background-modifier-border);
            transition: .2s;
            border-radius: 20px;
        }
        .journal-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .2s;
            border-radius: 50%;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        input:checked + .journal-slider {
            background-color: var(--interactive-accent);
        }
        input:checked + .journal-slider:before {
            transform: translateX(18px);
        }
        .journal-switch-label {
            transition: color 0.2s;
        }
        .journal-switch-label.active {
            color: var(--text-normal);
            text-shadow: 0 0 1px var(--text-normal);
        }
    `;
    document.head.appendChild(style);
}

// Create Switch UI
const wrapper = container.createEl('div', { cls: 'journal-switch-container' });
const usdLabel = wrapper.createEl('span', { text: 'USD', cls: `journal-switch-label ${!isINR ? 'active' : ''}` });

const label = wrapper.createEl('label', { cls: 'journal-switch' });
const input = label.createEl('input', { attr: { type: 'checkbox' } });
input.checked = isINR;
label.createEl('span', { cls: 'journal-slider' });

const inrLabel = wrapper.createEl('span', { text: 'INR', cls: `journal-switch-label ${isINR ? 'active' : ''}` });

// Currency regex: matches $123.45, $1,234.56, +$123, -$123, etc.
const CURRENCY_REGEX = /([+\-]?)\s*\$\s*([\d,]+(?:\.\d+)?)/g;

function processTextNode(textNode) {
    const parent = textNode.parentNode;
    if (!parent) return false;
    
    // Skip if already processed
    if (parent.classList && (parent.classList.contains('journal-currency') || 
        parent.classList.contains('crypto-currency-wrapped'))) {
        return false;
    }
    
    const text = textNode.nodeValue;
    if (!CURRENCY_REGEX.test(text)) return false;
    
    // Reset regex lastIndex
    CURRENCY_REGEX.lastIndex = 0;
    
    const span = document.createElement('span');
    span.className = 'crypto-currency-wrapped';
    span.innerHTML = text.replace(CURRENCY_REGEX, (match, sign, numStr) => {
        const rawNum = parseFloat(numStr.replace(/,/g, ''));
        return `<span class="journal-currency" data-usd="${rawNum}" data-sign="${sign}">${match}</span>`;
    });
    
    parent.replaceChild(span, textNode);
    return true;
}

function walkAndProcess(node) {
    if (node.nodeType === 3) {
        return processTextNode(node);
    }
    
    if (node.nodeType === 1) {
        // Skip script/style/canvas elements and already processed
        const tag = node.tagName;
        if (['SCRIPT', 'STYLE', 'CANVAS', 'SVG', 'NOSCRIPT'].includes(tag)) return false;
        if (node.classList && (node.classList.contains('journal-currency') || 
            node.classList.contains('crypto-currency-wrapped') ||
            node.classList.contains('journal-switch-container'))) {
            return false;
        }
        
        // Process all child text nodes
        let modified = false;
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let textNode;
        while (textNode = walker.nextNode()) {
            textNodes.push(textNode);
        }
        
        // Process in reverse to avoid index issues when replacing
        for (let i = textNodes.length - 1; i >= 0; i--) {
            if (processTextNode(textNodes[i])) {
                modified = true;
            }
        }
        
        return modified;
    }
    
    return false;
}

function updateUI() {
    if (isUpdating) return;
    isUpdating = true;
    
    // Update all currency spans
    const currencies = document.querySelectorAll('.journal-currency');
    for (let el of currencies) {
        const usd = parseFloat(el.getAttribute('data-usd'));
        const sign = el.getAttribute('data-sign') || '';
        if (isINR) {
            const inr = usd * RATE;
            el.textContent = sign + '₹' + inr.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        } else {
            el.textContent = sign + '$' + usd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4});
        }
    }
    
    // Update Chart.js if exists
    if (window.myEquityChart) {
        const chart = window.myEquityChart;
        chart.data.datasets[0].label = isINR ? 'Cumulative Net P&L (INR)' : 'Cumulative Net P&L (USD)';
        chart.options.scales.y.ticks.callback = function(value) {
            return isINR ? '₹' + (value * RATE).toLocaleString('en-IN') : '$' + value;
        };
        chart.options.plugins.tooltip.callbacks.label = function(context) {
            let val = context.parsed.y;
            return isINR ? ' Net P&L: ₹' + (val * RATE).toLocaleString('en-IN', {minimumFractionDigits: 2}) : ' Net P&L: $' + val.toLocaleString('en-US', {minimumFractionDigits: 2});
        };
        chart.update('none');
    }

    usdLabel.classList.toggle('active', !isINR);
    inrLabel.classList.toggle('active', isINR);

    isUpdating = false;
}

// Debounced update for mutation observer
let updateTimeout;
function debouncedUpdate() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        if (!isUpdating) {
            walkAndProcess(document.body);
            updateUI();
        }
    }, 100);
}

const observer = new MutationObserver((mutations) => {
    if (isUpdating) return;
    
    let hasNewContent = false;
    for (let m of mutations) {
        for (let node of m.addedNodes) {
            if (node.nodeType === 1 || node.nodeType === 3) {
                hasNewContent = true;
                break;
            }
        }
        if (hasNewContent) break;
    }
    
    if (hasNewContent) {
        debouncedUpdate();
    }
});

function startObserver() {
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        characterData: false
    });
}

input.onchange = () => {
    isINR = input.checked;
    window.journal_isINR = isINR;
    updateUI();
};

// Initial processing with retries for async content
function initialProcess(attempt = 1) {
    const maxAttempts = 5;
    walkAndProcess(document.body);
    updateUI();
    
    if (attempt < maxAttempts) {
        setTimeout(() => {
            walkAndProcess(document.body);
            updateUI();
        }, attempt * 300);
    }
    
    // Start observer after initial processing
    if (attempt === 1) {
        setTimeout(startObserver, 100);
    }
}

// Run initial processing
initialProcess();
```"""
