#!/usr/bin/env python3
import os
import sys
import json
import uuid
import feedparser
import psycopg2
import psycopg2.extras
from datetime import datetime
from dotenv import load_dotenv

from rss_utils import slugify, parse_html_to_content, extract_first_image_from_html, download_image, pick_random_uploaded_image

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL") or "postgresql://postgres:postgres@db:5432/cursach_db"
FEEDS_FILE = os.path.join(os.path.dirname(__file__), "feeds.txt")
DEFAULT_CATEGORY = os.environ.get("RSS_DEFAULT_CATEGORY", "Новости")


def get_feeds_list():
    if os.path.exists(FEEDS_FILE):
        with open(FEEDS_FILE, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f.readlines()]
            return [l for l in lines if l and not l.startswith("#")]
    return []


def connect_db():
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def article_exists(conn, slug):
    with conn.cursor() as cur:
        cur.execute('SELECT id FROM "Article" WHERE slug = %s LIMIT 1', (slug,))
        return cur.fetchone() is not None


def insert_article(conn, article):
    sql = """
    INSERT INTO "Article" (id, title, slug, "authorName", "authorBio", category, annotation, "imageUrl", "imageAlt", content, sources, published)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
    ON CONFLICT ("slug") DO NOTHING
    RETURNING id;
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            article["id"],
            article["title"],
            article["slug"],
            article.get("authorName", ""),
            article.get("authorBio", None),
            article.get("category", DEFAULT_CATEGORY),
            article.get("annotation", ""),
            article.get("imageUrl", "/images/articles/placeholder.png"),
            article.get("imageAlt", article["title"]),
            json.dumps(article.get("content", []), ensure_ascii=False),
            json.dumps(article.get("sources", []), ensure_ascii=False),
            article.get("published", True)
        ))
        res = cur.fetchone()
        conn.commit()
        return res[0] if res else None


def build_article_from_feed_item(item, feed_title):
    title = item.get("title") or "Без названия"
    slug = slugify(title)
    author = item.get("author") or item.get("dc_creator", "") or ""
    summary = item.get("summary") or item.get("description") or ""
    content_html = ""
    if "content" in item and item["content"]:
        content_html = item["content"][0].get("value", "")
    else:
        content_html = item.get("description", "") or summary

    content_blocks = parse_html_to_content(content_html)
    image_url = extract_first_image_from_html(content_html) \
                or (item.get("media_thumbnail", [{}])[0].get("url") if item.get("media_thumbnail") else None) \
                or (item.get("media_content", [{}])[0].get("url") if item.get("media_content") else None) \
                or (item.get("enclosures", [{}])[0].get("href") if item.get("enclosures") else None)

    local_image = None
    if image_url and isinstance(image_url, str):
        local_image = download_image(image_url, slug)

    if not local_image:
        local_image = pick_random_uploaded_image()

    sources = [{
        "title": feed_title or item.get("source", {}).get("title", ""),
        "url": item.get("link", "")
    }]

    article = {
        "id": str(uuid.uuid4()),
        "title": title,
        "slug": slug,
        "authorName": author or "RSS",
        "authorBio": None,
        "category": DEFAULT_CATEGORY,
        "annotation": (summary or "").strip()[:800],
        "imageUrl": local_image or "/images/articles/placeholder.png",
        "imageAlt": title,
        "content": content_blocks,
        "sources": sources,
        "published": True
    }
    return article


def process_feed(conn, url):
    print(f"Парсинг {url}")
    feed = feedparser.parse(url)
    feed_title = feed.feed.get("title", "") if feed.feed else ""
    count = 0
    skipped = 0

    for entry in feed.entries:
        try:
            article = build_article_from_feed_item(entry, feed_title)
            if article_exists(conn, article["slug"]):
                skipped += 1
                continue
            inserted = insert_article(conn, article)
            if inserted:
                count += 1
                print(f"  + Добавлена: {article['title']}")
        except Exception as e:
            print(f"  ! Ошибка обработки записи: {e}")

    print(f"Результат: добавлено {count}, пропущено (дубликаты) {skipped}")


def main():
    feeds = get_feeds_list()
    if not feeds:
        print("Нет RSS фидов. Поместите url'ы в backend/scripts/feeds.txt по одной на строке.")
        sys.exit(0)

    conn = connect_db()
    try:
        for url in feeds:
            process_feed(conn, url)
    finally:
        conn.close()


if __name__ == "__main__":
    main()