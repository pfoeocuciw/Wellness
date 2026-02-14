import os
import json
import re

INPUT_DIR = "../articles_txt"
OUTPUT_FILE = "../articles.json"

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

        if line == "Название":
            i += 1
            article["title"] = lines[i]
            article["slug"] = slugify(article["title"])
            article["imageUrl"] = f"/images/articles/{article['slug']}.jpg"
            article["imageAlt"] = article["title"]

        elif line == "Автор":
            i += 1
            article["authorName"] = lines[i]
            i += 1
            article["authorBio"] = lines[i]

        elif line == "Категория":
            i += 1
            article["category"] = lines[i]

        elif line == "Аннотация":
            i += 1
            article["annotation"] = lines[i]

        elif line == "Источники":
            i += 1
            while i < len(lines):
                article["sources"].append(lines[i])
                i += 1
            break

        elif line == "Заголовок":
            i += 1
            article["content"].append({
                "type": "heading",
                "level": 2,
                "text": lines[i]
            })

        elif line == "Подзаголовок":
            i += 1
            article["content"].append({
                "type": "heading",
                "level": 3,
                "text": lines[i]
            })

        elif line.startswith("* "):
            items = []
            while i < len(lines) and lines[i].startswith("* "):
                items.append(lines[i][2:])
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

    for filename in os.listdir(INPUT_DIR):
        if filename.endswith(".txt"):
            with open(os.path.join(INPUT_DIR, filename), encoding="utf-8") as f:
                text = f.read()
                article = parse_article(text)
                articles.append(article)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    print(f"{len(articles)} статей успешно конвертировано!")


if __name__ == "__main__":
    main()
