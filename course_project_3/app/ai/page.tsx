"use client";

import Link from "next/link";
import styles from "./ai.module.css";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    text: string;
};

type ChatItem = {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
};

function uid() {
    return Math.random().toString(36).slice(2);
}

const STORAGE_KEY = "wellness_chats_v1";

function makeTitleFromQuestion(q: string) {
    const cleaned = q.replace(/\s+/g, " ").trim();
    if (!cleaned) return "Новый чат";
    const max = 32;
    return cleaned.length > max ? cleaned.slice(0, max).trim() + "…" : cleaned;
}

function DotsIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
        </svg>
    );
}


function SidebarIcon() {
    return (
        <svg className={styles.sidebarIcon} viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M9 4v16" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

function SendIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
    );
}

export default function AiPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [chats, setChats] = useState<ChatItem[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);


    const activeChat = useMemo(() => {
        if (!activeChatId) return null;
        return chats.find((c) => c.id === activeChatId) ?? null;
    }, [chats, activeChatId]);


    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [menuForChatId, setMenuForChatId] = useState<string | null>(null);

    const suggestions = [
        "Расскажи о витаминах, которые стоит принимать зимой",
        "На что стоит обращать внимание при выборе плана питания?",
        "Как быстро справиться со стрессом и отвлечься от тревоги?",
    ];

    // --- refs для автоскролла ---
    const scrollBoxRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const isNearBottom = () => {
        const el = scrollBoxRef.current;
        if (!el) return true;
        const threshold = 140; // px
        return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    };

    // Автоскролл при добавлении сообщений (только если пользователь внизу)
    useEffect(() => {
        if (isNearBottom()) scrollToBottom(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChatId, activeChat?.messages?.length, isLoading]);

    // Escape закрывает сайдбар
    useEffect(() => {
        if (!sidebarOpen) return;
        const onKeyDown = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Escape") setSidebarOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [sidebarOpen]);

    // загрузка из localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as ChatItem[];
            if (Array.isArray(parsed)) {
                setChats(parsed);
                if (parsed.length > 0) setActiveChatId(parsed[0].id);
            }
        } catch {}
    }, []);

// сохранение в localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
        } catch {}
    }, [chats]);

    useEffect(() => {
        if (!menuForChatId) return;
        const onDoc = () => setMenuForChatId(null);
        document.addEventListener("click", onDoc);
        return () => document.removeEventListener("click", onDoc);
    }, [menuForChatId]);

    const ensureChatExists = () => {
        if (activeChatId) return activeChatId;

        const id = uid();
        const newChat: ChatItem = { id, title: "Новый чат", messages: [], createdAt: Date.now() };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(id);
        return id;
    };

    const renameChat = (id: string) => {
        const current = chats.find((c) => c.id === id);
        const next = prompt("Новое название чата:", current?.title ?? "");
        if (!next) return;
        setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: next.trim() } : c)));
    };

    const deleteChat = (id: string) => {
        const ok = confirm("Удалить этот чат?");
        if (!ok) return;

        setChats((prev) => {
            const next = prev.filter((c) => c.id !== id);
            if (activeChatId === id) setActiveChatId(next[0]?.id ?? null);
            return next;
        });

        setMenuForChatId(null);
    };

    const API = process.env.NEXT_PUBLIC_API_URL;

    const generateTitle = async (text: string) => {
        if (!API) return null;

        const r = await fetch(`${API}/generate-title`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });

        if (!r.ok) return null;

        const data: { title?: string } = await r.json();
        return data.title?.trim() || null;
    };




    const send = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        const userMsg: ChatMessage = { id: uid(), role: "user", text: trimmed };

        const chatId = ensureChatExists();

        const current = chats.find((c) => c.id === activeChatId);
        const isFirstMessage = !current || current.messages.length === 0;

        setChats((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, userMsg] } : c))
        );

        // если это первое сообщение — попросим бек сгенерировать нормальное название
        if (isFirstMessage) {
            // можно сразу поставить временный заголовок, чтобы не было "Новый чат"
            setChats((prev) =>
                prev.map((c) =>
                    c.id === activeChatId ? { ...c, title: trimmed.slice(0, 24) } : c
                )
            );

            // затем заменим на красивый заголовок от Groq
            generateTitle(trimmed)
                .then((title) => {
                    if (!title) return;
                    setChats((prev) =>
                        prev.map((c) =>
                            c.id === activeChatId ? { ...c, title } : c
                        )
                    );
                })
                .catch(() => {});
        }


