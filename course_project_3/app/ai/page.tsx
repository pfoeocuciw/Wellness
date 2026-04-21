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
    createdAt: string;
};

function tmpId() {
    return `tmp-${Math.random().toString(36).slice(2)}`;
}

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
    const [authError, setAuthError] = useState("");


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

    const apiBase = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001", []);

    const apiFetch = async (path: string, init?: RequestInit) => {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("NO_TOKEN");

        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${token}`);
        if (init?.body && !(init.body instanceof FormData)) {
            if (!headers.get("Content-Type")) headers.set("Content-Type", "application/json");
        }

        return await fetch(`${apiBase}${path}`, { ...init, headers, cache: "no-store" });
    };

    const loadChats = async () => {
        try {
            setAuthError("");
            const res = await apiFetch("/api/chats");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { chats?: { id: string; title: string; createdAt: string }[] };
            const list = Array.isArray(data.chats) ? data.chats : [];
            setChats(list.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, messages: [] })));
            if (list.length > 0) setActiveChatId(list[0].id);
        } catch (e) {
            if (e instanceof Error && e.message === "NO_TOKEN") {
                setAuthError("Чтобы сохранять чаты в базе, нужно войти в аккаунт.");
            } else {
                setAuthError("Не удалось загрузить чаты. Проверьте backend и токен.");
            }
        }
    };

    useEffect(() => {
        void loadChats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!menuForChatId) return;
        const onDoc = () => setMenuForChatId(null);
        document.addEventListener("click", onDoc);
        return () => document.removeEventListener("click", onDoc);
    }, [menuForChatId]);

    const renameChat = (id: string) => {
        const current = chats.find((c) => c.id === id);
        const next = prompt("Новое название чата:", current?.title ?? "");
        if (!next) return;
        const trimmed = next.trim();
        if (!trimmed) return;
        setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
        void apiFetch(`/api/chats/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify({ title: trimmed }),
        }).catch(() => {});
    };

    const deleteChat = (id: string) => {
        const ok = confirm("Удалить этот чат?");
        if (!ok) return;

        void apiFetch(`/api/chats/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});

        setChats((prev) => {
            const next = prev.filter((c) => c.id !== id);
            if (activeChatId === id) setActiveChatId(next[0]?.id ?? null);
            return next;
        });

        setMenuForChatId(null);
    };

    //const API = process.env.NEXT_PUBLIC_CHAT_API_URL;

    const generateTitle = async (text: string) => {
        const r = await fetch("/api/generate-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });

        if (!r.ok) return null;

        const data: { title?: string } = await r.json();
        return data.title?.trim() || null;
    };

    const loadChatMessages = async (chatId: string) => {
        try {
            const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}`);
            if (!res.ok) return;
            const data = (await res.json()) as {
                chat?: {
                    id: string;
                    title: string;
                    createdAt: string;
                    messages?: { id: string; role: string; text: string }[];
                };
            };
            if (!data.chat) return;

            const msgs = Array.isArray(data.chat.messages) ? data.chat.messages : [];
            setChats((prev) =>
                prev.map((c) =>
                    c.id === chatId
                        ? {
                            ...c,
                            title: data.chat!.title,
                            messages: msgs
                                .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
                                .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", text: m.text })),
                        }
                        : c
                )
            );
        } catch {
            // ignore
        }
    };

    const ensureChatExists = async () => {
        if (activeChatId) return activeChatId;

        const res = await apiFetch("/api/chats", {
            method: "POST",
            body: JSON.stringify({ title: "Новый чат" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { chat?: { id: string; title: string; createdAt: string } };
        if (!data.chat) throw new Error("Bad response");

        setChats((prev) => [{ id: data.chat!.id, title: data.chat!.title, createdAt: data.chat!.createdAt, messages: [] }, ...prev]);
        setActiveChatId(data.chat.id);
        return data.chat.id;
    };

    const send = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        let chatId: string;
        try {
            chatId = await ensureChatExists();
        } catch {
            setAuthError("Нужно войти в аккаунт, чтобы сохранять чат в базе.");
            return;
        }

        const userMsg: ChatMessage = { id: tmpId(), role: "user", text: trimmed };

        // Добавляем сообщение и, если это первое — сразу ставим временный заголовок
        // (чтобы никогда не оставалось "Новый чат" после вопроса).
        let wasFirstMessage = false;
        setChats((prev) =>
            prev.map((c) => {
                if (c.id !== chatId) return c;
                wasFirstMessage = c.messages.length === 0;
                const nextTitle = wasFirstMessage ? makeTitleFromQuestion(trimmed) : c.title;
                return { ...c, title: nextTitle, messages: [...c.messages, userMsg] };
            })
        );

        // сохраняем сообщение пользователя в БД
        try {
            const saved = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
                method: "POST",
                body: JSON.stringify({ role: "user", text: trimmed }),
            });
            if (saved.ok) {
                const data = (await saved.json()) as { message?: { id: string } };
                if (data.message?.id) {
                    setChats((prev) =>
                        prev.map((c) =>
                            c.id === chatId
                                ? { ...c, messages: c.messages.map((m) => (m.id === userMsg.id ? { ...m, id: data.message!.id } : m)) }
                                : c
                        )
                    );
                }
            }
        } catch {}

        // если это первое сообщение — попросим бек сгенерировать нормальное название
        if (wasFirstMessage) {
            // затем заменим на красивый заголовок от Groq
            generateTitle(trimmed)
                .then((title) => {
                    if (!title) return;
                    setChats((prev) =>
                        prev.map((c) =>
                            c.id === chatId ? { ...c, title } : c
                        )
                    );
                    void apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, {
                        method: "PATCH",
                        body: JSON.stringify({ title }),
                    }).catch(() => {});
                })
                .catch(() => {});

            // fallback title тоже фиксируем в БД
            void apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, {
                method: "PATCH",
                body: JSON.stringify({ title: makeTitleFromQuestion(trimmed) }),
            }).catch(() => {});
        }

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

            const currentChat = chats.find((c) => c.id === chatId);
            const history = (currentChat?.messages ?? []).slice(-5);

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


            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(`Backend error: ${res.status}`);

            const data: { answer?: string } = await res.json();

            const assistantMsg: ChatMessage = {
                id: tmpId(),
                role: "assistant",
                text: data.answer?.trim() || "Пустой ответ от ИИ",
            };

            setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
            );

            // сохраняем ответ ассистента в БД
            try {
                const saved = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
                    method: "POST",
                    body: JSON.stringify({ role: "assistant", text: assistantMsg.text }),
                });
                if (saved.ok) {
                    const data = (await saved.json()) as { message?: { id: string } };
                    if (data.message?.id) {
                        setChats((prev) =>
                            prev.map((c) =>
                                c.id === chatId
                                    ? { ...c, messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, id: data.message!.id } : m)) }
                                    : c
                            )
                        );
                    }
                }
            } catch {}

            requestAnimationFrame(() => scrollToBottom(true));
        } catch {
            const assistantMsg: ChatMessage = {
                id: tmpId(),
                role: "assistant",
                text: "Не получилось получить ответ от ИИ. Проверь, что бэкенд запущен и ключ GROQ_API_KEY задан.",
            };

            setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
            );

            // Если это первое сообщение в чате — генерируем название
            /*const currentChat = chats.find((c) => c.id === activeChatId);

            if (currentChat && currentChat.messages.length === 0) {
                try {
                    const titleRes = await fetch(
                        `${API}/generate-title`,
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
            }*/


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
        void (async () => {
            try {
                const res = await apiFetch("/api/chats", {
                    method: "POST",
                    body: JSON.stringify({ title: "Новый чат" }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as { chat?: { id: string; title: string; createdAt: string } };
                if (!data.chat) throw new Error("Bad response");

                setChats((prev) => [{ id: data.chat!.id, title: data.chat!.title, createdAt: data.chat!.createdAt, messages: [] }, ...prev]);
                setActiveChatId(data.chat.id);
                setSidebarOpen(true);
                setMenuForChatId(null);
                requestAnimationFrame(() => scrollToBottom(false));
            } catch {
                setAuthError("Нужно войти в аккаунт, чтобы создавать чаты.");
            }
        })();
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
                    {authError ? (
                        <div style={{ padding: 12, color: "var(--danger, #d33)" }}>
                            {authError} <Link href="/login">Войти</Link>
                        </div>
                    ) : null}
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
                                                onClick={() => {
                                                    setActiveChatId(c.id);
                                                    if (c.messages.length === 0) void loadChatMessages(c.id);
                                                }}
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