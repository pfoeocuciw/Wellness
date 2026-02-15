import os
import json
import re
import hashlib
import random


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TXT_DIR = os.path.join(BASE_DIR, "..", "articles_txt")
IMAGES_RAW_DIR = os.path.join(BASE_DIR, "..", "articles_images_raw")
OUT_JSON = os.path.join(BASE_DIR, "..", "articles.json")

FRONT_IMAGES_DIR = os.path.join(
    BASE_DIR, "..", "..", "course_project_3", "public", "images", "articles"
)

SUPPORTED_EXT = [".png"]


def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)

def pick_random_image(img_index: dict):
    if not img_index:
        return None
    all_images = []
    for paths in img_index.values():
        all_images.extend(paths)
    if not all_images:
        return None
    return random.choice(all_images)


def read_text_any_encoding(path: str) -> str:
    """Пробуем несколько частых кодировок для Windows/Mac txt."""
    for enc in ("utf-8-sig", "utf-8", "cp1251"):
        try:
            with open(path, "r", encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    # последний шанс: прочитать как utf-8 с заменой
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def norm_text(s: str) -> str:
    s = (s or "").strip().lower()
    s = s.replace("\ufeff", "")  # BOM если вдруг попал в строку
    s = s.replace("ё", "е")
    s = s.replace("—", "-").replace("–", "-")
    s = re.sub(r"\s+", " ", s)
    return s


def slugify(text: str) -> str:
    text = norm_text(text)
    text = re.sub(r"[^a-zа-я0-9]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text

def safe_image_filename(slug: str, ext: str = ".png", max_base: int = 80) -> str:
    """
    Делает короткое безопасное имя файла, чтобы не упираться в лимит пути Windows.
    Пример: img_izmeneniya-klinicheskogo-sostoyaniya..._a1b2c3d4.png
    """
    slug = slug or "article"
    # хэш от полного slug, чтобы уникально
    h = hashlib.sha1(slug.encode("utf-8")).hexdigest()[:8]
    base = slug[:max_base].rstrip("-")
    return f"img_{base}_{h}{ext}"

def build_image_index():
    """key = slugify(имя файла без .png), value = список путей"""
    index = {}
    if not os.path.isdir(IMAGES_RAW_DIR):
        return index

    for root, _, files in os.walk(IMAGES_RAW_DIR):
        for fn in files:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in SUPPORTED_EXT:
                continue
            base = os.path.splitext(fn)[0]
            key = slugify(base)
            full = os.path.join(root, fn)
            index.setdefault(key, []).append(full)

    for k in index:
        index[k].sort(key=lambda p: len(os.path.basename(p)))
    return index


def pick_image_for_article_slug(img_index: dict, article_slug: str):
    if not article_slug:
        return None

    # 1) точное совпадение
    if article_slug in img_index:
        return img_index[article_slug][0]

    # 2) варианты с -1/-2 (если картинка так названа)
    for suffix in ("-1", "-2", "-3", "-4"):
        k = f"{article_slug}{suffix}"
        if k in img_index:
            return img_index[k][0]

    # 3) префикс (картинка короче, статья длиннее)
    best_key = None
    best_len = 0
    for img_slug in img_index.keys():
        if img_slug and article_slug.startswith(img_slug):
            l = len(img_slug)
            if l > best_len:
                best_len = l
                best_key = img_slug
    if best_key:
        return img_index[best_key][0]

    # 4) "похожесть по словам" (fuzzy)
    a_tokens = [t for t in article_slug.split("-") if len(t) >= 3]
    if not a_tokens:
        return None
    a_set = set(a_tokens)

    best_key = None
    best_score = 0

    for img_slug in img_index.keys():
        if not img_slug:
            continue
        i_tokens = [t for t in img_slug.split("-") if len(t) >= 3]
        if not i_tokens:
            continue
        i_set = set(i_tokens)

        common = len(a_set & i_set)
        if common == 0:
            continue

        # штраф за сильно разную длину + бонус за common
        score = common * 10 - abs(len(a_tokens) - len(i_tokens))

        # небольшой бонус, если хотя бы первые 1-2 слова совпадают
        if len(a_tokens) >= 1 and len(i_tokens) >= 1 and a_tokens[0] == i_tokens[0]:
            score += 3
        if len(a_tokens) >= 2 and len(i_tokens) >= 2 and a_tokens[1] == i_tokens[1]:
            score += 2

        if score > best_score:
            best_score = score
            best_key = img_slug

    # порог: чтобы не присваивать совсем левую картинку
    if best_key and best_score >= 12:  # обычно common >=2
        return img_index[best_key][0]

    return None


def is_label(line: str, label: str) -> bool:
    """Понимает 'Название', 'Название:', 'Название   :' и т.п."""
    l = norm_text(line)
    lbl = norm_text(label)
    l = l.rstrip(":").strip()
    return l == lbl

def clear_generated_images(folder: str):
    if not os.path.isdir(folder):
        return
    for fn in os.listdir(folder):
        if fn.lower().endswith(".png"):
            try:
                os.remove(os.path.join(folder, fn))
            except Exception:
                pass


def parse_article(text: str, filename: str):
    a = {
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

    # сохраняем пустые строки как разделители не нужно — но фильтруем совсем пустые
    raw_lines = [ln.replace("\r", "").strip() for ln in text.split("\n")]
    lines = [ln for ln in raw_lines if ln.strip()]

    def next_nonempty(idx):
        j = idx + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        return j

    i = 0
    while i < len(lines):
        line = lines[i]

        if is_label(line, "Название"):
            j = next_nonempty(i)
            if j < len(lines):
                a["title"] = lines[j].strip()
                a["slug"] = slugify(a["title"])
                a["imageAlt"] = a["title"]
                i = j

        elif is_label(line, "Автор"):
            j = next_nonempty(i)
            if j < len(lines):
                a["authorName"] = lines[j].strip()
                k = next_nonempty(j)
                if k < len(lines) and not is_label(lines[k], "Категория") and not is_label(lines[k], "Аннотация"):
                    a["authorBio"] = lines[k].strip()
                    i = k
                else:
                    i = j

        elif is_label(line, "Категория"):
            j = next_nonempty(i)
            if j < len(lines):
                a["category"] = lines[j].strip()
                i = j

        elif is_label(line, "Аннотация"):
            j = next_nonempty(i)
            if j < len(lines):
                a["annotation"] = lines[j].strip()
                i = j

        elif is_label(line, "Источники"):
            j = i + 1
            while j < len(lines):
                if lines[j].strip():
                    a["sources"].append(lines[j].strip())
                j += 1
            break

        # Контентные метки
        elif is_label(line, "Заголовок"):
            j = next_nonempty(i)
            if j < len(lines):
                a["content"].append({"type": "heading", "level": 2, "text": lines[j].strip()})
                i = j

        elif is_label(line, "Подзаголовок"):
            j = next_nonempty(i)
            if j < len(lines):
                a["content"].append({"type": "heading", "level": 3, "text": lines[j].strip()})
                i = j

        else:
            # пропускаем служебные слова типа "Текст"
            if norm_text(line) in ("текст",):
                i += 1
                continue

            # обычный параграф
            a["content"].append({"type": "paragraph", "text": line.strip()})

        i += 1

    # fallback: если не нашли title — возьмём первую строку файла как заголовок
    if not a["title"]:
        for ln in lines:
            if ln.strip():
                a["title"] = ln.strip()
                a["slug"] = slugify(a["title"])
                a["imageAlt"] = a["title"]
                break

    # если всё равно пусто — хотя бы по имени файла
    if not a["title"]:
        a["title"] = os.path.splitext(filename)[0]
        a["slug"] = slugify(a["title"])
        a["imageAlt"] = a["title"]

    return a


def main():
    ensure_dir(FRONT_IMAGES_DIR)
    clear_generated_images(FRONT_IMAGES_DIR)

    img_index = build_image_index()
    if not img_index:
        print("❌ Не нашёл PNG в articles_images_raw. Проверь папку и расширения.")
        return

    articles = []
    missing = []

    txt_files = [fn for fn in os.listdir(TXT_DIR) if fn.lower().endswith(".txt")]
    txt_files.sort()

    for fn in txt_files:
        path = os.path.join(TXT_DIR, fn)
        text = read_text_any_encoding(path)

        a = parse_article(text, fn)

        img_path = pick_image_for_article_slug(img_index, a["slug"])
        if img_path:
            new_name = safe_image_filename(a["slug"], ".png")
            dst = os.path.join(FRONT_IMAGES_DIR, new_name)
            with open(img_path, "rb") as r:
                with open(dst, "wb") as w:
                    w.write(r.read())
            a["imageUrl"] = f"/images/articles/{new_name}"
        else:
            # берём случайную картинку
            random_img = pick_random_image(img_index)

            if random_img:
                new_name = safe_image_filename(a["slug"], ".png")
                dst = os.path.join(FRONT_IMAGES_DIR, new_name)

                with open(random_img, "rb") as r:
                    with open(dst, "wb") as w:
                        w.write(r.read())

                a["imageUrl"] = f"/images/articles/{new_name}"
            else:
                a["imageUrl"] = "/images/articles/placeholder.png"

            missing.append(f"{a['title']} (использована случайная картинка)")


        articles.append(a)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    found = len(articles) - len(missing)
    print(f"✅ articles.json создан: {len(articles)} статей")
    print(f"✅ Картинки скопированы в: {FRONT_IMAGES_DIR}")
    print(f"✅ Найдено картинок: {found} из {len(articles)}")

    if missing:
        print("\n⚠️ Не нашёл картинки для:")
        for x in missing:
            print(" -", x)


if __name__ == "__main__":
    main()
