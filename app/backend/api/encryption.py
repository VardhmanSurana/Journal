import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from api.config import config

_fernet_instance = None

def get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance
    
    # Use API secret to derive the secure key, fallback to a standard hardcoded salt key if not set
    secret = config.READ_ONLY_SECRET or "delta_journal_fallback_default_encryption_secret_key"
    salt = b"delta_journal_secure_database_salt_2026"
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
    _fernet_instance = Fernet(key)
    return _fernet_instance

def encrypt_text(text: str | None) -> str | None:
    if not text:
        return text
    try:
        f = get_fernet()
        return f.encrypt(text.encode()).decode()
    except Exception as e:
        print(f"Encryption failed: {e}")
        return text

def decrypt_text(encrypted_text: str | None) -> str | None:
    if not encrypted_text:
        return encrypted_text
    # All Fernet tokens start with gAAAAA
    if not encrypted_text.startswith("gAAAAA"):
        return encrypted_text
    try:
        f = get_fernet()
        return f.decrypt(encrypted_text.encode()).decode()
    except Exception as e:
        # Fallback to plain text on any failure (so we don't break existing data)
        return encrypted_text
