"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./tags.module.css";

type Category = {
    id: number;
    name: string;
    description?: string | null;
};

type ProfileInterest = {
    id: number;
    name: string;
    description?: string | null;
};

type ProfileResponse = {
    interests: ProfileInterest[];
};

async function readJsonSafe(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return {};

    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new Error("Сервер вернул не JSON");
    }
}

export default function TagsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const from = searchParams.get("from");
    const isSettingsFlow = from === "settings";

    const [tags, setTags] = useState<Category[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError("");

                const categoriesRes = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/categories`,
                    { cache: "no-store" }
                );

                const categoriesData = await readJsonSafe(categoriesRes);

                if (!categoriesRes.ok || !Array.isArray(categoriesData)) {
                    throw new Error("Не удалось загрузить категории");
                }

                setTags(categoriesData as Category[]);

                if (isSettingsFlow) {
                    const token = localStorage.getItem("token");

                    if (!token) {
                        router.push("/login");
                        return;
                    }

                    const profileRes = await fetch(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/me`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            cache: "no-store",
                        }
                    );

                    const profileData = await readJsonSafe(profileRes);

                    if (profileRes.status === 401) {
                        localStorage.removeItem("token");
                        router.push("/login");
                        return;
                    }

                    if (
                        !profileRes.ok ||
                        typeof profileData !== "object" ||
                        profileData === null ||
                        !("interests" in profileData) ||
                        !Array.isArray(profileData.interests)
                    ) {
                        throw new Error("Не удалось загрузить текущие интересы");
                    }

                    const typedProfile = profileData as ProfileResponse;
                    setSelected(typedProfile.interests.map((item) => item.id));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Ошибка загрузки тегов");
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, [isSettingsFlow, router]);

    const toggle = (id: number) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const canGo = useMemo(() => selected.length > 0 && !saving, [selected.length, saving]);

    const onContinue = async () => {
        if (!selected.length) return;

        try {
            setSaving(true);
            setError("");

            const token = localStorage.getItem("token");

            if (!token) {
                router.push("/login");
                return;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/interests`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    categoryIds: selected,
                }),
            });

            const data = await readJsonSafe(res);

            if (res.status === 401) {
                localStorage.removeItem("token");
                router.push("/login");
                return;
            }

            if (!res.ok) {
                const message =
                    typeof data === "object" &&
                    data !== null &&
                    "message" in data &&
                    typeof data.message === "string"
                        ? data.message
                        : "Не удалось сохранить теги";

                throw new Error(message);
            }

            router.push(isSettingsFlow ? "/profile/settings" : "/feed");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка при сохранении тегов");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <h1 className={styles.title}>
                        {isSettingsFlow ? "Измените любимые темы" : "Выберите, что вас интересует"}
                    </h1>
                    <div>Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>
                    {isSettingsFlow ? "Измените любимые темы" : "Выберите, что вас интересует"}
                </h1>

                {error ? <div className={styles.errorText}>{error}</div> : null}

                <div className={styles.tagsGrid}>
                    {tags.map((tag) => {
                        const active = selected.includes(tag.id);

                        return (
                            <button
                                key={tag.id}
                                type="button"
                                className={`${styles.tag} ${active ? styles.tagActive : ""}`}
                                onClick={() => toggle(tag.id)}
                            >
                                {tag.name}
                            </button>
                        );
                    })}
                </div>

                <button className={styles.button} onClick={onContinue} disabled={!canGo}>
                    {saving
                        ? "Сохранение..."
                        : isSettingsFlow
                            ? "Сохранить темы"
                            : "К статьям"}
                </button>
            </div>
        </div>
    );
}