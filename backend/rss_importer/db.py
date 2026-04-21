import json
from datetime import datetime, timezone
from typing import Optional, Any

import psycopg2
from psycopg2.extras import Json, RealDictCursor

from .config import DATABASE_URL, IMPORT_JOB_NAME, IMPORT_MIN_HOURS, PG_ADVISORY_LOCK_KEY

DEFAULT_ARTICLE_IMAGE = "/images/articles/img_нарушения-сна-у-жителей-мегаполиса_65237053.png"


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def utc_now():
    return datetime.now(timezone.utc)


def _ensure_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _normalize_sources(value: Any) -> list[str]:
    """
    Приводим sources к списку строк, чтобы фронт не падал
    на объектах вида {url, type, title}.
    """
    if value is None:
        return []

    if isinstance(value, str):
        return [value]

    if not isinstance(value, list):
        return []

    result: list[str] = []

    for item in value:
        if isinstance(item, str):
            text = item.strip()
            if text:
                result.append(text)
            continue

        if isinstance(item, dict):
            # приоритет: url -> title -> json string
            url = item.get("url")
            title = item.get("title")

            if isinstance(url, str) and url.strip():
                result.append(url.strip())
                continue

            if isinstance(title, str) and title.strip():
                result.append(title.strip())
                continue

            try:
                result.append(json.dumps(item, ensure_ascii=False))
            except Exception:
                pass

    return result


def _normalize_content(value: Any) -> list[dict]:
    """
    Приводим content к массиву блоков для фронта.
    Ожидаемые типы:
      - paragraph
      - heading
      - bullet-list
      - ordered-list
      - quote
    """
    if value is None:
        return []

    if isinstance(value, str):
        text = value.strip()
        return [{"type": "paragraph", "text": text}] if text else []

    if not isinstance(value, list):
        return []

    normalized: list[dict] = []

    for item in value:
        if isinstance(item, str):
            text = item.strip()
            if text:
                normalized.append({"type": "paragraph", "text": text})
            continue

        if not isinstance(item, dict):
            continue

        block_type = item.get("type")

        if block_type == "paragraph":
            text = str(item.get("text", "")).strip()
            if text:
                normalized.append({"type": "paragraph", "text": text})

        elif block_type == "heading":
            text = str(item.get("text", "")).strip()
            level = item.get("level", 2)
            if text:
                if level not in [1, 2, 3, 4]:
                    level = 2
                normalized.append({"type": "heading", "text": text, "level": level})

        elif block_type == "bullet-list":
            items = item.get("items", [])
            if isinstance(items, list):
                cleaned = [str(x).strip() for x in items if str(x).strip()]
                if cleaned:
                    normalized.append({"type": "bullet-list", "items": cleaned})

        elif block_type == "ordered-list":
            items = item.get("items", [])
            if isinstance(items, list):
                cleaned = [str(x).strip() for x in items if str(x).strip()]
                if cleaned:
                    normalized.append({"type": "ordered-list", "items": cleaned})

        elif block_type == "quote":
            text = str(item.get("text", "")).strip()
            if text:
                normalized.append({"type": "quote", "text": text})

        else:
            # если тип неизвестен, но есть text — сохраняем как paragraph
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                normalized.append({"type": "paragraph", "text": text.strip()})

    return normalized


def _normalize_image_url(value: Any) -> Optional[str]:
    if value is None:
        return None

    if not isinstance(value, str):
        return None

    value = value.strip()
    if not value:
        return None

    # если случайно сохранили путь с /public, для Next надо убрать /public
    if value.startswith("/public/"):
        return value[len("/public"):]

    return value


def _normalize_annotation(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_string(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def pick_random_article_image(conn) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT "imageUrl"
            FROM "Article"
            WHERE COALESCE("imageUrl", '') <> ''
            ORDER BY RANDOM()
            LIMIT 1
            """
        )
        row = cur.fetchone()

    if row and row[0]:
        return str(row[0]).strip() or DEFAULT_ARTICLE_IMAGE

    return DEFAULT_ARTICLE_IMAGE


def acquire_lock(conn) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT pg_try_advisory_lock(%s);", (PG_ADVISORY_LOCK_KEY,))
        row = cur.fetchone()
        return bool(row[0])


def release_lock(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT pg_advisory_unlock(%s);", (PG_ADVISORY_LOCK_KEY,))
    conn.commit()


def get_last_success(conn) -> Optional[dict]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
            FROM "ImportRun"
            WHERE "jobName" = %s AND "status" = 'success'
            ORDER BY "startedAt" DESC
            LIMIT 1
            """,
            (IMPORT_JOB_NAME,),
        )
        return cur.fetchone()


def should_run(conn) -> tuple[bool, str]:
    last = get_last_success(conn)
    if not last:
        return True, "never-ran"

    started_at = _ensure_aware(last["startedAt"])
    now = utc_now()

    if started_at is None:
        return True, "missing-startedAt"

    diff_hours = (now - started_at).total_seconds() / 3600

    if diff_hours >= IMPORT_MIN_HOURS:
        return True, "interval-expired"

    return False, f"too-early-last-success={started_at.isoformat()}"


def create_import_run(conn, trigger: str) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "ImportRun" ("id", "jobName", "status", "trigger")
            VALUES (gen_random_uuid()::text, %s, 'running', %s)
            RETURNING "id";
            """,
            (IMPORT_JOB_NAME, trigger),
        )
        run_id = cur.fetchone()[0]
    conn.commit()
    return run_id


def finish_import_run(conn, run_id: str, status: str, message: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "ImportRun"
            SET "status" = %s,
                "message" = %s,
                "finishedAt" = NOW()
            WHERE "id" = %s
            """,
            (status, message, run_id),
        )
    conn.commit()


