"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./article.module.css";

type ArticleBlock =
    | { type: "paragraph"; text: string }
    | { type: "heading"; text: string; level?: 1 | 2 | 3 | 4 }
    | { type: "bullet-list"; items: string[] }
    | { type: "ordered-list"; items: string[] }
    | { type: "quote"; text: string };

type ArticleSource =
    | string
    | {
    url?: string;
    type?: string;
    title?: string;
};

type Article = {
    id: string;
    title: string;
    slug?: string;
    authorName?: string;
    authorBio?: string;
    category?: string;
    annotation?: string;
    imageUrl?: string;
    imageAlt?: string;
    createdAt?: string;
    content?: ArticleBlock[] | string;
    sources?: ArticleSource[];
    coauthors?: string;
};

function BookmarkIcon({ filled }: { filled: boolean }) {
    return (
        <svg
            width="28"
            height="34"
            viewBox="0 0 28 34"
            fill="none"
            aria-hidden="true"
            className={styles.bookmarkSvg}
        >
            <path
                d="M6 2.5H22C22.8284 2.5 23.5 3.17157 23.5 4V31.3417C23.5 32.5485 22.1508 33.2612 21.1544 32.583L14.8441 28.2871C14.3349 27.9403 13.6651 27.9403 13.1559 28.2871L6.84562 32.583C5.84916 33.2612 4.5 32.5485 4.5 31.3417V4C4.5 3.17157 5.17157 2.5 6 2.5Z"
                className={filled ? styles.bookmarkFilled : styles.bookmarkOutline}
            />
        </svg>
    );
}

function renderBlock(b: ArticleBlock, key: number) {
    switch (b.type) {
        case "heading": {
            const lvl = b.level ?? 2;
            if (lvl === 1) return <h1 key={key} className={styles.h1}>{b.text}</h1>;
            if (lvl === 2) return <h2 key={key} className={styles.h2}>{b.text}</h2>;
            if (lvl === 3) return <h3 key={key} className={styles.h3}>{b.text}</h3>;
            return <h4 key={key} className={styles.h4}>{b.text}</h4>;
        }

        case "bullet-list":
            return (
                <ul key={key} className={styles.ul}>
                    {b.items.map((it, i) => (
                        <li key={i} className={styles.li}>{it}</li>
                    ))}
                </ul>
            );

        case "ordered-list":
            return (
                <ol key={key} className={styles.ol}>
                    {b.items.map((it, i) => (
                        <li key={i} className={styles.li}>{it}</li>
                    ))}
                </ol>
            );

        case "quote":
            return (
                <blockquote key={key} className={styles.quote}>
                    {b.text}
                </blockquote>
            );

        default:
            return <p key={key} className={styles.p}>{b.text}</p>;
    }
}

function renderSource(source: ArticleSource, key: number) {
    if (typeof source === "string") {
        return (
            <li key={key} className={styles.li}>
                {source}
            </li>
        );
    }

    const title = source.title || source.url || "Источник";
    const type = source.type ? ` (${source.type})` : "";

    if (source.url) {
        return (
            <li key={key} className={styles.li}>
                <a href={source.url} target="_blank" rel="noreferrer">
                    {title}
                </a>
                {type}
            </li>
        );
    }

    return (
        <li key={key} className={styles.li}>
            {title}
            {type}
        </li>
    );
}

