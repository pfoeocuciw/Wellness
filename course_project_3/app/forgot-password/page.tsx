'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './forgot-password.module.css';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState<1 | 2>(1);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    const sendCode = async () => {
        setError(null);
        setMessage(null);
        setLoading(true);
        try {
            const res = await fetch(`${backend}/auth/forgot-password/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Не удалось отправить код');
                return;
            }
            setMessage('Код отправлен на почту. Проверьте входящие.');
            setStep(2);
        } catch {
            setError('Не удалось связаться с сервером');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        setError(null);
        setMessage(null);
        if (newPassword !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${backend}/auth/forgot-password/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code: code.trim(),
                    newPassword,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Не удалось сменить пароль');
                return;
            }
            setMessage('Пароль изменён. Теперь можно войти.');
            setTimeout(() => router.push('/login'), 1000);
        } catch {
            setError('Не удалось связаться с сервером');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <section className={styles.content}>
                <h1 className={styles.title}>Восстановление пароля</h1>

                <div className={styles.form}>
                    <label className={styles.field}>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder=" "
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={step === 2}
                        />
                        <span className={styles.label}>E-mail</span>
                    </label>

                    {step === 2 && (
                        <>
                            <label className={styles.field}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder=" "
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                                <span className={styles.label}>Код из письма</span>
                            </label>

                            <label className={styles.field}>
                                <input
                                    type="password"
                                    className={styles.input}
                                    placeholder=" "
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <span className={styles.label}>Новый пароль</span>
                            </label>

                            <label className={styles.field}>
                                <input
                                    type="password"
                                    className={styles.input}
                                    placeholder=" "
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <span className={styles.label}>Повторите пароль</span>
                            </label>
                        </>
                    )}

                    {error && <p className={styles.error}>{error}</p>}
                    {message && <p className={styles.message}>{message}</p>}

                    {step === 1 ? (
                        <button
                            className={styles.primaryButton}
                            type="button"
                            onClick={sendCode}
                            disabled={loading || !email.trim()}
                        >
                            {loading ? 'Отправляем...' : 'Отправить код'}
                        </button>
                    ) : (
                        <button
                            className={styles.primaryButton}
                            type="button"
                            onClick={resetPassword}
                            disabled={loading || !code.trim() || !newPassword}
                        >
                            {loading ? 'Сохраняем...' : 'Сменить пароль'}
                        </button>
                    )}

                    <button className={styles.secondaryButton} type="button" onClick={() => router.push('/login')}>
                        Назад ко входу
                    </button>
                </div>
            </section>
        </main>
    );
}
