'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './tags.module.css';

const TAGS = [
    'Йога',
    'Спорт',
    'Правильное питание',
    'Витамины и БАДы',
    'Сон',
    'Стресс',
    'Ментальное здоровье',
    'Профилактика',
];

export default function TagsPage() {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>([]);

    const toggle = (tag: string) => {
        setSelected((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const canGo = useMemo(() => selected.length > 0, [selected]);

    const onGoArticles = () => {
        // тут обычно: сохранить интересы на бэке
        sessionStorage.setItem('tags', JSON.stringify(selected));
        router.push('/'); // поменяй на ваш роут ленты
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Выберите, что вас интересует</h1>

                <div className={styles.tagsGrid}>
                    {Array.from({ length: 15 }).map((_, i) => {
                        const tag = TAGS[i % TAGS.length];
                        const active = selected.includes(tag);
                        return (
                            <button
                                key={`${tag}-${i}`}
                                type="button"
                                className={`${styles.tag} ${active ? styles.tagActive : ''}`}
                                onClick={() => toggle(tag)}
                            >
                                {tag}
                            </button>
                        );
                    })}
                </div>

                <button className={styles.button} onClick={onGoArticles} disabled={!canGo}>
                    К статьям
                </button>
            </div>
        </div>
    );
}