function renderHtmlContent(html: string) {
    return (
        <div
            className={styles.htmlContent}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

export default function ArticlePageClient({
                                              article,
                                              cover,
                                              date,
                                          }: {
    article: Article;
    cover: string;
    date: string;
}) {
    const mainRef = useRef<HTMLElement | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

    useEffect(() => {
        let ticking = false;

        const updateProgress = () => {
            const node = mainRef.current;
            if (!node) {
                ticking = false;
                return;
            }

            const rect = node.getBoundingClientRect();
            const absoluteTop = window.scrollY + rect.top;
            const totalScrollable = Math.max(node.offsetHeight - window.innerHeight, 1);
            const passed = window.scrollY - absoluteTop;
            const next = Math.min(Math.max(passed / totalScrollable, 0), 1);

            setScrollProgress(next);
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(updateProgress);
            }
        };

        const frameId = window.requestAnimationFrame(updateProgress);

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setIsSaved(false);
            return;
        }

        let active = true;

        const loadSavedState = async () => {
            try {
                const res = await fetch(`${backendBase}/api/articles/saved/ids`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });

                if (!res.ok) return;

                const data = await res.json();
                const ids = Array.isArray(data.articleIds)
                    ? data.articleIds.filter((id: unknown): id is string => typeof id === "string")
                    : [];

                if (active) {
                    setIsSaved(ids.includes(article.id));
                }
            } catch {
                if (active) setIsSaved(false);
            }
        };

        void loadSavedState();

        return () => {
            active = false;
        };
    }, [article.id, backendBase]);

    const toggleSaved = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const nextSaved = !isSaved;
        setIsSaved(nextSaved);

        try {
            const res = await fetch(`${backendBase}/api/articles/saved/toggle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    articleId: article.id,
                    saved: nextSaved,
                }),
            });

            if (!res.ok) {
                setIsSaved(!nextSaved);
            }
        } catch {
            setIsSaved(!nextSaved);
        }
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

            <main className={styles.main} ref={mainRef}>
                <section className={styles.left}>
                    <div className={styles.metaRow}>
                        <span className={styles.author}>{article.authorName || "Автор"}</span>
                        <span className={styles.dot} aria-hidden />
                        <span className={styles.date}>{date}</span>
                    </div>
                    {article.coauthors ? (
                        <div className={styles.coauthorsLine}>
                            Соавторы: {article.coauthors}
                        </div>
                    ) : null}

                    <h1 className={styles.bigTitle}>{article.title}</h1>

                    <div className={styles.tags}>
                        {article.category && (
                            <span className={styles.tag}>{article.category.toLowerCase()}</span>
                        )}
                    </div>

                    {article.annotation && <p className={styles.lead}>{article.annotation}</p>}

                    <button
                        type="button"
                        className={`${styles.bookmarkBtn} ${isSaved ? styles.bookmarkBtnSaved : ""}`}
                        onClick={toggleSaved}
                        aria-label={isSaved ? "Убрать из сохранённых" : "Сохранить статью"}
                        title={isSaved ? "Убрать из сохранённых" : "Сохранить статью"}
                    >
                        <BookmarkIcon filled={isSaved} />
                    </button>
                </section>

                <div className={styles.divider} aria-hidden>
                    <div
                        className={styles.dividerDot}
                        style={{ top: `calc(${scrollProgress * 100}% - 11px)` }}
                    />
                </div>

                <section className={styles.right}>
                    {cover && (
                        <img className={styles.cover} src={cover} alt={article.imageAlt || ""} />
                    )}

                    <div className={styles.content}>
                        {Array.isArray(article.content) && article.content.length > 0 ? (
                            article.content.map((b, i) => renderBlock(b, i))
                        ) : typeof article.content === "string" && article.content.trim() ? (
                            renderHtmlContent(article.content)
                        ) : (
                            <p className={styles.p}>Нет контента</p>
                        )}
                    </div>

                    {Array.isArray(article.sources) && article.sources.length > 0 && (
                        <section className={styles.sources}>
                            <details className={styles.sourcesDetails}>
                                <summary className={styles.sourcesSummary}>
                                    <span className={styles.sourcesTitle}>Источники</span>
                                    <span className={styles.sourcesHint}>({article.sources.length})</span>
                                    <span className={styles.sourcesChevron} aria-hidden />
                                </summary>

                                <ol className={styles.ol}>
                                    {article.sources.map((s, i) => renderSource(s, i))}
                                </ol>
                            </details>
                        </section>
                    )}
                </section>
            </main>
        </div>
    );
}