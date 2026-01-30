'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './register.module.css';

const MOCK_EXISTING_EMAILS = ['oreshki.big.bob@gmail.com', 'test@mail.com'];

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [pass1, setPass1] = useState('');
    const [pass2, setPass2] = useState('');

    const [toast, setToast] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

    const showToast = (msg: string) => {
        setToast(msg);
        window.clearTimeout((showToast as any)._t);
        (showToast as any)._t = window.setTimeout(() => setToast(null), 2500);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (!normalizedEmail) return showToast('Введите e-mail');
        if (!pass1) return showToast('Введите пароль');
        if (pass1.length < 6) return showToast('Пароль минимум 6 символов');
        if (pass1 !== pass2) return showToast('Пароли не совпадают');

        setLoading(true);

        // имитация запроса
        await new Promise((r) => setTimeout(r, 250));
        const exists = MOCK_EXISTING_EMAILS.includes(normalizedEmail);

        if (exists) {
            setLoading(false);
            showToast('Аккаунт с такой почтой уже есть');
            return;
        }

        setLoading(false);
        router.push('/register/role');
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Регистрация</h1>

                {/* toast как на макете */}
                {toast && (
                    <div className={styles.toastWrap} aria-live="polite">
                        <div className={styles.toast}>{toast}</div>
                    </div>
                )}

                <form className={styles.form} onSubmit={onSubmit}>
                    <div className={styles.field}>
                        <input
                            className={styles.input}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder=" "
                            autoComplete="email"
                        />
                        <label className={styles.label}>E-mail</label>
                    </div>

                    <div className={styles.field}>
                        <input
                            className={styles.input}
                            type="password"
                            value={pass1}
                            onChange={(e) => setPass1(e.target.value)}
                            placeholder=" "
                            autoComplete="new-password"
                        />
                        <label className={styles.label}>Пароль</label>
                    </div>

                    <div className={styles.field}>
                        <input
                            className={styles.input}
                            type="password"
                            value={pass2}
                            onChange={(e) => setPass2(e.target.value)}
                            placeholder=" "
                            autoComplete="new-password"
                        />
                        <label className={styles.label}>Повторите пароль</label>
                    </div>

                    <button className={styles.button} type="submit" disabled={loading}>
                        {loading ? '...' : 'Зарегистрироваться'}
                    </button>

                    <Link className={styles.link} href="/login">
                        Уже есть аккаунт
                    </Link>
                </form>
            </div>
        </div>
    );
}
