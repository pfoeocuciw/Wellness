'use client';

import { useState } from 'react';
import styles from './login.module.css';
import { useRouter } from 'next/navigation';



export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // задел под ошибки (позже подключишь реальный API)
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password.trim()) {
            setError('Введите e-mail и пароль');
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Не удалось войти');
                return;
            }

            localStorage.setItem('token', data.token);
            router.push('/feed');
        } catch {
            setError('Не удалось связаться с сервером');
        }
    }

    return (
        <main className={styles.container}>
            <section className={styles.content}>
                    <h1 className={styles.title}>Вход</h1>

                <form className={styles.form} onSubmit={onSubmit}>
                    <label className={styles.field}>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder=" "
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <span className={styles.label}>E-mail</span>
                    </label>

                    <label className={styles.field}>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder=" "
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <span className={styles.label}>Пароль</span>
                    </label>
                    <button
                        type="button"
                        className={styles.forgotButton}
                        onClick={() => router.push('/forgot-password')}
                    >
                        Забыли пароль?
                    </button>

                    {error && <p className={styles.error}>{error}</p>}

                    <button className={styles.primaryButton} type="submit">
                        Войти
                    </button>
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => router.push('/register')}
                    >
                        Зарегистрироваться
                    </button>
                </form>
            </section>
        </main>
    );
}
