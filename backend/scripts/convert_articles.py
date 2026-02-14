import os
import json
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_DIR = os.path.join(BASE_DIR, "..", "articles_txt")
OUTPUT_FILE = os.path.join(BASE_DIR, "..", "articles.json")

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-zа-я0-9]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

def parse_article(text):
    article = {
        "title": "",
        "slug": "",
        "authorName": "",
        "authorBio": "",
        "category": "",
        "annotation": "",
        "imageUrl": "",
        "imageAlt": "",
        "content": [],
        "sources": []
    }

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    i = 0

    while i < len(lines):
        line = lines[i]

        # на всякий случай убираем BOM/невидимые символы в начале
        line = line.lstrip("\ufeff").strip()

        if line == "Название":
            i += 1
            if i < len(lines):
                article["title"] = lines[i].lstrip("\ufeff").strip()
                article["slug"] = slugify(article["title"])
                article["imageUrl"] = f"/images/articles/{article['slug']}.jpg"
                article["imageAlt"] = article["title"]

        elif line == "Автор":
            i += 1
            if i < len(lines):
                article["authorName"] = lines[i].lstrip("\ufeff").strip()
            i += 1
            if i < len(lines):
                article["authorBio"] = lines[i].lstrip("\ufeff").strip()

        elif line == "Категория":
            i += 1
            if i < len(lines):
                article["category"] = lines[i].lstrip("\ufeff").strip()

        elif line == "Аннотация":
            i += 1
            if i < len(lines):
                article["annotation"] = lines[i].lstrip("\ufeff").strip()

        elif line == "Источники":
            i += 1
            while i < len(lines):
                article["sources"].append(lines[i].lstrip("\ufeff").strip())
                i += 1
            break

        elif line == "Заголовок":
            i += 1
            if i < len(lines):
                article["content"].append({
                    "type": "heading",
                    "level": 2,
                    "text": lines[i].lstrip("\ufeff").strip()
                })

        elif line == "Подзаголовок":
            i += 1
            if i < len(lines):
                article["content"].append({
                    "type": "heading",
                    "level": 3,
                    "text": lines[i].lstrip("\ufeff").strip()
                })

        elif line.startswith("* "):
            items = []
            while i < len(lines) and lines[i].lstrip("\ufeff").strip().startswith("* "):
                items.append(lines[i].lstrip("\ufeff").strip()[2:])
                i += 1
            article["content"].append({
                "type": "bullet-list",
                "items": items
            })
            continue

        else:
            article["content"].append({
                "type": "paragraph",
                "text": line
            })

        i += 1

    return article


def main():
    articles = []

    # диагностика
    if not os.path.isdir(INPUT_DIR):
        raise FileNotFoundError(f"INPUT_DIR not found: {INPUT_DIR}")

    for filename in sorted(os.listdir(INPUT_DIR)):
        if filename.endswith(".txt"):
            path = os.path.join(INPUT_DIR, filename)
            with open(path, encoding="utf-8") as f:
                text = f.read()
                articles.append(parse_article(text))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    print(f"{len(articles)} статей успешно конвертировано!")
    print("INPUT_DIR =", INPUT_DIR)
    print("OUTPUT_FILE =", OUTPUT_FILE)


if __name__ == "__main__":
    main()
