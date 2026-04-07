"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../profile.module.css";

function ArrowLeftIcon() {
    return (
        <svg width="58" height="24" viewBox="0 0 58 24" fill="none" aria-hidden="true">
            <path d="M56 12H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

async function readJsonSafe(res: Response) {
    const text = await res.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        throw new Error("Сервер вернул не JSON. Проверь адрес API и маршрут на бэкенде.");
    }
}

export default function ChangePasswordPage() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
            return;
        }

        if (!currentPassword || !newPassword || !repeatPassword) {
            setError("Заполните все поля");
            setSuccess("");
            return;
        }

        if (newPassword.length < 6) {
            setError("Новый пароль должен быть не короче 6 символов");
            setSuccess("");
            return;
        }

        if (newPassword !== repeatPassword) {
            setError("Пароли не совпадают");
            setSuccess("");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            const data = await readJsonSafe(res);

            if (res.status === 401) {
                localStorage.removeItem("token");
                router.push("/login");
                return;
            }

            if (!res.ok) {
                throw new Error(data.message || "Не удалось изменить пароль");
            }

            setCurrentPassword("");
            setNewPassword("");
            setRepeatPassword("");
            setSuccess("Пароль успешно изменён");

            setTimeout(() => {
                router.push("/profile/settings");
            }, 900);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка смены пароля");
            setSuccess("");
        } finally {
            setSaving(false);
        }
    };

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

                    <Link href="/profile/settings" className={styles.backBtn}>
                        <ArrowLeftIcon />
                    </Link>
                </div>
            </header>

            <main className={styles.container}>
                <section className={styles.changePasswordPage}>
                    <h1 className={styles.changePasswordTitle}>Смена пароля</h1>

                    <div className={styles.changePasswordForm}>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Введите текущий пароль"
                            className={styles.passwordLineInput}
                        />

                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Введите новый пароль"
                            className={styles.passwordLineInput}
                        />

                        <input
                            type="password"
                            value={repeatPassword}
                            onChange={(e) => setRepeatPassword(e.target.value)}
                            placeholder="Повторите пароль"
                            className={styles.passwordLineInput}
                        />

                        {error ? <div className={styles.errorText}>{error}</div> : null}
                        {success ? <div className={styles.successText}>{success}</div> : null}
                    </div>

                    <div className={styles.changePasswordActions}>
                        <button
                            type="button"
                            className={styles.primaryWideBtn}
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? "Сохранение..." : "Подтвердить смену пароля"}
                        </button>

                        <button
                            type="button"
                            className={styles.ghostLinkBtn}
                            onClick={() => router.push("/profile/settings")}
                        >
                            Не хочу менять пароль
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}