// если первое сообщение — ставим заголовок
        setChats((prev) =>
            prev.map((c) => {
                if (c.id !== chatId) return c;
                if (c.messages.length === 0) return { ...c, title: makeTitleFromQuestion(trimmed) };
                return c;
            })
        );

        setInput("");
        setIsLoading(true);

        // сразу прокрутим вниз после сообщения пользователя (без ожидания эффекта)
        requestAnimationFrame(() => scrollToBottom(true));

        try {

            // const res = await fetch("http://127.0.0.1:8000/chat", {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ messages: apiMessages }),
            // });

            const history = (activeChat?.messages ?? []).slice(-5); // последние 12

            const payload = {
                messages: [
                    ...history.map((m) => ({
                        role: m.role,          // "user" | "assistant"
                        content: m.text,
                    })),
                    { role: "user", content: trimmed },
                ],
            };

            // const apiMessages = history.map((m) => ({
            //     role: m.role,
            //     content: m.text,
            // }));


            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(`Backend error: ${res.status}`);

            const data: { answer?: string } = await res.json();

            const assistantMsg: ChatMessage = {
                id: uid(),
                role: "assistant",
                text: data.answer?.trim() || "Пустой ответ от ИИ",
            };

            setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
            );

            requestAnimationFrame(() => scrollToBottom(true));
        } catch {
            const assistantMsg: ChatMessage = {
                id: uid(),
                role: "assistant",
                text: "Не получилось получить ответ от ИИ. Проверь, что бэкенд запущен и ключ GROQ_API_KEY задан.",
            };

            setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
            );

            // Если это первое сообщение в чате — генерируем название
            const currentChat = chats.find((c) => c.id === activeChatId);

            if (currentChat && currentChat.messages.length === 0) {
                try {
                    const titleRes = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/generate-title`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: trimmed }),
                        }
                    );

                    if (titleRes.ok) {
                        const data = await titleRes.json();

                        setChats((prev) =>
                            prev.map((c) =>
                                c.id === activeChatId
                                    ? { ...c, title: data.title }
                                    : c
                            )
                        );
                    }
                } catch (e) {
                    console.log("Ошибка генерации названия");
                }
            }


            requestAnimationFrame(() => scrollToBottom(true));
        } finally {
            setIsLoading(false);
            requestAnimationFrame(() => scrollToBottom(true));
        }
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") send(input);
    };

    const startNewChat = () => {
        const id = uid();
        const newChat: ChatItem = { id, title: "Новый чат", messages: [], createdAt: Date.now() };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(id);
        setSidebarOpen(true);
        setMenuForChatId(null);

        requestAnimationFrame(() => scrollToBottom(false));
    };


    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <nav className={styles.tabs}>
                    <Link href="/feed" className={styles.tab}>
                        Feed
                    </Link>
                    <Link href="/ai" className={`${styles.tab} ${styles.tabActive}`}>
                        Chat
                    </Link>
                </nav>
            </header>

            <div className={styles.shell}>
                <main className={styles.main}>
                    {!sidebarOpen && (
                        <button
                            type="button"
                            className={styles.floatingToggle}
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Открыть диалоги"
                        >
                            <SidebarIcon />
                        </button>
                    )}

                    <aside
                        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayOpen : ""}`}
                        aria-hidden={!sidebarOpen}
                    >
                        <div className={styles.sidebarHeader}>
                            <button
                                className={styles.sidebarHeaderIcon}
                                onClick={() => setSidebarOpen(false)}
                                aria-label="Закрыть"
                                type="button"
                            >
                                <SidebarIcon />
                            </button>
                        </div>

                        <div className={styles.sidebarTop}>
                            <button type="button" className={styles.newChatBtn} onClick={startNewChat}>
                                Новый чат <span className={styles.pencil}>✎</span>
                            </button>
                        </div>

                        <div className={styles.chatList}>
                            {chats.length === 0 ? (
                                <div className={styles.emptyChats}>Пока нет чатов. Нажмите «Новый чат».</div>
                            ) : (
                                chats.map((c) => {
                                    const active = c.id === activeChatId;
                                    return (
                                        <div key={c.id} className={styles.chatRow}>
                                            <button
                                                type="button"
                                                className={`${styles.chatItem} ${active ? styles.chatItemActive : ""}`}
                                                onClick={() => setActiveChatId(c.id)}
                                            >
                                                {c.title}
                                            </button>

                                            <button
                                                type="button"
                                                className={styles.chatMenuBtn}
                                                aria-label="Меню"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuForChatId((prev) => (prev === c.id ? null : c.id));
                                                }}
                                            >
                                                <DotsIcon />
                                            </button>

                                            {menuForChatId === c.id && (
                                                <div className={styles.chatMenu} onClick={(e) => e.stopPropagation()}>
                                                    <button type="button" className={styles.chatMenuItem} onClick={() => renameChat(c.id)}>
                                                        Переименовать
                                                    </button>
                                                    <button type="button" className={styles.chatMenuItemDanger} onClick={() => deleteChat(c.id)}>
                                                        Удалить
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                    </aside>

                    <div className={styles.center}>
                        {!activeChat || activeChat.messages.length === 0 ? (
                            <>
                                <h1 className={styles.hero}>
                                    Здравствуйте, я — ваш помощник
                                    <br />
                                    на базе искусственного интеллекта
                                </h1>

                                <div className={styles.suggestRow}>
                                    {suggestions.map((s) => (
                                        <button key={s} type="button" className={styles.suggest} onClick={() => send(s)}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className={styles.messages} ref={scrollBoxRef}>
                                {activeChat.messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`${styles.bubble} ${m.role === "user" ? styles.userBubble : styles.assistantBubble}`}
                                    >
                                        {m.role === "assistant" ? (
                                            <div className={styles.md}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        table: ({ children }) => (
                                                            <div className={styles.tableWrap}>
                                                                <table>{children}</table>
                                                            </div>
                                                        ),
                                                    }}
                                                >
                                                    {m.text}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className={styles.plainText}>{m.text}</div>
                                        )}

                                    </div>
                                ))}

                                {isLoading && (
                                    <div className={`${styles.bubble} ${styles.typing}`}>
                                        <span className={styles.dot}></span>
                                        <span className={styles.dot}></span>
                                        <span className={styles.dot}></span>
                                    </div>
                                )}


                                {/* якорь для скролла */}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    <div className={styles.inputBar}>
                        <div className={styles.inputWrap}>
                            <input
                                className={styles.input}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Какой у вас вопрос?"
                            />

                            <button type="button" className={styles.sendBtn} onClick={() => send(input)} aria-label="Отправить">
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
