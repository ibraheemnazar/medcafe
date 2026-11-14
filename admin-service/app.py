"""Small, persistent menu admin. Credentials and uploaded files live outside Git."""
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import time
from functools import wraps
from contextlib import closing
from pathlib import Path

from flask import Flask, abort, g, jsonify, redirect, render_template, request, send_file, url_for
from pypdf import PdfReader
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

MAX_BYTES = 20 * 1024 * 1024
MAX_PAGES = 100
SESSION_SECONDS = 8 * 60 * 60


def validate_pdf(data):
    if not data or len(data) > MAX_BYTES:
        raise ValueError("Choose a PDF no larger than 20 MB.")
    if not data.startswith(b"%PDF-"):
        raise ValueError("This file is not a PDF.")
    try:
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted:
            raise ValueError("Use a PDF without password protection.")
        pages = len(reader.pages)
        if not 1 <= pages <= MAX_PAGES:
            raise ValueError("Choose a PDF with 1 to 100 pages.")
        # Resolve each page now, before making the file available to customers.
        for page in reader.pages:
            if page.mediabox.width <= 0 or page.mediabox.height <= 0:
                raise ValueError("This PDF has an invalid page size.")
        return pages
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("This PDF cannot be opened. Export a new PDF and try again.") from error


def create_app(settings=None):
    app = Flask(__name__, root_path=str(Path(__file__).resolve().parent))
    app.config.update(
        DATA_DIR=os.environ.get("DATA_DIR", "/data"),
        PUBLIC_ORIGIN=os.environ.get("PUBLIC_ORIGIN", "https://medcafe.srv2124063.hstgr.cloud"),
        CAFE_ORIGIN="https://medcafe-one.vercel.app",
        SECURE_COOKIES=True,
        MAX_CONTENT_LENGTH=MAX_BYTES + 128 * 1024,
        MAX_FORM_MEMORY_SIZE=512 * 1024,
        MAX_FORM_PARTS=8,
        TRUSTED_HOSTS=["medcafe.srv2124063.hstgr.cloud", "localhost", "127.0.0.1"],
    )
    if settings:
        app.config.update(settings)
    # Only our directly connected reverse proxy is trusted for the client IP.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
    directory = Path(app.config["DATA_DIR"])
    directory.mkdir(parents=True, exist_ok=True)
    files = directory / "files"
    files.mkdir(mode=0o700, exist_ok=True)
    cookie_name = "__Host-medcafe-admin" if app.config["SECURE_COOKIES"] else "medcafe-admin"
    credentials_path = directory / "credentials.json"
    if not credentials_path.exists():
        raise RuntimeError("Initialize the admin credentials before starting the server.")
    with closing(sqlite3.connect(directory / "admin.sqlite")) as database:
        database.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, version TEXT NOT NULL, expires INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS attempts (
                bucket INTEGER NOT NULL, ip_hash TEXT NOT NULL, count INTEGER NOT NULL,
                PRIMARY KEY(bucket, ip_hash)
            );
            CREATE TABLE IF NOT EXISTS menus (
                id TEXT PRIMARY KEY, filename TEXT NOT NULL, size INTEGER NOT NULL,
                pages INTEGER NOT NULL, published INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS current_menu (singleton INTEGER PRIMARY KEY CHECK(singleton=1), id TEXT NOT NULL);
        """)

    def db():
        if "db" not in g:
            g.db = sqlite3.connect(directory / "admin.sqlite", timeout=10)
            g.db.row_factory = sqlite3.Row
        return g.db

    @app.teardown_appcontext
    def close_db(_error):
        database = g.pop("db", None)
        if database is not None:
            database.close()

    def credentials():
        return json.loads(credentials_path.read_text())

    def cookie(response, token, seconds=SESSION_SECONDS):
        response.set_cookie(cookie_name, token, max_age=seconds, secure=app.config["SECURE_COOKIES"], httponly=True, samesite="Strict", path="/")
        return response

    def save_credentials(value):
        temporary = credentials_path.with_suffix(".tmp")
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            json.dump(value, stream)
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(credentials_path)

    def new_session(version):
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        now = int(time.time())
        with db():
            db().execute("DELETE FROM sessions WHERE expires <= ?", (now,))
            db().execute("INSERT INTO sessions VALUES (?, ?, ?, ?)", (hashlib.sha256(token.encode()).hexdigest(), csrf, version, now + SESSION_SECONDS))
        return token

    def throttle_login():
        now = int(time.time())
        bucket = now // 900
        ip = request.remote_addr or "unknown"
        ip_hash = hmac.new(credentials()["rate_secret"].encode(), ip.encode(), hashlib.sha256).hexdigest()
        database = db()
        with database:
            database.execute("BEGIN IMMEDIATE")
            database.execute("DELETE FROM attempts WHERE bucket < ?", (bucket - 1,))
            row = database.execute("SELECT count FROM attempts WHERE bucket=? AND ip_hash=?", (bucket, ip_hash)).fetchone()
            if row and row["count"] >= 10:
                return False
            database.execute("INSERT INTO attempts VALUES (?, ?, 1) ON CONFLICT(bucket, ip_hash) DO UPDATE SET count=count+1", (bucket, ip_hash))
        return True

    def current():
        row = db().execute("SELECT menus.* FROM menus JOIN current_menu ON menus.id=current_menu.id WHERE singleton=1").fetchone()
        return dict(row) if row else None

    def publish(data, filename):
        pages = validate_pdf(data)
        identity = hashlib.sha256(data).hexdigest()
        target = files / f"{identity}.pdf"
        if not target.exists():
            temporary = files / f"{secrets.token_hex(16)}.tmp"
            descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            temporary.replace(target)
        name = re.sub(r"[\x00-\x1f\x7f/\\]", "", filename).strip()[:150] or "menu.pdf"
        with db():
            db().execute("INSERT INTO menus VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET filename=excluded.filename, published=excluded.published", (identity, name, len(data), pages, int(time.time())))
            db().execute("INSERT INTO current_menu VALUES(1, ?) ON CONFLICT(singleton) DO UPDATE SET id=excluded.id", (identity,))
        return identity

    app.publish_pdf = publish

    @app.before_request
    def authenticate():
        g.session = None
        token = request.cookies.get(cookie_name, "")
        if token and len(token) <= 100:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            row = db().execute("SELECT * FROM sessions WHERE token_hash=? AND expires>?", (token_hash, int(time.time()))).fetchone()
            if row and hmac.compare_digest(row["version"], credentials()["version"]):
                g.session = dict(row)
        if request.method == "POST":
            if request.headers.get("Origin") != app.config["PUBLIC_ORIGIN"]:
                abort(403)
            if request.endpoint != "login":
                if not g.session:
                    abort(401)
                csrf = request.form.get("csrf", "")
                if not hmac.compare_digest(csrf, g.session["csrf"]):
                    abort(403)

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        if request.path.startswith("/admin"):
            response.headers["Cache-Control"] = "no-store"
            response.headers["X-Robots-Tag"] = "noindex, nofollow"
        if app.config["SECURE_COOKIES"]:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        if request.path.startswith("/menu/"):
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges"
        return response

    def admin_required(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not g.session:
                return redirect(url_for("login"), code=303)
            return view(*args, **kwargs)
        return wrapped

    def dashboard(error=None, success=None, status=200):
        menu = current()
        return render_template("dashboard.html", menu=menu, csrf=g.session["csrf"], username=credentials()["username"], error=error, success=success, cafe_url=app.config["CAFE_ORIGIN"]), status

    @app.get("/")
    def index():
        return redirect(url_for("admin"), code=302)

    @app.get("/health")
    def health():
        db().execute("SELECT 1").fetchone()
        return jsonify(ok=True, menuReady=current() is not None)

    @app.route("/admin/login", methods=["GET", "POST"])
    def login():
        if request.method == "GET":
            if g.session:
                return redirect(url_for("admin"), code=303)
            return render_template("login.html", cafe_url=app.config["CAFE_ORIGIN"])
        if not throttle_login():
            return render_template("login.html", error="Too many sign-in attempts. Try again in 15 minutes.", cafe_url=app.config["CAFE_ORIGIN"]), 429, {"Retry-After": "900"}
        username, password = request.form.get("username", ""), request.form.get("password", "")
        config = credentials()
        valid_password = len(password) <= 256 and check_password_hash(config["password_hash"], password)
        if not valid_password or not hmac.compare_digest(username.encode(), config["username"].encode()):
            return render_template("login.html", error="Incorrect username or password.", cafe_url=app.config["CAFE_ORIGIN"]), 401
        return cookie(redirect(url_for("admin"), code=303), new_session(config["version"]))

    @app.get("/admin")
    @admin_required
    def admin():
        success = "Your new menu is live. Customers can view it from the same QR code." if request.args.get("published") == "1" else None
        if request.args.get("account") == "1":
            success = "Your username and password have been updated."
        return dashboard(success=success)

    @app.post("/admin/upload")
    @admin_required
    def upload():
        upload_file = request.files.get("file")
        if not upload_file or not upload_file.filename:
            return dashboard(error="Choose a PDF to upload.", status=400)
        if not upload_file.filename.lower().endswith(".pdf"):
            return dashboard(error="Choose a PDF file.", status=400)
        try:
            publish(upload_file.read(MAX_BYTES + 1), upload_file.filename)
        except ValueError as error:
            return dashboard(error=str(error), status=400)
        return redirect(url_for("admin", published="1"), code=303)

    @app.post("/admin/account")
    @admin_required
    def account():
        config = credentials()
        old_password = request.form.get("current_password", "")
        if len(old_password) > 256 or not check_password_hash(config["password_hash"], old_password):
            return dashboard(error="Your current password is incorrect.", status=400)
        username = request.form.get("username", "").strip()
        password = request.form.get("new_password", "")
        if not re.fullmatch(r"[A-Za-z0-9._-]{3,64}", username):
            return dashboard(error="Use 3–64 letters, numbers, dots, underscores, or hyphens for the username.", status=400)
        if not 12 <= len(password) <= 128 or password != request.form.get("confirm_password"):
            return dashboard(error="Use a password of 12–128 characters and enter it identically twice.", status=400)
        config.update(username=username, password_hash=generate_password_hash(password), version=secrets.token_hex(32))
        save_credentials(config)
        with db():
            db().execute("DELETE FROM sessions")
        return cookie(redirect(url_for("admin", account="1"), code=303), new_session(config["version"]))

    @app.post("/admin/logout")
    def logout():
        with db():
            db().execute("DELETE FROM sessions WHERE token_hash=?", (g.session["token_hash"],))
        return cookie(redirect(url_for("login"), code=303), "", 0)

    @app.get("/api/menu")
    def menu_metadata():
        menu = current()
        if not menu:
            return jsonify(error="No menu published"), 503
        return jsonify(kind="pdf", menu={"id": menu["id"], "filename": menu["filename"], "size": menu["size"], "pages": menu["pages"]}, url=f'{app.config["PUBLIC_ORIGIN"]}/menu/{menu["id"]}.pdf'), 200, {"Cache-Control": "no-store"}

    @app.get("/menu/<identity>.pdf")
    def menu_pdf(identity):
        if not re.fullmatch(r"[a-f0-9]{64}", identity) or not db().execute("SELECT 1 FROM menus WHERE id=?", (identity,)).fetchone():
            abort(404)
        response = send_file(files / f"{identity}.pdf", mimetype="application/pdf", download_name="menu.pdf", conditional=True, max_age=31536000)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    @app.errorhandler(RequestEntityTooLarge)
    def too_large(_error):
        if g.get("session"):
            return dashboard(error="Choose a PDF no larger than 20 MB.", status=413)
        return "Request too large", 413

    return app
