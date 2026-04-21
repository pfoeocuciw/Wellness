"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./verify.module.css";

const CODE_LENGTH = 6;

function onlyDigits(value: string) {
    return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export default function VerifyCodePage() {
    const router = useRouter();
    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(60);

    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";

    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

    const joinedCode = useMemo(() => code.join(""), [code]);
    const canSubmit = joinedCode.length === CODE_LENGTH && !isLoading;
    const canResend = secondsLeft === 0 && !isResending;

    useEffect(() => {
        if (secondsLeft === 0) return;
        const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft]);

    const focusInput = (index: number) => {
        inputsRef.current[index]?.focus();
        inputsRef.current[index]?.select();
    };

    const handleChange = (index: number, value: string) => {
        const clean = onlyDigits(value);

        if (!clean) {
            const next = [...code];
            next[index] = "";
            setCode(next);
            return;
        }

        const next = [...code];

        if (clean.length === 1) {
            next[index] = clean;
            setCode(next);
            if (index < CODE_LENGTH - 1) focusInput(index + 1);
            return;
        }

        for (let i = 0; i < CODE_LENGTH; i++) {
            next[i] = clean[i] ?? "";
        }
        setCode(next);

        const nextIndex = Math.min(clean.length, CODE_LENGTH - 1);
        focusInput(nextIndex);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            if (code[index]) {
                const next = [...code];
                next[index] = "";
                setCode(next);
                return;
            }

            if (index > 0) {
                const next = [...code];
                next[index - 1] = "";
                setCode(next);
                focusInput(index - 1);
            }
        }

        if (e.key === "ArrowLeft" && index > 0) {
            focusInput(index - 1);
        }

        if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
            focusInput(index + 1);
        }

        if (e.key === "Enter" && canSubmit) {
            void handleSubmit();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const pasted = onlyDigits(e.clipboardData.getData("text"));
        if (!pasted) return;

        const next = Array(CODE_LENGTH).fill("");
        for (let i = 0; i < CODE_LENGTH; i++) {
            next[i] = pasted[i] ?? "";
        }
        setCode(next);

        const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
        focusInput(nextIndex);
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            // сюда потом подставишь свой реальный эндпоинт
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    code: joinedCode,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Неверный код");
            }

// ❗ СОХРАНЯЕМ ТОКЕН
            if (data.token) {
                localStorage.setItem("token", data.token);
            }

// ❗ СОХРАНЯЕМ ПОЛЬЗОВАТЕЛЯ (не обязательно, но лучше)
            if (data.user) {
                localStorage.setItem("profile", JSON.stringify(data.user));
            }

            setSuccess("Профиль успешно подтвержден");

            setTimeout(() => {
                router.push("/register/role");
            }, 700);
        } catch {
            setError("Неверный или просроченный код");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setIsResending(true);
        setError("");
        setSuccess("");

        try {
            // сюда потом подставишь свой реальный эндпоинт
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/auth/resend-verification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                throw new Error("Не удалось отправить код");
            }

            setSecondsLeft(60);
            setSuccess("Новый код отправлен на почту");
        } catch {
            setError("Не удалось повторно отправить код");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <p className={styles.kicker}>ПОДТВЕРЖДЕНИЕ ПРОФИЛЯ</p>

                <h1 className={styles.title}>Введите код</h1>

                <p className={styles.subtitle}>
                    Мы отправили код подтверждения
                    <br />
                    на вашу электронную почту
                </p>

                <div className={styles.codeRow} onPaste={handlePaste}>
                    {code.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => {
                                inputsRef.current[index] = el;
                            }}
                            className={styles.codeInput}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={CODE_LENGTH}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            aria-label={`Цифра ${index + 1}`}
                        />
                    ))}
                </div>

                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}

                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit}
                >
                    {isLoading ? "Проверяем..." : "Подтвердить"}
                </button>

                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void handleResend()}
                    disabled={!canResend}
                >
                    {isResending
                        ? "Отправляем..."
                        : canResend
                            ? "Отправить код заново"
                            : `Отправить код повторно через ${secondsLeft} c`}
                </button>

                <Link href="/register" className={styles.backLink}>
                    Назад
                </Link>
            </div>
        </div>
    );
}