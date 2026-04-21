import ArticlePageClient from "./ArticlePageClient";

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
    content?: ArticleBlock[];
    sources?: ArticleSource[];
};

function formatRuDate(dateStr?: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function absAssetUrl(apiBase: string, url?: string) {
    if (!url) return "/articles/yoga.svg";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${apiBase}${url}`;
    return `${apiBase}/${url}`;
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const url = `${base}/api/articles/id/${encodeURIComponent(id)}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
        return <div style={{ padding: 24 }}>Статья не найдена. HTTP {res.status}</div>;
    }

    const article = (await res.json()) as Article;
    const cover = absAssetUrl(base, article.imageUrl);
    const date = formatRuDate(article.createdAt);

    return <ArticlePageClient article={article} cover={cover} date={date} />;
}