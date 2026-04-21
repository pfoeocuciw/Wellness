"use client";

import Link from "next/link";
import {
    ChangeEvent,
    KeyboardEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./create-article.module.css";
import RichTextEditor from "./RichTextEditor";

type ArticleTag = {
    id: string;
    label: string;
};

type MyArticleResponse = {
    article?: {
        id: string;
        title?: string;
        annotation?: string;
        content?: string;
        imageUrl?: string;
        imageAlt?: string;
        coauthors?: string;
        tags?: string[];
        sourcesList?: string[];
        category?: string;
        status?: "draft" | "published";
    };
    message?: string;
};

const defaultTags: ArticleTag[] = [
    { id: "yoga", label: "Йога" },
    { id: "sport", label: "Спорт" },
    { id: "nutrition", label: "Правильно питание" },
    { id: "supplements", label: "Витамины и БАДы" },
    { id: "prevention", label: "Профилактика" },
    { id: "sleep", label: "Сон" },
    { id: "aging", label: "Здоровое старение" },
];

function ArrowLeftIcon() {
    return (
        <svg width="58" height="24" viewBox="0 0 58 24" fill="none" aria-hidden="true">
            <path d="M56 12H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
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

export default function CreateArticlePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const customTagInputRef = useRef<HTMLInputElement | null>(null);
    const mainRef = useRef<HTMLElement | null>(null);

    const [draftId, setDraftId] = useState<string | null>(searchParams.get("draftId"));
    const [title, setTitle] = useState("");
    const [coauthors, setCoauthors] = useState("");
    const [annotation, setAnnotation] = useState("");
    const [content, setContent] = useState("");
    const [sources, setSources] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customTags, setCustomTags] = useState<ArticleTag[]>([]);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagValue, setNewTagValue] = useState("");
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState("");
    const [coverRemoteUrl, setCoverRemoteUrl] = useState("");
    const [scrollProgress, setScrollProgress] = useState(0);

    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");


    const coverLabel = useMemo(() => {
        if (coverFile) return coverFile.name;
        if (coverRemoteUrl) return "Обложка загружена";
        return "";
    }, [coverFile, coverRemoteUrl]);

    const allTags = useMemo(() => [...defaultTags, ...customTags], [customTags]);

    const toggleTag = (tagId: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((item) => item !== tagId)
                : [...prev, tagId]
        );
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const assetUrl = (maybeRelative: string) => {
        const raw = (maybeRelative || "").trim();
        if (!raw) return "";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        if (!raw.startsWith("/")) return raw;
        const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
        return base ? `${base}${raw}` : raw;
    };

    const uploadCoverToServer = async (): Promise<string> => {
        if (!coverFile) return coverRemoteUrl;

        const token = localStorage.getItem("token");
        if (!token) throw new Error("Нет токена");

        const formData = new FormData();
        formData.append("cover", coverFile);

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/articles/cover`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            }
        );

        const text = await res.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("Сервер вернул не JSON");
        }

        if (!res.ok || !data.imageUrl) {
            throw new Error(data.message || "Ошибка загрузки изображения");
        }

        setCoverRemoteUrl(data.imageUrl);
        return data.imageUrl;
    };

    const openAddTag = () => {
        setIsAddingTag(true);
        requestAnimationFrame(() => customTagInputRef.current?.focus());
    };

    const addCustomTag = () => {
        const trimmed = newTagValue.trim();
        if (!trimmed) {
            setIsAddingTag(false);
            return;
        }

        const existing = allTags.find(
            (tag) => tag.label.toLowerCase() === trimmed.toLowerCase()
        );

        if (existing) {
            if (!selectedTags.includes(existing.id)) {
                setSelectedTags((prev) => [...prev, existing.id]);
            }
            setNewTagValue("");
            setIsAddingTag(false);
            return;
        }

        const newTag: ArticleTag = {
            id: `custom-${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            label: trimmed,
        };

        setCustomTags((prev) => [...prev, newTag]);
        setSelectedTags((prev) => [...prev, newTag.id]);
        setNewTagValue("");
        setIsAddingTag(false);
    };

    const handleNewTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addCustomTag();
        }

        if (e.key === "Escape") {
            setNewTagValue("");
            setIsAddingTag(false);
        }
    };

    useEffect(() => {
        let target = 0;
        let current = 0;
        let rafId = 0;

        const updateTarget = () => {
            const node = mainRef.current;
            if (!node) return;

            const rect = node.getBoundingClientRect();
            const absoluteTop = window.scrollY + rect.top;
            const totalScrollable = Math.max(node.offsetHeight - window.innerHeight, 1);
            const passed = window.scrollY - absoluteTop;

            target = Math.min(Math.max(passed / totalScrollable, 0), 1);
        };

        const animate = () => {
            current += (target - current) * 0.08;
            setScrollProgress(current);
            rafId = window.requestAnimationFrame(animate);
        };

        const onScroll = () => updateTarget();

        updateTarget();
        animate();

        window.addEventListener("scroll", onScroll);
        window.addEventListener("resize", onScroll);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    useEffect(() => {
        const currentDraftId = searchParams.get("draftId");
        if (!currentDraftId) return;

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const loadDraft = async () => {
            try {
                setPageLoading(true);
                setErrorMessage("");

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/articles/my/${currentDraftId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const data = await readJsonSafe<MyArticleResponse>(res);

                if (!res.ok || !data.article) {
                    throw new Error(data.message || "Не удалось загрузить черновик");
                }

                const article = data.article;

                setDraftId(article.id);
                setTitle(article.title || "");
                setAnnotation(article.annotation || "");
                setContent(article.content || "");
                setCoauthors(article.coauthors || "");
                setSources(Array.isArray(article.sourcesList) ? article.sourcesList.join("\n") : "");
                setSelectedTags(Array.isArray(article.tags) ? article.tags : []);
                setCoverRemoteUrl(article.imageUrl || "");
                setCoverPreview(assetUrl(article.imageUrl || ""));
            } catch (err) {
                setErrorMessage(
                    err instanceof Error ? err.message : "Ошибка загрузки черновика"
                );
            } finally {
                setPageLoading(false);
            }
        };

        void loadDraft();
    }, [router, searchParams]);

    const buildPayload = () => {
        const safeTitle = title.trim() || "Без названия";

        return {
            title: safeTitle,
            annotation,
            content,
            coauthors,
            tags: selectedTags,
            sources: sources
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            // В payload отправляем только URL с сервера (не blob: preview)
            imageUrl: coverRemoteUrl || "",
            imageAlt: safeTitle,
            category: selectedTags[0] || "статья",
        };
    };

    const handleSaveDraft = async (): Promise<string | null> => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return null;
        }

        try {
            setIsSavingDraft(true);
            setSaveMessage("");
            setErrorMessage("");

            const uploadedImageUrl = await uploadCoverToServer();

            const payload = {
                ...buildPayload(),
                imageUrl: uploadedImageUrl || coverRemoteUrl || "",
            };

            const url = draftId
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/articles/draft/${draftId}`
                : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/articles/draft`;

            const method = draftId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await readJsonSafe<MyArticleResponse>(res);

            if (!res.ok || !data.article) {
                throw new Error(data.message || "Не удалось сохранить черновик");
            }

            const nextDraftId = data.article.id;
            setDraftId(nextDraftId);
            setSaveMessage("Черновик сохранён");

            if (!searchParams.get("draftId")) {
                router.replace(`/profile/create-article?draftId=${nextDraftId}`);
            }

            return nextDraftId;
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Ошибка сохранения");
            return null;
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handlePublish = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            setIsPublishing(true);
            setSaveMessage("");
            setErrorMessage("");

            let currentId = draftId;

            if (!currentId) {
                currentId = await handleSaveDraft();
            }

            if (!currentId) {
                throw new Error("Сначала сохраните черновик");
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/articles/publish`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ id: currentId }),
                }
            );

            const data = await readJsonSafe<{ message?: string }>(res);

            if (!res.ok) {
                throw new Error(data.message || "Не удалось опубликовать статью");
            }

            router.push("/profile");
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Ошибка публикации");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <div className={styles.topbarLeft}>
                    <nav className={styles.tabs}>
                        <Link href="/feed" className={styles.tab}>Feed</Link>
                        <Link href="/ai" className={styles.tab}>Chat</Link>
                    </nav>

                    <Link href="/profile" className={styles.backBtn} aria-label="Назад">
                        <ArrowLeftIcon />
                    </Link>
                </div>

                <div className={styles.avatarStub} />
            </header>

            <main className={styles.layout} ref={mainRef}>
                <section className={styles.leftColumn}>
                    <button
                        type="button"
                        className={styles.imageDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={
                            coverPreview
                                ? {
                                    backgroundImage: `url(${coverPreview})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }
                                : undefined
                        }
                    >
                        {!coverPreview && (
                            <span className={styles.imageDropText}>
                                Перетащите изображение, или
                                <br />
                                выберите с вашего устройства
                                <br />
                                Формат 1:1
                            </span>
                        )}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleCoverChange}
                    />

                    {coverLabel ? (
                        <div className={styles.fileName}>Обложка: {coverLabel}</div>
                    ) : null}

                    <div className={styles.fieldBlock}>
                        <label className={styles.blockLabel}>Аннотация</label>
                        <textarea
                            className={styles.largeTextarea}
                            value={annotation}
                            onChange={(e) => setAnnotation(e.target.value)}
                            placeholder="Добавьте краткое описание вашей статьи. До 400 символов."
                            maxLength={400}
                        />
                    </div>
                </section>

                <div className={styles.centerDivider}>
                    <div
                        className={styles.scrollDot}
                        style={{ top: `calc(${scrollProgress * 100}% - 11px)` }}
                    />
                </div>

                <section className={styles.rightColumn}>
                    <div className={styles.inlineFieldRow}>
                        <label className={styles.inlineLabel}>Название статьи</label>
                        <input
                            className={styles.inlineInput}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Укажите название вашей статьи"
                        />
                    </div>

                    <div className={styles.inlineFieldRow}>
                        <label className={styles.inlineLabel}>Соавторы</label>
                        <input
                            className={styles.inlineInput}
                            value={coauthors}
                            onChange={(e) => setCoauthors(e.target.value)}
                            placeholder="Укажите соавторов статьи"
                        />
                    </div>

                    <div className={styles.fieldBlock}>
                        <label className={styles.blockLabel}>Выберите теги</label>

                        <div className={styles.tagsWrap}>
                            {allTags.map((tag) => {
                                const active = selectedTags.includes(tag.id);

                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`${styles.tagPill} ${active ? styles.tagPillActive : ""}`}
                                        onClick={() => toggleTag(tag.id)}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}

                            {isAddingTag ? (
                                <div className={styles.addTagInline}>
                                    <input
                                        ref={customTagInputRef}
                                        type="text"
                                        value={newTagValue}
                                        onChange={(e) => setNewTagValue(e.target.value)}
                                        onKeyDown={handleNewTagKeyDown}
                                        onBlur={() => {
                                            if (newTagValue.trim()) {
                                                addCustomTag();
                                            } else {
                                                setIsAddingTag(false);
                                            }
                                        }}
                                        className={styles.addTagInput}
                                        placeholder="Новый тег"
                                        maxLength={30}
                                    />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.addTagBtn}
                                    onClick={openAddTag}
                                    aria-label="Добавить свой тег"
                                >
                                    +
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.fieldBlock}>
                        <label className={styles.blockLabel}>Текст статьи</label>
                        <RichTextEditor value={content} onChange={setContent} />
                    </div>

                    <div className={styles.fieldBlock}>
                        <label className={styles.blockLabel}>Источники</label>
                        <textarea
                            className={styles.sourcesTextarea}
                            value={sources}
                            onChange={(e) => setSources(e.target.value)}
                            placeholder="Добавьте ссылки на источники, которые использовались при написании работы"
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => void handleSaveDraft()}
                            disabled={isSavingDraft || pageLoading}
                        >
                            {isSavingDraft ? "Сохраняем..." : "Сохранить черновик"}
                        </button>

                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => void handlePublish()}
                            disabled={isPublishing || pageLoading}
                        >
                            {isPublishing ? "Публикуем..." : "Отправить на публикацию"}
                        </button>
                    </div>

                    {pageLoading ? <p className={styles.statusText}>Загрузка черновика...</p> : null}
                    {saveMessage ? <p className={styles.successText}>{saveMessage}</p> : null}
                    {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
                </section>
            </main>
        </div>
    );
}