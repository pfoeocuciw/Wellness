// app/feed/[id]/page.tsx
import Link from "next/link";
import styles from "./article.module.css";

type ArticleBlock =
    | { type: "paragraph"; text: string }
    | { type: "heading"; text: string; level?: 1 | 2 | 3 | 4 }
    | { type: "bullet-list"; items: string[] }
    | { type: "ordered-list"; items: string[] }
    | { type: "quote"; text: string };

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
    content?: ArticleBlock[];
    sources?: string[];
};

function formatRuDate(dateStr?: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function absAssetUrl(apiBase: string, url?: string) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    // ✅ если это путь к картинке из public Next.js — оставляем как есть (будет 3000)
    if (url.startsWith("/images/")) return url;

    // иначе это ассет бэка
    if (url.startsWith("/")) return `${apiBase}${url}`;
    return `${apiBase}/${url}`;
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

// ✅ В Next 16 params может приходить как Promise — поэтому так:
export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // БЭК (express) у тебя на 3001
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const url = `${base}/api/articles/id/${encodeURIComponent(id)}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
        return (
            <div className={styles.notFound}>
                <header className={styles.topbar}>
                    <nav className={styles.tabs}>
                        <Link href="/feed" className={`${styles.tab} ${styles.tabActive}`}>Feed</Link>
                        <Link href="/ai" className={styles.tab}>Chat</Link>
                    </nav>
                    <Link href="/profile" className={styles.profileDot} aria-label="Профиль" />
                </header>

                <h1>Статья не найдена</h1>
                <p>HTTP {res.status}</p>
                <p><Link href="/feed">Вернуться в ленту</Link></p>
            </div>
        );
    }

    const article = (await res.json()) as Article;

    const cover = absAssetUrl(base, article.imageUrl);
    const date = formatRuDate(article.createdAt);

    // ⬇️ ключевая штука: на мобилке будет ОДНА колонка, без фиксированных высот
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
                <section className={styles.left}>
                    <div className={styles.metaRow}>
                        <span className={styles.author}>{article.authorName || "Автор"}</span>
                        <span className={styles.dot} aria-hidden />
                        <span className={styles.date}>{date}</span>
                    </div>

                    <h1 className={styles.bigTitle}>{article.title}</h1>

                    <div className={styles.tags}>
                        {article.category && <span className={styles.tag}>{article.category.toLowerCase()}</span>}
                    </div>

                    {article.annotation && <p className={styles.lead}>{article.annotation}</p>}
                </section>

                <div className={styles.divider} aria-hidden>
                    <div className={styles.dividerDot} />
                </div>

                <section className={styles.right}>
                    {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.cover} src={cover} alt={article.imageAlt || ""} />
                    )}

                    <div className={styles.content}>
                        {Array.isArray(article.content) && article.content.length > 0 ? (
                            article.content.map((b, i) => renderBlock(b, i))
                        ) : (
                            <p className={styles.p}>Нет контента</p>
                        )}
                    </div>

                    {Array.isArray(article.sources) && article.sources.length > 0 && (
                        <section className={styles.sources}>
                            <details className={styles.sourcesDetails}>
                                <summary className={styles.sourcesSummary}>
                                    <span className={styles.sourcesTitle}>Источники</span>
                                    <span className={styles.sourcesHint}>
          ({article.sources.length})
        </span>
                                    <span className={styles.sourcesChevron} aria-hidden />
                                </summary>

                                <ol className={styles.ol}>
                                    {article.sources.map((s, i) => (
                                        <li key={i} className={styles.li}>{s}</li>
                                    ))}
                                </ol>
                            </details>
                        </section>
                    )}

                </section>
            </main>
        </div>
    );
}
