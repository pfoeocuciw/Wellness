"use client";

import Link from "next/link";
import styles from "../profile.module.css";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "user" | "expert";

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
    diploma_info?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    interests: Interest[];
    documents?: string[];
};

function ArrowLeftIcon() {
    return (
        <svg width="58" height="24" viewBox="0 0 58 24" fill="none" aria-hidden="true">
            <path d="M56 12H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 12L24 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

function PencilLineIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M15 5L19 9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M5 19L9.5 18L18 9.5L14.5 6L6 14.5L5 19Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PlusIcon() {
    return <span className={styles.plusIcon}>+</span>;
}

function toMediaUrl(url?: string | null) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`;
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

export default function ProfileSettingsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [documentName, setDocumentName] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
            }
        };
    }, []);


    useEffect(() => {
        const loadProfile = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                router.push("/login");
                return;
            }

            try {
                setError(null);

                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });

                const data = await readJsonSafe(res);

                if (res.status === 401) {
                    localStorage.removeItem("token");
                    router.push("/login");
                    return;
                }

                if (!res.ok) {
                    throw new Error(
                        typeof data.message === "string" ? data.message : "Не удалось загрузить настройки"
                    );
                }

                const typed = data as ProfileData;
                setProfile(typed);
                setFirstName(typed.first_name || "");
                setLastName(typed.last_name || "");
                setEmail(typed.email || "");
                setAvatarPreview(toMediaUrl(typed.avatarUrl) || null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Ошибка загрузки настроек");
            } finally {
                setLoading(false);
            }
        };

        void loadProfile();
    }, [router]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleDocumentUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setDocumentName(file.name);

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            setError(null);

            const formData = new FormData();
            formData.append("document", file);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/upload-document`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await readJsonSafe(res);

            if (!res.ok) {
                throw new Error(data.message || "Ошибка загрузки документа");
            }

            setSuccessMessage("Документ загружен");

        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const localPreview = URL.createObjectURL(file);
        setAvatarPreview(localPreview);

        try {
            setError(null);

            const formData = new FormData();
            formData.append("avatar", file);

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/avatar`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await readJsonSafe(res);

            if (res.status === 401) {
                localStorage.removeItem("token");
                router.push("/login");
                return;
            }

            if (!res.ok) {
                throw new Error(
                    typeof data.message === "string" ? data.message : "Не удалось загрузить фото"
                );
            }

            const nextAvatar =
                typeof data.avatarUrl === "string" ? toMediaUrl(data.avatarUrl) : localPreview;

            setProfile((prev) =>
                prev
                    ? {
                        ...prev,
                        avatarUrl:
                            typeof data.avatarUrl === "string" ? data.avatarUrl : prev.avatarUrl,
                    }
                    : prev
            );

            setAvatarPreview(nextAvatar);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка загрузки фото");
        }
    };

    const handleDeleteAccount = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
            return;
        }

        try {
            setError(null);

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/me`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await readJsonSafe(res);

            if (!res.ok) {
                throw new Error(
                    typeof data.message === "string" ? data.message : "Не удалось удалить аккаунт"
                );
            }

            localStorage.removeItem("token");
            localStorage.removeItem("profile");
            localStorage.removeItem("savedArticleIds");

            router.push("/login");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка удаления аккаунта");
            setDeleteOpen(false);
        }
    };

    const handleSave = async () => {
        if (!profile) return;

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccessMessage("");

            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
                successTimerRef.current = null;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                }),
            });

            const data = await readJsonSafe(res);

            if (res.status === 401) {
                localStorage.removeItem("token");
                router.push("/login");
                return;
            }

            if (!res.ok) {
                throw new Error(
                    typeof data.message === "string" ? data.message : "Не удалось сохранить настройки"
                );
            }

            const typed = data as ProfileData;
            setProfile(typed);
            setFirstName(typed.first_name || "");
            setLastName(typed.last_name || "");
            setEmail(typed.email || "");
            setAvatarPreview(toMediaUrl(typed.avatarUrl) || null);

            setSuccessMessage("Изменения сохранены");

            successTimerRef.current = setTimeout(() => {
                setSuccessMessage("");
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка сохранения");
            setSuccessMessage("");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

    if (loading) {
        return <div className={styles.loader}>Загрузка настроек...</div>;
    }

    if (error && !profile) {
        return <div className={styles.loader}>{error}</div>;
    }

    if (!profile) {
        return <div className={styles.loader}>Профиль не найден</div>;
    }

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

                    <Link href="/profile" className={styles.backBtn}>
                        <ArrowLeftIcon />
                    </Link>
                </div>
            </header>

            <main className={styles.container}>
                {error && <div className={styles.errorText}>{error}</div>}

                <section className={styles.settingsHead}>
                    <button
                        type="button"
                        className={styles.settingsAvatar}
                        onClick={handleAvatarClick}
                        style={
                            avatarPreview
                                ? {
                                    backgroundImage: `url(${avatarPreview})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }
                                : undefined
                        }
                        aria-label="Изменить фото профиля"
                    />

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleAvatarChange}
                    />

                    <div className={styles.settingsHeadInfo}>
                        <div className={styles.namePills}>
                            <div className={styles.namePill}>
                                <input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className={styles.namePillInput}
                                    placeholder="Имя"
                                />
                                <span className={styles.namePillIcon}>
                                    <PencilLineIcon />
                                </span>
                            </div>

                            <div className={styles.namePill}>
                                <input
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className={styles.namePillInput}
                                    placeholder="Фамилия"
                                />
                                <span className={styles.namePillIcon}>
                                    <PencilLineIcon />
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className={styles.settingsForm}>
                    <div className={styles.editField}>
                        {/*<label className={styles.fieldLabel}>Email</label>*/}
                        <input
                            value={email}
                            readOnly
                            className={`${styles.ghostInput} ${styles.readonlyInput}`}
                            placeholder="Email"
                        />
                    </div>

                    <button
                        type="button"
                        className={styles.passwordActionButton}
                        onClick={() => setConfirmPasswordOpen(true)}
                    >
                        Изменить пароль
                    </button>
                </section>

                <section className={styles.topicsSettingsSection}>
                    <button
                        type="button"
                        className={styles.topicsSettingsButton}
                        onClick={() => router.push("/register/tags?from=settings")}
                    >
                        <div className={styles.sectionLabel}>Любимые темы:</div>

                        <div className={styles.topicList}>
                            {profile.interests.length > 0 ? (
                                profile.interests.map((topic) => (
                                    <span key={topic.id} className={styles.topicPillDark}>
                        {topic.name}
                    </span>
                                ))
                            ) : (
                                <span className={styles.emptyTopicsText}>
                    Нажмите, чтобы выбрать интересующие темы
                </span>
                            )}

                            <span className={styles.addTopicBtn} aria-hidden="true">
                <PlusIcon />
            </span>
                        </div>
                    </button>
                </section>

                <section className={styles.verifyBlock}>

                    <h2 className={styles.verifyTitle}>
                        Сейчас вы — {profile.role === "expert" ? "эксперт платформы." : "пользователь платформы."}
                    </h2>
                    <input
                        type="file"
                        accept=".pdf,image/*"
                        ref={fileInputRef}
                        hidden
                        onChange={handleDocumentUpload}
                    />

                    <div className={styles.roleSwitch}>
        <span
            className={`${styles.switchBtn} ${
                profile.role === "user" ? styles.switchBtnActive : ""
            }`}
        >
            Пользователь
        </span>
                        <span
                            className={`${styles.switchBtn} ${
                                profile.role === "expert" ? styles.switchBtnActive : ""
                            }`}
                        >
            Эксперт
        </span>
                    </div>

                    {profile.role !== "expert" || !profile.is_verified ? (
                        <>
                            <p className={styles.verifyText}>
                                Чтобы публиковать собственные статьи, нужно прикрепить несколько документов на
                                проверку.
                            </p>

                            <div
                                className={styles.uploadStub}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {documentName || "Прикрепите копию вашего диплома или других документов, подтверждающих, что вам можно доверять"}
                            </div>

                            <button className={styles.primaryWideBtn} type="button">
                                Подтвердить экспертность
                            </button>
                        </>
                    ) : (
                        <p className={styles.verifyText}>
                            Ваш профиль эксперта подтверждён. Вы можете публиковать собственные статьи.
                        </p>
                    )}
                </section>

                {/*{successMessage ? (*/}
                {/*    <div className={styles.successMessageBox}>*/}
                {/*        {successMessage}*/}
                {/*    </div>*/}
                {/*) : null}*/}

                {successMessage ? (
                    <div className={styles.successMessageBox}>
                        {successMessage}
                    </div>
                ) : null}

                <div className={styles.bottomActions}>
                    <button
                        className={styles.primaryWideBtn}
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        Сохранить изменения
                    </button>

                    <button
                        className={styles.secondaryWideBtn}
                        type="button"
                        onClick={() => setLogoutOpen(true)}
                    >
                        Выйти
                    </button>

                    <button className={styles.deleteBtn} type="button" onClick={() => setDeleteOpen(true)}>
                        Удалить аккаунт
                    </button>
                </div>
            </main>

            {confirmPasswordOpen && (
                <div className={styles.modalOverlay} onClick={() => setConfirmPasswordOpen(false)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Изменить пароль?</h3>
                        <p className={styles.modalText}>
                            Вы уверены, что хотите перейти к смене пароля?
                        </p>

                        <div className={styles.modalRowActions}>
                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={() => setConfirmPasswordOpen(false)}
                            >
                                Отмена
                            </button>

                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={() => router.push("/profile/change-password")}
                            >
                                Изменить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {logoutOpen && (
                <div className={styles.modalOverlay} onClick={() => setLogoutOpen(false)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Выйти из аккаунта?</h3>

                        <div className={styles.modalRowActions}>
                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={() => setLogoutOpen(false)}
                            >
                                Отмена
                            </button>

                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={handleLogout}
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteOpen && (
                <div className={styles.modalOverlay} onClick={() => setDeleteOpen(false)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Удалить аккаунт?</h3>
                        <p className={styles.modalText}>
                            Это действие нельзя быстро отменить. Профиль будет скрыт, а вход в аккаунт станет недоступен.
                        </p>

                        <div className={styles.modalRowActions}>
                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={() => setDeleteOpen(false)}
                            >
                                Отмена
                            </button>

                            <button
                                type="button"
                                className={styles.modalHalfButton}
                                onClick={handleDeleteAccount}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}