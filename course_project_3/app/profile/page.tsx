"use client";

import Link from "next/link";
import styles from "./profile.module.css";
import { useEffect, useMemo, useState } from "react";

type Role = "user" | "expert";

type SavedArticleApi = {
    id: string;
    title: string;
    imageUrl?: string;
    category?: string;
    authorName?: string;
    createdAt?: string;
};

type ProfileArticle = {
    id: string;
    title: string;
    image: string;
    tags: string[];
    author?: string;
    date?: string;
    views?: number;
    updatedText?: string;
};

type Interest = {
    id: number;
    name: string;
    description?: string | null;
};

type ProfileData = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: Role;
    is_verified: boolean;
    is_email_verified: boolean;
    diploma_info: string | null;
    bio: string | null;
    avatarUrl?: string | null;
    interests: Interest[];
};

function toMediaUrl(url?: string | null) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`;
}

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

async function readJsonSafe(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return {};

    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new Error(`Сервер вернул не JSON: ${text.slice(0, 120)}`);
    }
}

function ArrowLeftIcon() {
    return (
        <svg width="58" height="24" viewBox="0 0 58 24" fill="none" aria-hidden="true">
            <path d="M56 12H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

function GearIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.65 8.84a.5.5 0 0 0 .12.64L4.8 11.06c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function PlusIcon() {
    return <span className={styles.plusIcon}>+</span>;
}

function StatArticleCard({
                             article,
                             compact = false,
                             activeTag,
                         }: {
    article: ProfileArticle;
    compact?: boolean;
    activeTag: string;
}) {
    return (
        <article className={`${styles.articleCard} ${compact ? styles.articleCardCompact : ""}`}>
            <div className={styles.articleImageWrap}>
                <img src={article.image} alt={article.title} className={styles.articleImage} />
            </div>

            <h3 className={styles.articleTitle}>{article.title}</h3>

            <div className={styles.cardTagsPills}>
                {article.tags.map((tag) => {
                    const isActive =
                        activeTag !== "все" &&
                        tag.toLowerCase() === activeTag.toLowerCase();

                    return (
                        <span
                            key={tag}
                            className={`${styles.cardTagPill} ${isActive ? styles.cardTagPillActive : ""}`}
                        >
                            {tag}
                        </span>
                    );
                })}
            </div>

            <div className={styles.articleMetaInline}>
                <span>{article.author ?? "Е.В. Царева"}</span>
                <span className={styles.metaDot}>•</span>
                <span>{article.date ?? "14 марта 2026 г."}</span>
            </div>
        </article>
    );
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [savedArticles, setSavedArticles] = useState<ProfileArticle[]>([]);
    const [savedLoading, setSavedLoading] = useState(false);

    const [tab, setTab] = useState<"saved" | "created">("saved");
    const [search, setSearch] = useState("");
    const [activeTag, setActiveTag] = useState("все");

    const filterTags = ["все", "гибкость", "бодрость", "витамины", "ментальное здоровье"];

    const createdArticles: ProfileArticle[] = [
        {
            id: "c1",
            title: "ВСЕ СТАТЬИ",
            image: "/images/articles/img_нарушения-сна-у-жителей-мегаполиса_65237053.png",
            tags: ["йога", "гибкость", "бодрость", "утренняя зарядка"],
            date: "14 августа 2024",
        },
        {
            id: "c2",
            title: "ПРАВИЛЬНЫЙ СОН",
            image: "/images/articles/img_нарушения-сна-у-жителей-мегаполиса_65237053.png",
            tags: ["сон", "мелатонин", "бодрость", "спокойствие"],
            date: "14 августа 2024",
        },
    ];

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const loadProfile = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });

                const data = await readJsonSafe(res);

                if (!res.ok) {
                    const message =
                        typeof data === "object" &&
                        data !== null &&
                        "message" in data &&
                        typeof data.message === "string"
                            ? data.message
                            : "Не удалось загрузить профиль";

                    throw new Error(message);
                }

                setProfile(data as ProfileData);
            } catch (error) {
                console.error("Ошибка загрузки профиля", error);
            }
        };

        void loadProfile();
    }, []);

    useEffect(() => {
        const loadSavedArticles = async () => {
            try {
                setSavedLoading(true);

                const raw = localStorage.getItem("savedArticleIds");
                if (!raw) {
                    setSavedArticles([]);
                    return;
                }

                let ids: string[] = [];

                try {
                    const parsed = JSON.parse(raw) as unknown;
                    if (Array.isArray(parsed)) {
                        ids = parsed.filter((item): item is string => typeof item === "string");
                    }
                } catch {
                    setSavedArticles([]);
                    return;
                }

                if (ids.length === 0) {
                    setSavedArticles([]);
                    return;
                }

                const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

                const results = await Promise.all(
                    ids.map(async (id) => {
                        try {
                            const res = await fetch(
                                `${base}/api/articles/id/${encodeURIComponent(id)}`,
                                { cache: "no-store" }
                            );

                            if (!res.ok) return null;

                            const article = (await res.json()) as SavedArticleApi;

                            const mapped: ProfileArticle = {
                                id: article.id,
                                title: article.title,
                                image:
                                    article.imageUrl && article.imageUrl.startsWith("http")
                                        ? article.imageUrl
                                        : article.imageUrl
                                            ? `${base}${article.imageUrl}`
                                            : "/images/articles/img_нарушения-сна-у-жителей-мегаполиса_65237053.png",
                                tags: article.category ? [article.category.toLowerCase()] : [],
                                author: article.authorName || "Автор",
                                date: formatRuDate(article.createdAt),
                            };

                            return mapped;
                        } catch {
                            return null;
                        }
                    })
                );

                setSavedArticles(results.filter((item): item is ProfileArticle => item !== null));
            } finally {
                setSavedLoading(false);
            }
        };

        void loadSavedArticles();

        const handleFocus = () => {
            void loadSavedArticles();
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    const filterArticles = (articles: ProfileArticle[]) => {
        return articles.filter((article) => {
            const matchesSearch =
                search.trim() === "" ||
                article.title.toLowerCase().includes(search.toLowerCase()) ||
                article.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

            const matchesTag =
                activeTag === "все" ||
                article.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase());

            return matchesSearch && matchesTag;
        });
    };

    const filteredSavedArticles = filterArticles(savedArticles);
    const filteredCreatedArticles = filterArticles(createdArticles);

    const role = profile?.role ?? "user";
    const canPublish = profile?.role === "expert" && profile?.is_verified;
    const displayName = profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : "Пользователь";
    const favoriteTopics = profile?.interests?.map((item) => item.name) ?? [];

    const createdActionText = canPublish ? "МОИ СТАТЬИ" : "";

    const mainTitle = useMemo(() => {
        if (tab === "saved") return "МОИ ПОДБОРКИ";
        if (canPublish) return "МОИ СТАТЬИ";
        return "";
    }, [tab, canPublish]);

    if (!profile) {
        return <div className={styles.loader}>Загрузка профиля...</div>;
    }

    const avatar = toMediaUrl(profile.avatarUrl);

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <div className={styles.topbarLeft}>
                    <nav className={styles.tabs}>
                        <Link href="/feed" className={styles.tab}>Feed</Link>
                        <Link href="/ai" className={styles.tab}>Chat</Link>
                    </nav>

                    <Link href="/" className={styles.backBtn} aria-label="Назад">
                        <ArrowLeftIcon />
                    </Link>
                </div>

                <div className={styles.topActions}>
                    <Link href="/profile/settings" className={styles.settingsBtn} aria-label="Настройки">
                        <GearIcon />
                    </Link>
                </div>
            </header>

            <main className={styles.container}>
                <section className={styles.profileHead}>
                    <div
                        className={styles.avatar}
                        style={
                            avatar
                                ? {
                                    backgroundImage: `url(${avatar})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }
                                : undefined
                        }
                    />
                    <h1 className={styles.userName}>{displayName}</h1>

                    {role === "expert" ? (
                        <span className={styles.roleBadge}>
                            {profile.is_verified ? "Подтверждённый эксперт" : "Эксперт · на проверке"}
                        </span>
                    ) : (
                        <span className={styles.userRole}>Пользователь</span>
                    )}
                </section>

                <section className={styles.topicsSection}>
                    <div className={styles.sectionLabel}>Любимые темы:</div>
                    <div className={styles.topicList}>
                        {favoriteTopics.map((topic, i) => (
                            <span key={`${topic}-${i}`} className={styles.topicPill}>
                                {topic}
                            </span>
                        ))}
                    </div>
                </section>

                <section className={styles.switchRow}>
                    <button
                        type="button"
                        className={`${styles.switchBtn} ${tab === "saved" ? styles.switchBtnActive : ""}`}
                        onClick={() => setTab("saved")}
                    >
                        Сохраненные
                    </button>

                    <button
                        type="button"
                        className={`${styles.switchBtn} ${tab === "created" ? styles.switchBtnActive : ""}`}
                        onClick={() => setTab("created")}
                    >
                        Созданные
                    </button>
                </section>

                {tab === "saved" && (
                    <>
                        <h2 className={styles.contentTitle}>{mainTitle}</h2>

                        <section className={styles.contentArea}>
                            <aside className={styles.filters}>
                                <div className={styles.searchRow}>
                                    <span className={styles.searchIcon}>
                                        <SearchIcon />
                                    </span>

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder=""
                                        className={styles.searchInput}
                                    />
                                </div>

                                <div className={styles.tags}>
                                    {filterTags.map((tag) => {
                                        const isActive = activeTag === tag;

                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => setActiveTag(tag)}
                                                className={`${styles.tag} ${isActive ? styles.tagActive : ""}`}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>

                            <div className={styles.savedGrid}>
                                {savedLoading ? (
                                    <div className={styles.noResults}>Загрузка сохранённых статей...</div>
                                ) : filteredSavedArticles.length > 0 ? (
                                    filteredSavedArticles.map((article) => (
                                        <StatArticleCard
                                            key={article.id}
                                            article={article}
                                            compact
                                            activeTag={activeTag}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.noResults}>У вас пока нет сохранённых статей</div>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {tab === "created" && canPublish && (
                    <>
                        <h2 className={styles.contentTitle}>{createdActionText}</h2>

                        <section className={styles.contentArea}>
                            <aside className={styles.filters}>
                                <div className={styles.searchRow}>
                                    <span className={styles.searchIcon}>
                                        <SearchIcon />
                                    </span>

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder=""
                                        className={styles.searchInput}
                                    />
                                </div>

                                <div className={styles.tags}>
                                    {filterTags.map((tag) => {
                                        const isActive = activeTag === tag;

                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => setActiveTag(tag)}
                                                className={`${styles.tag} ${isActive ? styles.tagActive : ""}`}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>

                            <div className={styles.createdGrid}>
                                {filteredCreatedArticles.length > 0 ? (
                                    filteredCreatedArticles.map((article) => (
                                        <StatArticleCard
                                            key={article.id}
                                            article={article}
                                            compact
                                            activeTag={activeTag}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.noResults}>Ничего не найдено</div>
                                )}

                                <button className={styles.addArticleCard}>
                                    <PlusIcon />
                                </button>
                            </div>
                        </section>
                    </>
                )}

                {tab === "created" && !canPublish && (
                    <section className={styles.emptyState}>
                        <h2 className={styles.emptyTitle}>
                            {role === "user"
                                ? "Чтобы публиковать статьи, подтвердите свою экспертность."
                                : "Ваши документы ещё проверяются."}
                        </h2>

                        <p className={styles.emptyText}>
                            {role === "user"
                                ? "Загрузите диплом или сертификат в профиле, и после проверки публикация станет доступна."
                                : "Как только проверка завершится, вы сможете публиковать свои статьи."}
                        </p>

                        <button className={styles.primaryWideBtn} type="button">
                            Подтвердить экспертность
                        </button>

                        <button className={styles.linkBtn} type="button">
                            Может быть в другой раз
                        </button>
                    </section>

                )}
            </main>
        </div>
    );
}