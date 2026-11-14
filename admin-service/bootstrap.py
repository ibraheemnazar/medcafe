"""Generate first credentials once; refuse to overwrite an existing account."""
import json
import os
import secrets
import sys
from pathlib import Path
from werkzeug.security import generate_password_hash

target = Path(sys.argv[1])
username = sys.argv[2] if len(sys.argv) > 2 else "medcafe"
password = secrets.token_urlsafe(18)
config = {"username": username, "password_hash": generate_password_hash(password), "version": secrets.token_hex(32), "rate_secret": secrets.token_hex(32)}
target.parent.mkdir(parents=True, exist_ok=True)
descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, "w") as stream:
    json.dump(config, stream)
print(f"Username: {username}\nPassword: {password}")
