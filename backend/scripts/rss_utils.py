import os
import re
import json
import uuid
import random
import requests
from bs4 import BeautifulSoup

FRONT_IMAGES_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "course_project_3", "public", "images", "articles")
)
os.makedirs(FRONT_IMAGES_DIR, exist_ok=True)

ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"]


def slugify(text: str) -> str:
    s = (text or "").strip().lower()
    s = s.replace("ё", "е")
    s = re.sub(r"[^\w\s-]", "", s, flags=re.U)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    s = s.strip("-")
    return s or uuid.uuid4().hex[:8]


def parse_html_to_content(html: str):
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    blocks = []

    top_level = list(soup.body.children) if soup.body else list(soup.children)
    for el in top_level:
        if not getattr(el, "name", None):
            continue
        name = el.name.lower()
        text = el.get_text(" ", strip=True)
        if not text:
            continue
        if name in ("h1", "h2"):
            blocks.append({"type": "heading", "level": 2, "text": text})
        elif name in ("h3", "h4"):
            blocks.append({"type": "heading", "level": 3, "text": text})
        elif name in ("p", "div"):
            blocks.append({"type": "paragraph", "text": text})
        elif name in ("ul", "ol"):
            for li in el.find_all("li"):
                t = li.get_text(" ", strip=True)
                if t:
                    blocks.append({"type": "paragraph", "text": f"• {t}"})
        else:
            blocks.append({"type": "paragraph", "text": text})

    if not blocks:
        text = soup.get_text(" ", strip=True)
        if text:
            blocks.append({"type": "paragraph", "text": text})

    return blocks


def extract_first_image_from_html(html: str):
    if not html:
        return None
    soup = BeautifulSoup(html, "html.parser")
    img = soup.find("img")
    if img and img.get("src"):
        return img["src"]
    return None


def download_image(url: str, slug_base: str, timeout: int = 10):
    """
    Попытка скачать картинку по URL и сохранить в FRONT_IMAGES_DIR.
    Возвращает относительный путь для imageUrl (/images/articles/...) или None.
    Логирует причину неудачи.
    """
    try:
        if not url or not isinstance(url, str):
            print(f"download_image: invalid url: {url}")
            return None

        if url.startswith("data:"):
            print("download_image: data URI, пропускаем")
            return None

        if url.startswith("/"):
            print(f"download_image: относительный URL (нужен базовый): {url}")
            return None

        resp = requests.get(url, timeout=timeout, allow_redirects=True, headers={"User-Agent": "rss-importer/1.0"})
        if resp.status_code != 200 or not resp.content:
            print(f"download_image: HTTP {resp.status_code} для {url}")
            return None

        ext = os.path.splitext(url.split("?")[0].split("#")[0])[-1].lower()
        if not ext:
            ct = resp.headers.get("content-type", "")
            if "jpeg" in ct or "jpg" in ct:
                ext = ".jpg"
            elif "png" in ct:
                ext = ".png"
            elif "gif" in ct:
                ext = ".gif"
            else:
                ext = ".png"
        if not ext.startswith("."):
            ext = "." + ext

        if ext not in ALLOWED_EXT:
            ext = ".png"

        fname = f"img_{slug_base}_{uuid.uuid4().hex[:8]}{ext}"
        path = os.path.join(FRONT_IMAGES_DIR, fname)
        with open(path, "wb") as f:
            f.write(resp.content)

        print(f"download_image: сохранено {fname}")
        return f"/images/articles/{fname}"
    except Exception as e:
        print(f"download_image error for {url}: {e}")
        return None


def pick_random_uploaded_image():
    try:
        files = [f for f in os.listdir(FRONT_IMAGES_DIR)
                 if os.path.splitext(f)[1].lower() in ALLOWED_EXT]
        if not files:
            return None
        chosen = random.choice(files)
        return f"/images/articles/{chosen}"
    except Exception as e:
        print(f"pick_random_uploaded_image error: {e}")
        return None