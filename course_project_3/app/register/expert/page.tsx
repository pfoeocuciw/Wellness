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
    };

    const removeFile = () => {
        setFile(null);
        if (inputRef.current) inputRef.current.value = ''; // важно, чтобы можно было выбрать тот же файл снова
    };

    const onNext = () => {
        if (!canGoNext) return;
        // тут отправка на бэк: education + file
        router.push('/register/tags');
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

                    <button className={styles.button} onClick={onNext} disabled={!canGoNext}>
                        Дальше
                    </button>
                </div>
            </div>
        </div>
    );
}
