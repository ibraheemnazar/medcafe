"""Render bounded-size JPEG pages before publication, never in a phone browser."""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

MAX_EDGE = 1600
RENDER_VERSION = "jpeg-v1"


def prepare_page_images(pdf_path, output_root, identity, page_count):
    directory = Path(output_root) / RENDER_VERSION / identity
    manifest = directory / "manifest.json"
    if manifest.exists():
        existing = json.loads(manifest.read_text())
        if len(existing) == page_count and all((directory / item["file"]).is_file() for item in existing):
            return existing
    directory.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".render-", dir=directory.parent) as temporary:
        target = Path(temporary)
        try:
            subprocess.run([
                "pdftoppm", "-scale-to", str(MAX_EDGE), "-jpeg",
                "-jpegopt", "quality=88,optimize=y", str(pdf_path), str(target / "page"),
            ], timeout=180, check=True, capture_output=True)
            paths = sorted(target.glob("page-*.jpg"), key=lambda path: int(path.stem.split("-")[-1]))
            if len(paths) != page_count:
                raise ValueError("Not all menu pages could be prepared.")
            pages = []
            for index, source in enumerate(paths, 1):
                with Image.open(source) as image:
                    width, height = image.size
                if min(width, height) < 1 or max(width, height) > MAX_EDGE:
                    raise ValueError("The PDF contains an unsupported page size.")
                filename = f"{index}.jpg"
                source.rename(target / filename)
                pages.append({"file": filename, "width": width, "height": height})
            (target / "manifest.json").write_text(json.dumps(pages))
            # Only completed directories become visible to readers.
            if directory.exists():
                shutil.rmtree(directory)
            target.rename(directory)
            return pages
        except (subprocess.SubprocessError, OSError) as error:
            raise ValueError("This PDF could not be prepared for phones. Export a simpler PDF and try again.") from error


def read_page_images(root, identity):
    manifest = Path(root) / RENDER_VERSION / identity / "manifest.json"
    return json.loads(manifest.read_text()) if manifest.exists() else []
