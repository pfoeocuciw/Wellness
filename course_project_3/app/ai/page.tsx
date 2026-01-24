'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './ai.module.css';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


type Msg = { id: string; role: 'user' | 'assistant'; text: string };

export default function AiPage() {
    const quickPrompts = useMemo(
        () => [
            'Расскажи о витаминах, которые стоит принимать зимой',
            'На что стоит обращать внимание при выборе плана питания?',
            'Как быстро справиться со стрессом и отвлечься от тревоги?',
        ],
        []
    );

    const [activeTab, setActiveTab] = useState<'feed' | 'chat'>('chat');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Msg[]>([]);

    async function send(text: string) {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        const typingId = crypto.randomUUID();
        setMessages((prev) => [
            ...prev,
            { id: typingId, role: 'assistant', text: 'Печатаю…' },
        ]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: {
                answer: string;
                reasoning?: string | null;
                sources?: { title: string; url: string }[];
            } = await res.json();

            const assistantTextParts = [
                data.answer,
                data.reasoning ? `\n\nОбъяснение (коротко):\n${data.reasoning}` : '',
                data.sources?.length
                    ? `\n\nИсточники:\n` +
                    data.sources
                        .map((s, i) => `${i + 1}) ${s.title}\n${s.url}`)
                        .join('\n\n')
                    : '',
            ];

            const assistantMsg: Msg = {
                id: crypto.randomUUID(),
                role: 'assistant',
                text: assistantTextParts.filter(Boolean).join(''),
            };

            setMessages((prev) =>
                prev.filter((m) => m.id !== typingId).concat(assistantMsg)
            );
        } catch (e) {
            setMessages((prev) =>
                prev
                    .filter((m) => m.id !== typingId)
                    .concat({
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        text: 'Ошибка при запросе к серверу.',
                    })
            );
        }
    }


    return (
        <main className={styles.page}>
            <header className={styles.topbar}>
                <div className={styles.tabs}>
                    <Link
                        href="/articles"
                        className={`${styles.tab} ${activeTab === 'feed' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('feed')}
                    >
                        Feed
                    </Link>

                    <span className={styles.tabDivider} />

                    <button
                        type="button"
                        className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        Chat
                    </button>
                </div>

                <div className={styles.avatar} aria-label="profile" />
            </header>

            <section className={styles.main}>
                {messages.length === 0 ? (
                    <>
                        <h1 className={styles.hero}>
                            ЗДРАВСТВУЙТЕ,<br />
                            Я — ВАШ ПОМОЩНИК НА<br />
                            БАЗЕ ИСКУССТВЕННОГО<br />
                            ИНТЕЛЛЕКТА
                        </h1>

                        <div className={styles.quickRow}>
                            {quickPrompts.map((p) => (
                                <button key={p} className={styles.quickBtn} onClick={() => send(p)}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.chatArea}>
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`${styles.bubble} ${
                                    m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
                                }`}
                            >
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.text}
                                </ReactMarkdown>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <footer className={styles.bottom}>
                <form
                    className={styles.inputBar}
                    onSubmit={(e) => {
                        e.preventDefault();
                        send(input);
                    }}
                >
                    <input
                        className={styles.input}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Какой у вас вопрос?"
                    />
                </form>
            </footer>
        </main>
    );
}
