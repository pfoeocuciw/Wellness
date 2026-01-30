"use client";

import Link from "next/link";
import styles from "./ai.module.css";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";



type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    text: string;
};

type ChatItem = {
    id: string;
    title: string;
    messages: ChatMessage[];
};

function uid() {
    return Math.random().toString(36).slice(2);
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
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    const [chats, setChats] = useState<ChatItem[]>([
        { id: "all", title: "Ваши чаты", messages: [] },
        { id: "c1", title: "Зимние витамины", messages: [] },
        { id: "c2", title: "Достоверна ли информация из рилса", messages: [] },
        { id: "c3", title: "Расписание пробежек для начинающих", messages: [] },
    ]);

    const [activeChatId, setActiveChatId] = useState<string>("all");

    const activeChat = useMemo(
        () => chats.find((c) => c.id === activeChatId) ?? chats[0],
        [chats, activeChatId]
    );

    const [input, setInput] = useState<string>("");

    const suggestions: string[] = [
        "Расскажи о витаминах, которые стоит принимать зимой",
        "На что стоит обращать внимание при выборе плана питания?",
        "Как быстро справиться со стрессом и отвлечься от тревоги?",
    ];

    useEffect(() => {
        if (!sidebarOpen) return;

        const onKeyDown = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Escape") setSidebarOpen(false);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [sidebarOpen]);



    const send = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: ChatMessage = { id: uid(), role: "user", text: trimmed };

        const assistantMsg: ChatMessage = {
            id: uid(),
            role: "assistant",
            text:
                "Хорошо, сейчас подготовлю список витаминов, которые стоит принимать зимой. " +
                "Помните, что принимать витамины без назначения врача и неудовлетворительных результатов анализов — большой риск. " +
                "Прежде чем прислушиваться к совету обратитесь к специалисту",
        };

        setChats((prev) =>
            prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, userMsg, assistantMsg] } : c))
        );

        setInput("");
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") send(input);
    };

    const startNewChat = () => {
        const id = uid();
        const newChat: ChatItem = { id, title: "Новый чат", messages: [] };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(id);
        setSidebarOpen(true);
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
                    {/* ✅ кнопка открытия, когда sidebar закрыт */}
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

                    {/* ✅ overlay sidebar поверх main */}
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
                            {chats.map((c) => {
                                const active = c.id === activeChatId;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`${styles.chatItem} ${active ? styles.chatItemActive : ""}`}
                                        onClick={() => setActiveChatId(c.id)}
                                    >
                                        {c.title}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>


                    {/* content */}
                    <div className={styles.center}>
                        {activeChat.messages.length === 0 ? (
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
                            <div className={styles.messages}>
                                {activeChat.messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`${styles.bubble} ${m.role === "user" ? styles.userBubble : styles.assistantBubble}`}
                                    >
                                        {m.text}
                                    </div>
                                ))}
                                <div className={`${styles.bubble} ${styles.typing}`}>…</div>
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

                            <button
                                type="button"
                                className={styles.sendBtn}
                                onClick={() => send(input)}
                                aria-label="Отправить"
                            >
                                <SendIcon />
                            </button>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}
