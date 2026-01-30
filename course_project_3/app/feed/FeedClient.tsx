"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "./feed.module.css";

/** ======================
 *  UI model for Feed
 *  ====================== */
type FeedArticle = {
    id: string;
    title: string;
    coverUrl: string;
    tags: string[];
    authorName: string;
    publishedAt: string; // ISO (or any parseable date string)
};

/** ======================
 *  Mock fallback articles
 *  ====================== */
const MOCK_ARTICLES: FeedArticle[] = [
    {
        id: "1",
        title: "ЙОГА ДЛЯ НАЧИНАЮЩИХ: ПЕРВЫЕ ШАГИ К ГАРМОНИИ",
        coverUrl: "/articles/yoga.svg",
        tags: ["йога", "гибкость", "бодрость", "утренняя зарядка"],
        authorName: "Мария Петрова",
        publishedAt: "2024-01-13",
    },
    {
        id: "2",
        title: "КАК ПОДНЯТЬ ЭНЕРГИЮ УТРОМ: 7 ПРОСТЫХ ПРИВЫЧЕК",
        coverUrl: "/articles/yoga.svg",
        tags: ["бодрость", "витамины", "сон"],
        authorName: "Алексей Смирнов",
        publishedAt: "2024-02-02",
    },
    {
        id: "3",
        title: "МЕНТАЛЬНОЕ ЗДОРОВЬЕ: БАЗОВЫЕ ПРАКТИКИ НА КАЖДЫЙ ДЕНЬ",
        coverUrl: "/articles/yoga.svg",
        tags: ["ментальное здоровье", "стресс", "привычки"],
        authorName: "Екатерина Иванова",
        publishedAt: "2024-03-18",
    },
];

const ALL_TAG = "все";

/** ======================
 *  Helpers: formatting
 *  ====================== */
function formatRuDate(dateStr: string) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

/** ======================
 *  Helpers: normalization
 *  (protects you from unknown backend shape)
 *  ====================== */
function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function pickFirstString(...vals: unknown[]): string {
    for (const v of vals) {
        if (typeof v === "string" && v.trim()) return v;
    }
    return "";
}

