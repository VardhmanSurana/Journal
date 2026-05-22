import pytest
from datetime import datetime, timezone
from api.client import parse_delta_timestamp
from api.encryption import encrypt_text, decrypt_text

def test_parse_delta_timestamp_microseconds():
    # Microsecond integer timestamp
    raw = 1678045806327000
    parsed = parse_delta_timestamp(raw)
    assert parsed.year == 2023
    assert parsed.month == 3
    assert parsed.day == 5
    assert parsed.tzinfo == timezone.utc

def test_parse_delta_timestamp_iso():
    # ISO-8601 string timestamp
    raw = "2026-05-22T23:46:16.000Z"
    parsed = parse_delta_timestamp(raw)
    assert parsed.year == 2026
    assert parsed.month == 5
    assert parsed.day == 22
    assert parsed.hour == 23
    assert parsed.minute == 46
    assert parsed.second == 16
    assert parsed.tzinfo == timezone.utc

def test_parse_delta_timestamp_fallback():
    # Blank fallback
    parsed = parse_delta_timestamp("")
    assert isinstance(parsed, datetime)
    assert parsed.tzinfo == timezone.utc

def test_encryption_roundtrip():
    original_text = "This is a highly sensitive trade note about mistake 101."
    
    # Encrypt
    encrypted = encrypt_text(original_text)
    assert encrypted != original_text
    assert encrypted.startswith("gAAAAA")  # Fernet tokens signature
    
    # Decrypt
    decrypted = decrypt_text(encrypted)
    assert decrypted == original_text

def test_encryption_fallback():
    # Plain text should not crash or modify, just return gracefully
    plain = "Already existing plain text note"
    decrypted = decrypt_text(plain)
    assert decrypted == plain

    # None handling
    assert encrypt_text(None) is None
    assert decrypt_text(None) is None
