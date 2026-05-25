import pytest
from datetime import datetime, timezone
from api.raw_parser import parse_delta_copy_paste

def test_parse_delta_copy_paste_standard():
    raw_text = (
        "2026-05-14 23:3 ETHUSD 2 sell 2.000000000000 2301.8 2187.05 46.036 0.02444512 0 0 market_order closed 1316974108\n"
        "2026-05-14 23:3 ETHUSD 3 buy 3.000000000000 2309.9 2424.65 2309.8 69.297 0.03679671 -0.20600001 -0.20600001 market_order closed 1316969762\n"
        "2026-05-14 23:3 ETHUSD 3 buy 0.000000000000000000/3.000000000000000000 2295.1 0 market_order cancelled position_closed 1316969234\n"
        "2026-05-14 23:3 ETHUSD 1 sell 1.000000000000 2305.5 2191.1 23.055 0.01224221 0 0 market_order closed 1316968338"
    )
    
    parsed = parse_delta_copy_paste(raw_text)
    
    # We should have exactly 3 parsed fills (the cancelled one is skipped because filled qty is 0)
    assert len(parsed) == 3
    
    # 1st parsed fill: Sell 2
    fill1 = parsed[0]
    assert fill1["symbol"] == "ETHUSD"
    assert fill1["side"] == "sell"
    assert fill1["price"] == 2301.8
    assert fill1["size"] == 2.0
    assert fill1["fee"] == 0.02444512
    assert fill1["notional"] == 46.036
    assert fill1["order_id"] == "1316974108"
    assert fill1["exchange_id"] == "copy_paste_1316974108"
    assert fill1["timestamp"].year == 2026
    assert fill1["timestamp"].month == 5
    assert fill1["timestamp"].day == 14
    assert fill1["timestamp"].hour == 17
    assert fill1["timestamp"].minute == 33
    assert fill1["timestamp"].tzinfo == timezone.utc
    
    # 2nd parsed fill: Buy 3
    fill2 = parsed[1]
    assert fill2["side"] == "buy"
    assert fill2["price"] == 2309.9
    assert fill2["size"] == 3.0
    assert fill2["fee"] == 0.03679671
    assert fill2["notional"] == 69.297
    assert fill2["order_id"] == "1316969762"
    
    # 3rd parsed fill: Sell 1
    fill3 = parsed[2]
    assert fill3["side"] == "sell"
    assert fill3["price"] == 2305.5
    assert fill3["size"] == 1.0
    assert fill3["fee"] == 0.01224221
    assert fill3["notional"] == 23.055
    assert fill3["order_id"] == "1316968338"

def test_parse_delta_copy_paste_single_line():
    raw_text = "2026-05-14 23:3 ETHUSD 2 sell 2.000000000000 2301.8 2187.05 46.036 0.02444512 0 0 market_order closed 1316974108"
    parsed = parse_delta_copy_paste(raw_text)
    assert len(parsed) == 1
    assert parsed[0]["order_id"] == "1316974108"

def test_parse_delta_copy_paste_empty():
    assert parse_delta_copy_paste("") == []
    assert parse_delta_copy_paste("   \n   ") == []
    assert parse_delta_copy_paste("invalid text log format here") == []
