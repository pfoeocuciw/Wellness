'use client';


import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './expert.module.css';

export default function ExpertVerifyPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [education, setEducation] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);

    const fileLabel = useMemo(() => {
        if (!file) return '';
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        return `${file.name} • ${sizeMb} MB`;
    }, [file]);

    const canGoNext = education.trim().length > 0 && !!file;

    const openPicker = () => inputRef.current?.click();

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        setError("");
        setSuccess("");
        setRejectionReasons([]);
    };

    const removeFile = () => {
        setFile(null);
        if (inputRef.current) inputRef.current.value = ''; // важно, чтобы можно было выбрать тот же файл снова
    };

    const onNext = async () => {
        if (!canGoNext || !file) return;

        setRejectionReasons([]);

        const token = localStorage.getItem("token");
        if (!token) {
            setError("Не найден токен пользователя");
            return;
        }

        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const formData = new FormData();
            formData.append("education_description", education.trim());
            formData.append("file", file);

            const aiRes = await fetch("/api/expert-verify", {
                method: "POST",
                body: formData,
            });

            const text = await aiRes.text();
            let aiData;

            try {
                aiData = text ? JSON.parse(text) : {};
            } catch {
                throw new Error("AI вернул не JSON");
            }

            if (!aiRes.ok) {
                throw new Error(aiData.detail || aiData.message || "Ошибка AI-проверки");
            }

            if (!aiData.verified) {
                setError(aiData.message || "Диплом не прошёл проверку");

                // 🔥 сохраняем причины
                setRejectionReasons(aiData.reasons || []);

                return;
            }

            const saveRes = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/apply-expert-verification`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        educationDescription: education.trim(),
                        verified: aiData.verified,
                        message: aiData.message,
                        savedPath: aiData.saved_path,
                        fileName: file.name,
                    }),
                }
            );

            const saveData = await saveRes.json();

            if (!saveRes.ok) {
                throw new Error(saveData.message || "Не удалось сохранить результат");
            }

            setSuccess("Диплом подтверждён");
            router.push("/register/tags");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка проверки диплома");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Подтверждение экспертизы</h1>

                <div className={styles.form}>
                    {/* поле образования с исчезающим лейблом */}
                    <div className={styles.field}>
                        <input
                            className={styles.input}
                            value={education}
                            onChange={(e) => setEducation(e.target.value)}
                            placeholder=" "
                            type="text"
                        />
                        <label className={styles.label}>Какое у вас образование?</label>
                    </div>

                    {/* upload card */}
                    <div className={styles.uploadCard} onClick={openPicker} role="button" tabIndex={0}>
                        <div className={styles.uploadText}>
                            Прикрепите копию вашего диплома или других документов,
                            <br />
                            подтверждающих, что вам можно доверять
                        </div>

                        {file ? (
                            <div className={styles.fileRow} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.fileMeta}>{fileLabel}</div>
                                <button className={styles.removeBtn} type="button" onClick={removeFile}>
                                    Удалить
                                </button>
                            </div>
                        ) : (
                            <div className={styles.hint}>Нажмите, чтобы выбрать файл (PDF/JPG/PNG)</div>
                        )}

                        <input
                            ref={inputRef}
                            className={styles.hiddenFile}
                            type="file"
                            accept=".pdf,image/*"
                            onChange={onFileChange}
                        />
                    </div>

                    <div className={styles.feedbackWrap}>
                        {error ? <p className={styles.error}>{error}</p> : null}

                        {rejectionReasons.length > 0 && (
                            <div className={styles.reasonsCard}>
                                <div className={styles.reasonsHeader}>Почему документ не прошёл</div>
                                <ul className={styles.reasonsList}>
                                    {rejectionReasons.map((reason, index) => (
                                        <li key={index} className={styles.reasonItem}>
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {success ? <p className={styles.success}>{success}</p> : null}
                    </div>

                    <button className={styles.button} onClick={onNext} disabled={!canGoNext || isSubmitting}>
                        {isSubmitting ? "Проверяем..." : "Дальше"}
                    </button>
                </div>
            </div>
        </div>
    );
}