function normalizeTags(raw: unknown): string[] {
    // ["tag1","tag2"]
    if (Array.isArray(raw)) {
        return raw
            .map((t: unknown) => {
                if (typeof t === "string") return t;
                const obj = asRecord(t);
                return pickFirstString(obj.name, obj.title, obj.tag);
            })
            .filter((s): s is string => Boolean(s));
    }

    // "tag1,tag2"
    if (typeof raw === "string") {
        return raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    return [];
}

function normalizeArticle(raw: unknown): FeedArticle | null {
    const obj = asRecord(raw);

    const authorRaw = obj.author ?? obj.user ?? obj.expert;
    const authorObj = asRecord(authorRaw);

    const authorName =
        (typeof authorRaw === "string" && authorRaw) ||
        pickFirstString(authorObj.name, authorObj.fullName, obj.authorName, obj.author_name) ||
        "Неизвестный автор";

    const id = pickFirstString(obj.id, obj._id, obj.slug);
    const title = pickFirstString(obj.title, obj.name);
    const coverUrl = pickFirstString(
        obj.coverUrl,
        obj.cover_url,
        obj.cover,
        obj.image,
        obj.imageUrl,
        obj.image_url,
        obj.photoUrl,
        obj.photo_url
    );

    const tags = normalizeTags(obj.tags ?? obj.tagList ?? obj.articleTags);
    const publishedAt = pickFirstString(obj.publishedAt, obj.published_at, obj.date, obj.createdAt, obj.created_at);

    if (!id || !title) return null;

    return {
        id,
        title,
        coverUrl: coverUrl || "/articles/placeholder.jpg", // можешь добавить заглушку в public/articles
        tags,
        authorName,
        publishedAt: publishedAt || new Date().toISOString(),
    };
}

/** ======================
 *  Search icon
 *  ====================== */
function SearchIcon() {
    return (
        <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.2 16.2L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/** ======================
 *  Component
 *  ====================== */
export default function FeedClient() {
    const [query, setQuery] = useState<string>("");
    const [selectedTags, setSelectedTags] = useState<string[]>([ALL_TAG]);
    const [showAllTags, setShowAllTags] = useState<boolean>(false);

    const [articles, setArticles] = useState<FeedArticle[]>(MOCK_ARTICLES);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string>("");

    // load from backend, fallback to mocks
    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setLoadError("");

            try {
                const res = await fetch("/api/articles", { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data: unknown = await res.json();

                // accept: [] or {items: []} or {data: []}
                const maybeObj = asRecord(data);
                const listUnknown: unknown =
                    Array.isArray(data) ? data : Array.isArray(maybeObj.items) ? maybeObj.items : Array.isArray(maybeObj.data) ? maybeObj.data : [];

                const list = Array.isArray(listUnknown) ? listUnknown : [];

                const normalized = list
                    .map((item: unknown) => normalizeArticle(item))
                    .filter((a): a is FeedArticle => a !== null);

                if (alive) {
                    setArticles(normalized.length ? normalized : MOCK_ARTICLES);
                }
            } catch (e) {
                if (alive) {
                    setArticles(MOCK_ARTICLES);
                    //setLoadError("Не удалось загрузить статьи с сервера. Показаны тестовые статьи.");
                }
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();

        return () => {
            alive = false;
        };
    }, []);

    const allTags = useMemo(() => {
        const tags = Array.from(new Set(articles.flatMap((a) => a.tags)));
        return [ALL_TAG, ...tags];
    }, [articles]);

    const visibleTags = useMemo(() => {
        return showAllTags ? allTags : allTags.slice(0, 5);
    }, [allTags, showAllTags]);

    const selectedWithoutAll = useMemo(() => selectedTags.filter((t) => t !== ALL_TAG), [selectedTags]);

    const filteredArticles = useMemo(() => {
        const q = query.trim().toLowerCase();

        return articles.filter((a) => {
            const byTitle = !q || a.title.toLowerCase().includes(q);

            // only "all"
            if (selectedTags.length === 1 && selectedTags[0] === ALL_TAG) return byTitle;

            // OR logic for multiple tags
            const byTags =
                selectedWithoutAll.length === 0 ? true : selectedWithoutAll.some((t) => a.tags.includes(t));

            return byTitle && byTags;
        });
    }, [articles, query, selectedTags, selectedWithoutAll]);

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    };

    const toggleTag = (tag: string) => {
        if (tag === ALL_TAG) {
            setSelectedTags([ALL_TAG]);
            return;
        }

        setSelectedTags((prev) => {
            const has = prev.includes(tag);
            const base = prev.filter((t) => t !== ALL_TAG);

            if (has) {
                const next = base.filter((t) => t !== tag);
                return next.length === 0 ? [ALL_TAG] : next;
            }

            return [...base, tag];
        });
    };

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <nav className={styles.tabs}>
                    <Link href="/feed" className={`${styles.tab} ${styles.tabActive}`}>
                        Feed
                    </Link>
                    <Link href="/ai" className={styles.tab}>
                        Chat
                    </Link>
                </nav>

                <Link href="/profile" className={styles.profileDot} aria-label="Профиль" />
            </header>

            <main className={styles.main}>
                <aside className={styles.sidebar}>
                    <div className={styles.searchRow}>
                        <SearchIcon />
                        <input
                            className={styles.searchInput}
                            value={query}
                            onChange={handleSearch}
                            placeholder=""
                            aria-label="Поиск по названию статьи"
                        />
                    </div>

                    <div className={styles.tags}>
                        {visibleTags.map((tag) => {
                            const isActive = selectedTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    className={`${styles.tag} ${isActive ? styles.tagActive : ""}`}
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>

                    <button type="button" className={styles.expandBtn} onClick={() => setShowAllTags((v) => !v)}>
                        <span className={styles.expandArrow} aria-hidden />
                        <span className={styles.expandText}>{showAllTags ? "свернуть" : "развернуть все"}</span>
                    </button>
                </aside>

                <section className={styles.grid}>
                    {loading && <div className={styles.empty}>Загрузка…</div>}
                    {/*{!loading && loadError && <div className={styles.empty}>{loadError}</div>}*/}

                    {!loading &&
                        filteredArticles.map((a) => (
                            <article key={a.id} className={styles.card}>
                                <div className={styles.coverWrap}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img className={styles.cover} src={a.coverUrl} alt="" />
                                </div>

                                <h3 className={styles.title}>{a.title}</h3>

                                <div className={styles.cardTags}>
                                    {a.tags.map((t) => {
                                        const highlight = selectedWithoutAll.length > 0 && selectedWithoutAll.includes(t);
                                        return (
                                            <span key={t} className={`${styles.cardTag} ${highlight ? styles.cardTagActive : ""}`}>
                        {t}
                      </span>
                                        );
                                    })}
                                </div>

                                <div className={styles.meta}>
                                    <span className={styles.author}>{a.authorName}</span>
                                    <span className={styles.dot} aria-hidden />
                                    <span className={styles.date}>{formatRuDate(a.publishedAt)}</span>
                                </div>
                            </article>
                        ))}

                    {!loading && filteredArticles.length === 0 && (
                        <div className={styles.empty}>Ничего не найдено. Попробуй изменить запрос или теги.</div>
                    )}
                </section>
            </main>
        </div>
    );
}
