'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './register.module.css';

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [pass1, setPass1] = useState('');
    const [pass2, setPass2] = useState('');

    const [toast, setToast] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [restoreAvailable, setRestoreAvailable] = useState(false);

    const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

    const showToast = (msg: string) => {
        setToast(msg);
        window.clearTimeout((showToast as unknown as { _t?: number })._t);
        (showToast as unknown as { _t?: number })._t = window.setTimeout(() => setToast(null), 2500);
    };

    const handleRestoreAccount = async () => {
        if (loading) return;

        if (!normalizedEmail) return showToast('Введите e-mail');
        if (!firstName.trim()) return showToast('Введите имя');
        if (!lastName.trim()) return showToast('Введите фамилию');
        if (!pass1) return showToast('Введите пароль');
        if (pass1.length < 6) return showToast('Пароль минимум 6 символов');
        if (pass1 !== pass2) return showToast('Пароли не совпадают');

        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/restore-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password: pass1,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                }),
            });

            const data = await res.json();

            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            if (!res.ok) {
                showToast(data.message || 'Не удалось восстановить аккаунт');
                return;
            }

            setRestoreAvailable(false);
            router.push(`/register/verify?email=${encodeURIComponent(normalizedEmail)}`);
        } catch {
            showToast('Не удалось восстановить аккаунт');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (!normalizedEmail) return showToast('Введите e-mail');
        if (!firstName.trim()) return showToast('Введите имя');
        if (!lastName.trim()) return showToast('Введите фамилию');
        if (!pass1) return showToast('Введите пароль');
        if (pass1.length < 6) return showToast('Пароль минимум 6 символов');
        if (pass1 !== pass2) return showToast('Пароли не совпадают');

        setRestoreAvailable(false);
        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password: pass1,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                }),
            });

            const data = await res.json();

            if (res.status === 409 && data.restoreAvailable) {
                setRestoreAvailable(true);
                showToast(data.message || 'Аккаунт можно восстановить');
                return;
            }

            if (!res.ok) {
                setRestoreAvailable(false);
                showToast(data.message || 'Ошибка регистрации');
                return;
            }

            router.push(`/register/verify?email=${encodeURIComponent(normalizedEmail)}`);
        } catch {
            showToast('Не удалось связаться с сервером');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Регистрация</h1>

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
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder=" "
                            autoComplete="given-name"
                        />
                        <label className={styles.label}>Имя</label>
                    </div>

                    <div className={styles.field}>
                        <input
                            className={styles.input}
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder=" "
                            autoComplete="family-name"
                        />
                        <label className={styles.label}>Фамилия</label>
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

                    {restoreAvailable && (
                        <button
                            className={styles.button}
                            type="button"
                            onClick={handleRestoreAccount}
                            disabled={loading}
                        >
                            {loading ? '...' : 'Восстановить аккаунт'}
                        </button>
                    )}

                    <Link className={styles.link} href="/login">
                        Уже есть аккаунт
                    </Link>
                </form>
            </div>
        </div>
    );
}