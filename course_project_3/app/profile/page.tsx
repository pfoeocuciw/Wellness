"use client";

import Link from "next/link";
import styles from "./profile.module.css";
import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "expert";

type SavedArticleApi = {
    id: string;
    title: string;
    imageUrl?: string;
    category?: string;
    authorName?: string;
    createdAt?: string;
    slug?: string;
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
    status?: "draft" | "published";
    slug?: string;
    coauthors?: string;
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
    documents?: string[];
};

type CreatedArticleApi = {
    id: string;
    title?: string;
    imageUrl?: string;
    tags?: string[];
    createdAt?: string;
    status?: string;
    slug?: string;
    coauthors?: string;
};

type CreatedArticlesResponse = {
    articles?: CreatedArticleApi[];
    message?: string;
};

type ModerationData = {
    status: string;
    reasons: string[];
    red_flags: string[];
    confidence_score: number | null;
};

function toMediaUrl(url?: string | null) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`;
}

function normalizeProfile(data: unknown): ProfileData | null {
    if (!data || typeof data !== "object") return null;
    const raw = data as Record<string, unknown>;

    return {
        id: Number(raw.id ?? 0),
        email: typeof raw.email === "string" ? raw.email : "",
        first_name:
            typeof raw.first_name === "string"
                ? raw.first_name
                : typeof raw.firstName === "string"
                    ? raw.firstName
                    : "",
        last_name:
            typeof raw.last_name === "string"
                ? raw.last_name
                : typeof raw.lastName === "string"
                    ? raw.lastName
                    : "",
        role: raw.role === "expert" ? "expert" : "user",
        is_verified:
            typeof raw.is_verified === "boolean"
                ? raw.is_verified
                : typeof raw.isVerified === "boolean"
                    ? raw.isVerified
                    : false,
        is_email_verified:
            typeof raw.is_email_verified === "boolean" ? raw.is_email_verified : true,
        diploma_info:
            typeof raw.diploma_info === "string"
                ? raw.diploma_info
                : typeof raw.diplomaInfo === "string"
                    ? raw.diplomaInfo
                    : null,
        bio: typeof raw.bio === "string" ? raw.bio : null,
        avatarUrl:
            typeof raw.avatarUrl === "string"
                ? raw.avatarUrl
                : typeof raw.avatar_url === "string"
                    ? raw.avatar_url
                    : null,
        interests: Array.isArray(raw.interests)
            ? (raw.interests as unknown[]).filter(
                (item): item is Interest =>
                    !!item &&
                    typeof item === "object" &&
                    typeof (item as Interest).id === "number" &&
                    typeof (item as Interest).name === "string"
            )
            : [],
        documents: Array.isArray(raw.documents)
            ? raw.documents.filter((item): item is string => typeof item === "string")
            : [],
    };
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

async function readJsonSafe<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!text) return {} as T;

    try {
        return JSON.parse(text) as T;
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

function TrashIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M10 11V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M14 11V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path
                d="M6 7L7 19C7.05 19.6 7.55 20 8.15 20H15.85C16.45 20 16.95 19.6 17 19L18 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M9 7V4.8C9 4.36 9.36 4 9.8 4H14.2C14.64 4 15 4.36 15 4.8V7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function StatArticleCard({
                             article,
                             compact = false,
                             activeTag,
                             onDelete,
                         }: {
    article: ProfileArticle;
    compact?: boolean;
    activeTag: string;
    onDelete?: (article: ProfileArticle) => void;
}) {
    const href =
        article.status === "draft"
            ? `/profile/create-article?draftId=${article.id}`
            : `/feed/${article.id}`;

    return (
        <div className={styles.articleCardWrap}>
            <Link href={href} className={styles.articleCardLink}>
                <article className={`${styles.articleCard} ${compact ? styles.articleCardCompact : ""}`}>
                    <div className={styles.articleImageWrap}>
                        <img
                            src={article.image}
                            alt={article.title}
                            className={styles.articleImage}
                            onError={(e) => {
                                const img = e.currentTarget;
                                if (img.dataset.fallbackApplied === "1") return;
                                img.dataset.fallbackApplied = "1";
                                img.src = "/articles/yoga.svg";
                            }}
                        />
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
                                    className={`${styles.cardTagPill} ${
                                        isActive ? styles.cardTagPillActive : ""
                                    }`}
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

                    {article.coauthors ? (
                        <div className={styles.articleMetaInline}>
                            <span>Соавторы: {article.coauthors}</span>
                        </div>
                    ) : null}

                    {article.updatedText ? (
                        <div className={styles.articleMetaInline}>
                            <span>{article.updatedText}</span>
                        </div>
                    ) : null}
                </article>
            </Link>

            {onDelete ? (
                <button
                    type="button"
                    className={styles.articleDeleteBtn}
                    onClick={() => onDelete(article)}
                    aria-label="Удалить статью"
                >
                    <TrashIcon />
                </button>
            ) : null}
        </div>
    );
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [savedArticles, setSavedArticles] = useState<ProfileArticle[]>([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
    const [moderationData, setModerationData] = useState<ModerationData | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [newAnnotation, setNewAnnotation] = useState("");
    const [newContent, setNewContent] = useState("");
    const moderationRef = useRef<HTMLDivElement | null>(null);

    const [createdArticles, setCreatedArticles] = useState<ProfileArticle[]>([]);
    const [createdLoading, setCreatedLoading] = useState(false);

    const [articleToDelete, setArticleToDelete] = useState<ProfileArticle | null>(null);
    const [isDeletingArticle, setIsDeletingArticle] = useState(false);

    const [tab, setTab] = useState<"saved" | "created">("saved");
    const [search, setSearch] = useState("");
    const [activeTag, setActiveTag] = useState("все");

    const filterTags = ["все", "гибкость", "бодрость", "витамины", "ментальное здоровье"];

    const role = profile?.role ?? "user";
    const canPublish = profile?.role === "expert" && profile?.is_verified;
    const displayName = profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : "Пользователь";
    const favoriteTopics = profile?.interests?.map((item) => item.name) ?? [];

    useEffect(() => {
        const loadProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });

                const data = await readJsonSafe<unknown>(res);

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

                const normalized = normalizeProfile(data);
                if (!normalized) {
                    throw new Error("Не удалось прочитать профиль");
                }

                setProfile(normalized);
            } catch (error) {
                console.error("Ошибка загрузки профиля", error);
            }
        };

        void loadProfile();
    }, []);

    useEffect(() => {
        const loadSavedArticles = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setSavedArticles([]);
                return;
            }

            try {
                setSavedLoading(true);
                const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

                const res = await fetch(`${base}/api/articles/saved`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });

                if (!res.ok) {
                    setSavedArticles([]);
                    return;
                }

                const data = await readJsonSafe<{ articles?: SavedArticleApi[] }>(res);
                const list = Array.isArray(data.articles) ? data.articles : [];

                setSavedArticles(
                    list.map((article) => ({
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
                        status: "published",
                        slug: article.slug,
                    }))
                );
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

    useEffect(() => {
        const loadCreatedArticles = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                setCreatedLoading(true);

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/articles/my`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const data = await readJsonSafe<CreatedArticlesResponse>(res);

                if (!res.ok) {
                    console.error("Не удалось загрузить статьи автора", data);
                    setCreatedArticles([]);
                    return;
                }

                const mapped: ProfileArticle[] = (data.articles || []).map((article) => ({
                    id: article.id,
                    title: article.title || "Без названия",
                    image: article.imageUrl
                        ? toMediaUrl(article.imageUrl)
                        : "/images/articles/img_нарушения-сна-у-жителей-мегаполиса_65237053.png",
                    tags: Array.isArray(article.tags) ? article.tags : [],
                    author: displayName,
                    date: formatRuDate(article.createdAt),
                    updatedText: article.status === "draft" ? "Черновик" : "Опубликовано",
                    status: article.status === "draft" ? "draft" : "published",
                    slug: typeof article.slug === "string" ? article.slug : undefined,
                    coauthors:
                        typeof article.coauthors === "string" ? article.coauthors : "",
                }));

                setCreatedArticles(mapped);
            } catch (error) {
                console.error("Ошибка загрузки созданных статей", error);
                setCreatedArticles([]);
            } finally {
                setCreatedLoading(false);
            }
        };

        if (profile) {
            void loadCreatedArticles();
        }
    }, [displayName, profile]);

    const handleDeleteArticle = async () => {
        if (!articleToDelete) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            setIsDeletingArticle(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/articles/my/${articleToDelete.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await readJsonSafe<{ message?: string }>(res);

            if (!res.ok) {
                throw new Error(data.message || "Не удалось удалить статью");
            }

            setCreatedArticles((prev) => prev.filter((item) => item.id !== articleToDelete.id));
            setArticleToDelete(null);
        } catch (error) {
            console.error("Ошибка удаления статьи", error);
        } finally {
            setIsDeletingArticle(false);
        }
    };

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

    const createdActionText = canPublish ? "МОИ СТАТЬИ" : "";

    const mainTitle = useMemo(() => {
        if (tab === "saved") return "МОИ ПОДБОРКИ";
        if (canPublish) return "МОИ СТАТЬИ";
        return "";
    }, [tab, canPublish]);

    useEffect(() => {
        if (!moderationData) return;
        moderationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [moderationData]);

    const closeCreateModal = () => {
        setCreateModalOpen(false);
        setPublishLoading(false);
        setPublishError(null);
        setPublishSuccess(null);
        setModerationData(null);
        setNewTitle("");
        setNewCategory("");
        setNewAnnotation("");
        setNewContent("");
    };

    const handleCreateArticle = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const title = newTitle.trim();
        const category = newCategory.trim();
        const annotation = newAnnotation.trim();
        const content = newContent.trim();

        if (!title || !category || !annotation || content.length < 50) {
            setPublishError("Заполните все поля. Текст статьи должен быть не короче 50 символов.");
            return;
        }

        try {
            setPublishLoading(true);
            setPublishError(null);
            setPublishSuccess(null);
            setModerationData(null);

            const res = await fetch("/api/articles", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title,
                    category,
                    annotation,
                    content: [{ type: "paragraph", text: content }],
                    sources: [],
                }),
            });

            const data = (await readJsonSafe(res)) as Record<string, unknown>;

            if (!res.ok) {
                const message =
                    typeof data.error === "string" ? data.error : "Не удалось опубликовать статью";

                const moderationRaw =
                    data.moderation && typeof data.moderation === "object"
                        ? (data.moderation as Record<string, unknown>)
                        : null;

                if (res.status === 422 && moderationRaw) {
                    const reasons = Array.isArray(moderationRaw.reasons)
                        ? moderationRaw.reasons.filter((v): v is string => typeof v === "string")
                        : [];
                    const redFlags = Array.isArray(moderationRaw.red_flags)
                        ? moderationRaw.red_flags.filter((v): v is string => typeof v === "string")
                        : [];

                    setModerationData({
                        status: typeof moderationRaw.status === "string" ? moderationRaw.status : "rejected",
                        reasons,
                        red_flags: redFlags,
                        confidence_score:
                            typeof moderationRaw.confidence_score === "number"
                                ? moderationRaw.confidence_score
                                : null,
                    });
                    setPublishError("Статья не прошла модерацию. Исправьте текст и попробуйте снова.");
                    return;
                }

                setPublishError(message);
                return;
            }

            setPublishSuccess("Статья прошла модерацию и опубликована.");
        } catch {
            setPublishError("Ошибка сети при публикации статьи.");
        } finally {
            setPublishLoading(false);
        }
    };

    if (!profile) {
        return <div className={styles.loader}>Загрузка профиля...</div>;
    }

    const avatar = toMediaUrl(profile.avatarUrl);

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <div className={styles.topbarLeft}>
                    <nav className={styles.tabs}>
                        <Link href="/feed" className={styles.tab}>
                            Feed
                        </Link>
                        <Link href="/ai" className={styles.tab}>
                            Chat
                        </Link>
                    </nav>

                    <Link href="/" className={styles.backBtn} aria-label="Назад">
                        <ArrowLeftIcon />
                    </Link>
                </div>

                <div className={styles.topActions}>
                    <Link
                        href="/profile/settings"
                        className={styles.settingsBtn}
                        aria-label="Настройки"
                    >
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
                            {profile.is_verified
                                ? "Подтверждённый эксперт"
                                : "Эксперт · на проверке"}
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
                        className={`${styles.switchBtn} ${
                            tab === "saved" ? styles.switchBtnActive : ""
                        }`}
                        onClick={() => setTab("saved")}
                    >
                        Сохраненные
                    </button>

                    <button
                        type="button"
                        className={`${styles.switchBtn} ${
                            tab === "created" ? styles.switchBtnActive : ""
                        }`}
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
                                                className={`${styles.tag} ${
                                                    isActive ? styles.tagActive : ""
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>

                            <div className={styles.savedGrid}>
                                {savedLoading ? (
                                    <div className={styles.noResults}>
                                        Загрузка сохранённых статей...
                                    </div>
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
                                    <div className={styles.noResults}>
                                        У вас пока нет сохранённых статей
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {tab === "created" && canPublish && (
                    <>
                        <h2 className={styles.contentTitle}>{createdActionText}</h2>

                        {createdLoading ? (
                            <section className={styles.emptyState}>
                                <p className={styles.emptyText}>Загрузка ваших статей...</p>
                            </section>
                        ) : filteredCreatedArticles.length > 0 ? (
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
                                                    className={`${styles.tag} ${
                                                        isActive ? styles.tagActive : ""
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </aside>

                                <div className={styles.createdGrid}>
                                    {filteredCreatedArticles.map((article) => (
                                        <StatArticleCard
                                            key={article.id}
                                            article={article}
                                            compact
                                            activeTag={activeTag}
                                            onDelete={setArticleToDelete}
                                        />
                                    ))}

                                    <button
                                        className={styles.addArticleCard}
                                        type="button"
                                        onClick={() => setCreateModalOpen(true)}
                                    >
                                        <PlusIcon />
                                    </button>
                                </div>
                            </section>
                        ) : (
                            <section className={styles.emptyState}>
                                <h2 className={styles.emptyTitle}>
                                    У вас пока нет опубликованных статей
                                </h2>

                                <p className={styles.emptyText}>
                                    Создайте свою первую статью и отправьте её на публикацию.
                                </p>

                                <button
                                    className={styles.primaryWideBtn}
                                    type="button"
                                    onClick={() => setCreateModalOpen(true)}
                                >
                                    Создать статью
                                </button>
                            </section>
                        )}
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

                        <button
                            className={styles.primaryWideBtn}
                            type="button"
                            onClick={() => window.location.assign("/profile/settings")}
                        >
                            Перейти к загрузке документов
                        </button>

                        <button className={styles.linkBtn} type="button">
                            Может быть в другой раз
                        </button>
                    </section>
                )}
            </main>

            {createModalOpen && (
                <div className={styles.modalOverlay} onClick={closeCreateModal}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Новая статья</h3>
                        <p className={styles.modalText}>
                            Перед публикацией статья проходит автоматическую модерацию.
                        </p>

                        <div className={styles.createForm}>
                            <input
                                className={styles.createInput}
                                placeholder="Название"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                            <input
                                className={styles.createInput}
                                placeholder="Категория"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <textarea
                                className={styles.createTextarea}
                                placeholder="Краткая аннотация"
                                value={newAnnotation}
                                onChange={(e) => setNewAnnotation(e.target.value)}
                            />
                            <textarea
                                className={styles.createTextareaLarge}
                                placeholder="Текст статьи"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                            />
                        </div>

                        {publishError && <div className={styles.errorText}>{publishError}</div>}
                        {publishSuccess && <div className={styles.successText}>{publishSuccess}</div>}

                        {publishSuccess && (
                            <div className={styles.moderationStatusRow}>
                                <span className={`${styles.moderationBadge} ${styles.moderationBadgeApproved}`}>
                                    Прошла
                                </span>
                                <span className={styles.moderationHint}>
                                    Модерация успешно пройдена, статья опубликована.
                                </span>
                            </div>
                        )}

                        {moderationData && (
                            <div className={styles.moderationBox} ref={moderationRef}>
                                <div className={styles.moderationStatusRow}>
                                    <span className={`${styles.moderationBadge} ${styles.moderationBadgeRejected}`}>
                                        Не прошла
                                    </span>
                                    <span className={styles.moderationTitle}>
                                        Результат модерации: {moderationData.status}
                                    {typeof moderationData.confidence_score === "number"
                                        ? ` · ${moderationData.confidence_score}%`
                                        : ""}
                                    </span>
                                </div>
                                {moderationData.reasons.length > 0 && (
                                    <div className={styles.moderationSection}>
                                        <div className={styles.moderationSectionTitle}>Что исправить</div>
                                        <div className={styles.moderationList}>
                                            {moderationData.reasons.map((item) => (
                                                <div key={item}>• {item}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {moderationData.red_flags.length > 0 && (
                                    <div className={styles.moderationSection}>
                                        <div className={styles.moderationSectionTitle}>Опасные фрагменты</div>
                                        <div className={styles.moderationFlags}>
                                            {moderationData.red_flags.map((item) => (
                                                <div key={item}>⚠ {item}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={styles.modalRowActions}>
                            <button type="button" className={styles.modalHalfButton} onClick={closeCreateModal}>
                                Закрыть
                            </button>
                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={handleCreateArticle}
                                disabled={publishLoading}
                            >
                                {publishLoading ? "Публикация..." : "Опубликовать"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {articleToDelete ? (
                <div className={styles.modalOverlay} onClick={() => setArticleToDelete(null)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Удалить статью?</h3>
                        <p className={styles.modalText}>
                            Вы уверены, что хотите удалить статью «{articleToDelete.title}»?
                        </p>

                        <div className={styles.modalRowActions}>
                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={() => setArticleToDelete(null)}
                                disabled={isDeletingArticle}
                            >
                                Отмена
                            </button>

                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={() => void handleDeleteArticle()}
                                disabled={isDeletingArticle}
                            >
                                {isDeletingArticle ? "Удаляем..." : "Удалить"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}