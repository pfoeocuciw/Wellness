import os
import re
import json
import mimetypes
from urllib.parse import urljoin, urlparse

import feedparser
import requests
from bs4 import BeautifulSoup
from slugify import slugify

from .config import USER_AGENT, REQUEST_TIMEOUT, IMAGE_DIR


HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "ru,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def truncate_text(text: str, max_len: int = 240) -> str:
    text = normalize_text(text)
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def fetch_text(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
    resp.raise_for_status()
    return resp.text


def fetch_feed(url: str):
    return feedparser.parse(url, request_headers=HEADERS)


def choose_root(soup: BeautifulSoup):
    selectors = [
        "article",
        ".article",
        ".post",
        ".entry-content",
        ".post-content",
        ".article-content",
        "main",
        "body",
    ]
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            return node
    return soup


def html_to_blocks(html: str):
    soup = BeautifulSoup(html, "lxml")
    root = choose_root(soup)

    blocks = []

    for el in root.find_all(["h2", "h3", "h4", "p", "ul", "ol", "blockquote"]):
        tag = el.name.lower()

        if tag == "p":
            text = normalize_text(el.get_text(" ", strip=True))
            if text:
                blocks.append({"type": "paragraph", "text": text})

        elif tag in ["h2", "h3", "h4"]:
            text = normalize_text(el.get_text(" ", strip=True))
            if text:
                level = int(tag[1])
                blocks.append({"type": "heading", "text": text, "level": level})

        elif tag == "ul":
            items = [normalize_text(li.get_text(" ", strip=True)) for li in el.find_all("li")]
            items = [x for x in items if x]
            if items:
                blocks.append({"type": "bullet-list", "items": items})

        elif tag == "ol":
            items = [normalize_text(li.get_text(" ", strip=True)) for li in el.find_all("li")]
            items = [x for x in items if x]
            if items:
                blocks.append({"type": "ordered-list", "items": items})

        elif tag == "blockquote":
            text = normalize_text(el.get_text(" ", strip=True))
            if text:
                blocks.append({"type": "quote", "text": text})

    return blocks


def meta_content(soup: BeautifulSoup, prop: str) -> str:
    node = soup.find("meta", attrs={"property": prop})
    if node and node.get("content"):
        return node["content"]
    node = soup.find("meta", attrs={"name": prop})
    if node and node.get("content"):
        return node["content"]
    return ""


def extract_author(soup: BeautifulSoup, fallback: str) -> str:
    candidates = [
        '[rel="author"]',
        '.author',
        '.article-author',
        '.post-author',
    ]
    for selector in candidates:
        node = soup.select_one(selector)
        if node:
            text = normalize_text(node.get_text(" ", strip=True))
            if text:
                return text
    return fallback


def extract_category(soup: BeautifulSoup, fallback: str) -> str:
    section = meta_content(soup, "article:section")
    if section:
        return normalize_text(section)

    node = soup.select_one(".category")
    if node:
        text = normalize_text(node.get_text(" ", strip=True))
        if text:
            return text

    return fallback


def parse_feed_datetime(entry) -> str | None:
    if getattr(entry, "published_parsed", None):
        import datetime
        dt = datetime.datetime(*entry.published_parsed[:6], tzinfo=datetime.timezone.utc)
        return dt.isoformat()
    if getattr(entry, "updated_parsed", None):
        import datetime
        dt = datetime.datetime(*entry.updated_parsed[:6], tzinfo=datetime.timezone.utc)
        return dt.isoformat()
    return None


def guess_image_url(soup: BeautifulSoup, article_url: str, entry) -> str:
    og = meta_content(soup, "og:image")
    if og:
        return urljoin(article_url, og)

    first_img = soup.select_one("article img, .post img, .entry-content img, img")
    if first_img:
        src = first_img.get("src") or first_img.get("data-src")
        if src:
            return urljoin(article_url, src)

    media_content = getattr(entry, "media_content", None)
    if media_content and isinstance(media_content, list):
        for item in media_content:
            url = item.get("url")
            if url:
                return url

    return ""


def safe_ext_from_url(url: str) -> str:
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    if ext in [".jpg", ".jpeg", ".png", ".webp"]:
        return ext
    guessed, _ = mimetypes.guess_type(url)
    if guessed == "image/png":
        return ".png"
    if guessed == "image/webp":
        return ".webp"
    return ".jpg"


def download_image(image_url: str, article_slug: str) -> str:
    if not image_url:
        return ""

    os.makedirs(IMAGE_DIR, exist_ok=True)

    ext = safe_ext_from_url(image_url)
    file_name = f"{article_slug}{ext}"
    abs_path = os.path.join(IMAGE_DIR, file_name)

    resp = requests.get(image_url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
    resp.raise_for_status()

    with open(abs_path, "wb") as f:
        f.write(resp.content)

    return f"/images/articles/{file_name}"


def parse_generic_article(entry, feed_config: dict) -> dict | None:
    article_url = getattr(entry, "link", None)
    if not article_url:
        return None

    html = fetch_text(article_url)
    soup = BeautifulSoup(html, "lxml")

    title = normalize_text(
        (soup.find("h1").get_text(" ", strip=True) if soup.find("h1") else "")
        or getattr(entry, "title", "")
    )
    if not title:
        title = "Без названия"

    annotation = normalize_text(
        meta_content(soup, "description")
        or (soup.find("p").get_text(" ", strip=True) if soup.find("p") else "")
        or title
    )
    annotation = truncate_text(annotation, 220)

    article_slug = slugify(title, lowercase=True)
    blocks = html_to_blocks(html)
    if not blocks:
        blocks = [{"type": "paragraph", "text": annotation}]

    image_url = guess_image_url(soup, article_url, entry)

    # Для RSS статей:
    # 1) если в источнике есть картинка — используем её (предпочтительно скачиваем локально),
    # 2) если картинки в источнике нет — fallback выберем позже на уровне БД.
    local_image = ""
    if image_url:
        try:
            local_image = download_image(image_url, article_slug)
        except Exception as e:
            print(f"⚠ failed to download image for '{title}': {e}")
            # Если скачать не получилось, оставляем исходный URL источника.
            local_image = image_url

    author_name = extract_author(soup, feed_config.get("author_name", "Редакция"))
    category = extract_category(soup, feed_config.get("default_category", "Здоровье"))
    published_at = parse_feed_datetime(entry)

    article = {
        "title": title,
        "slug": article_slug,
        "authorName": author_name,
        "authorBio": feed_config.get("author_bio"),
        "category": category,
        "annotation": annotation,
        "imageUrl": local_image,
        "imageAlt": title,
        "content": blocks,
        "sources": [
            {
                "title": "Оригинальная статья",
                "url": article_url,
                "type": "article",
            },
            {
                "title": f'{feed_config["title"]} RSS',
                "url": feed_config["rss_url"],
                "type": "rss",
            },
        ],
        "externalUrl": article_url,
        "sourceSite": urlparse(feed_config["site_url"]).netloc,
        "sourceRssUrl": feed_config["rss_url"],
        "guid": getattr(entry, "id", None) or getattr(entry, "guid", None) or article_url,
        "rawHtml": html,
        "published": True,
        "createdAt": published_at,
    }

    return article