def slug_exists_for_other(conn, slug: str, external_url: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM "Article"
            WHERE "slug" = %s
              AND COALESCE("externalUrl", '') <> COALESCE(%s, '')
            LIMIT 1
            """,
            (slug, external_url),
        )
        return cur.fetchone() is not None


def ensure_unique_slug(conn, base_slug: str, external_url: str) -> str:
    candidate = base_slug
    counter = 2

    while slug_exists_for_other(conn, candidate, external_url):
        candidate = f"{base_slug}-{counter}"
        counter += 1

    return candidate


def upsert_article(conn, article: dict):
    normalized_content = _normalize_content(article.get("content"))
    normalized_sources = _normalize_sources(article.get("sources"))
    normalized_image_url = _normalize_image_url(article.get("imageUrl"))
    if not normalized_image_url:
        normalized_image_url = pick_random_article_image(conn)
    normalized_image_alt = _normalize_string(article.get("imageAlt"))
    normalized_author_name = _normalize_string(article.get("authorName")) or "Редакция"
    normalized_author_bio = _normalize_string(article.get("authorBio"))
    normalized_category = _normalize_string(article.get("category")) or "Без категории"
    normalized_annotation = _normalize_annotation(article.get("annotation"))
    normalized_external_url = _normalize_string(article.get("externalUrl"))
    normalized_source_site = _normalize_string(article.get("sourceSite"))
    normalized_source_rss_url = _normalize_string(article.get("sourceRssUrl"))
    normalized_guid = _normalize_string(article.get("guid"))
    normalized_raw_html = article.get("rawHtml")

    base_slug = _normalize_string(article.get("slug")) or "article"
    unique_slug = ensure_unique_slug(conn, base_slug, normalized_external_url)

    created_at = article.get("createdAt")
    if isinstance(created_at, datetime):
        created_at = _ensure_aware(created_at)
    else:
        created_at = None

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "Article" (
                "id",
                "title",
                "slug",
                "authorName",
                "authorBio",
                "category",
                "annotation",
                "imageUrl",
                "imageAlt",
                "content",
                "sources",
                "published",
                "externalUrl",
                "sourceSite",
                "sourceRssUrl",
                "guid",
                "rawHtml",
                "importedAt",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                gen_random_uuid()::text,
                %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s,
                NOW(),
                COALESCE(%s::timestamptz, NOW()),
                NOW()
            )
            ON CONFLICT ("externalUrl")
            DO UPDATE SET
                "title" = EXCLUDED."title",
                "slug" = EXCLUDED."slug",
                "authorName" = EXCLUDED."authorName",
                "authorBio" = EXCLUDED."authorBio",
                "category" = EXCLUDED."category",
                "annotation" = EXCLUDED."annotation",
                "imageUrl" = EXCLUDED."imageUrl",
                "imageAlt" = EXCLUDED."imageAlt",
                "content" = EXCLUDED."content",
                "sources" = EXCLUDED."sources",
                "published" = EXCLUDED."published",
                "sourceSite" = EXCLUDED."sourceSite",
                "sourceRssUrl" = EXCLUDED."sourceRssUrl",
                "guid" = EXCLUDED."guid",
                "rawHtml" = EXCLUDED."rawHtml",
                "updatedAt" = NOW()
            """,
            (
                article["title"],
                unique_slug,
                normalized_author_name,
                normalized_author_bio,
                normalized_category,
                normalized_annotation,
                normalized_image_url,
                normalized_image_alt,
                Json(normalized_content),
                Json(normalized_sources),
                article.get("published", True),
                normalized_external_url,
                normalized_source_site,
                normalized_source_rss_url,
                normalized_guid,
                normalized_raw_html,
                created_at,
            ),
        )
    conn.commit()