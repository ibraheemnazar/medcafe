"""Backfill phone previews without changing menu content or publication order."""
import fcntl
import os
import sqlite3
from contextlib import closing
from pathlib import Path
from menu_images import prepare_page_images

directory = Path(os.environ.get("DATA_DIR", "/data"))
with open(directory / "publish.lock", "a") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    with closing(sqlite3.connect(directory / "admin.sqlite")) as database:
        menus = database.execute("SELECT id, pages FROM menus").fetchall()
    for identity, pages in menus:
        prepare_page_images(directory / "files" / f"{identity}.pdf", directory / "page-images", identity, pages)
        print(f"Prepared {pages} pages for {identity[:12]}")
