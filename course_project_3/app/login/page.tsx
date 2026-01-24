'use client';

import { useState } from 'react';
import styles from './login.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // задел под ошибки (позже подключишь реальный API)
    const [error, setError] = useState<string | null>(null);

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        // мок-проверка (можешь убрать/заменить)
        if (!email.trim() || !password.trim()) {
            setError('Введите e-mail и пароль');
            return;
        }

        // TODO: здесь будет запрос на сервер
        console.log('login', { email, password });
    }

    return (
        <main className={styles.container}>
            <section className={styles.content}>
                    <h1 className={styles.title}>ВХОД</h1>

                <form className={styles.form} onSubmit={onSubmit}>
                    <label className={styles.field}>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder=" "
                        />
                        <span className={styles.label}>E-mail</span>
                    </label>

                    <label className={styles.field}>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder=" "
                        />
                        <span className={styles.label}>Пароль</span>
                    </label>

                    {error && <p className={styles.error}>{error}</p>}

                    <button className={styles.button} type="submit">
                        ВОЙТИ
                    </button>
                </form>
            </section>
        </main>
    );
}
