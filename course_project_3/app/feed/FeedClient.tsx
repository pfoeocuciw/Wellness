"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "./feed.module.css";
import { FeedArticle, normalizeArticle } from "./normalize";

const ALL_TAG = "Bсе";

/** fallback — если бек упал */
const MOCK_ARTICLES: FeedArticle[] = [
    {
        id: "1",
        title: "ЙОГА ДЛЯ НАЧИНАЮЩИХ: ПЕРВЫЕ ШАГИ К ГАРМОНИИ",
        coverUrl: "/articles/yoga.svg",
        tags: ["йога", "гибкость", "бодрость", "утренняя зарядка"],
        authorName: "Мария Петрова",
        publishedAt: "2024-01-13",
    },
];

function formatRuDate(dateStr: string) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function SearchIcon() {
    return (
        <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.2 16.2L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

export default function FeedClient() {
    const [query, setQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([ALL_TAG]);
    const [showAllTags, setShowAllTags] = useState(false);

    const [articles, setArticles] = useState<FeedArticle[]>(MOCK_ARTICLES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);

            try {
                // ВАЖНО: это твой next-route /api/articles (прокси к бэку)
                const res = await fetch("/api/articles", { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data: unknown = await res.json();

                // допускаем [] или {items: []} или {data: []}
                const obj = asRecord(data);
                const listUnknown: unknown =
                    Array.isArray(data) ? data :
                        Array.isArray(obj.items) ? obj.items :
                            Array.isArray(obj.data) ? obj.data :
                                [];

                const list = Array.isArray(listUnknown) ? listUnknown : [];

                const normalized = list
                    .map((item) => normalizeArticle(item))
                    .filter((a): a is FeedArticle => a !== null);

                if (alive) setArticles(normalized.length ? normalized : MOCK_ARTICLES);
            } catch {
                if (alive) setArticles(MOCK_ARTICLES);
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
        const tags = Array.from(new Set(articles.flatMap((a) => a.tags))).filter(Boolean);
        return [ALL_TAG, ...tags];
    }, [articles]);

    const visibleTags = useMemo(() => (showAllTags ? allTags : allTags.slice(0, 5)), [allTags, showAllTags]);

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

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);

    const toggleTag = (tag: string) => {
        if (tag === ALL_TAG) {
            setSelectedTags([ALL_TAG]);
            return;
        }

        setSelectedTags((prev) => {
            const base = prev.filter((t) => t !== ALL_TAG);
            const has = base.includes(tag);

            if (has) {
                const next = base.filter((t) => t !== tag);
                return next.length ? next : [ALL_TAG];
            }

            return [...base, tag];
        });
    };

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <nav className={styles.tabs}>
                    <Link href="/feed" className={`${styles.tab} ${styles.tabActive}`}>Feed</Link>
                    <Link href="/ai" className={styles.tab}>Chat</Link>
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

                    {!loading &&
                        filteredArticles.map((a) => (
                            <Link key={a.id} href={`/feed/${a.id}`} className={styles.cardLink}>
                                <article className={styles.card}>
                                    <div className={styles.coverWrap}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img className={styles.cover} src={a.coverUrl} alt="" />
                                    </div>

                                    <h3 className={styles.title}>{a.title}</h3>

                                    {/* ✅ ТЕГИ ПОД КАРТОЧКОЙ */}
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
                            </Link>
                        ))}

                    {!loading && filteredArticles.length === 0 && (
                        <div className={styles.empty}>Ничего не найдено. Попробуй изменить запрос или теги.</div>
                    )}
                </section>
            </main>
        </div>
    );
}
