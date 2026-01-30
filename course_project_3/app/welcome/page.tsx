'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './welcome.module.css';
import localFont from "next/font/local";

const regularfont = localFont({
    src: "../../fonts/IBMPlexSans-Regular.otf",
    weight: "200",
    style: "normal",
});

const mediumfont = localFont({
    src: "../../fonts/IBMPlexSans-Medium.otf",
});

export default function WelcomePage() {
    const [showButtons, setShowButtons] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowButtons(true), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <main className={styles.container}>
            <div className={styles.logoBlock}>
                <div className={mediumfont.className}>
                    <p className={styles.subtitle}>WELCOME TO</p>
                </div>
                <Image
                    src="/logo/wellness.svg"
                    alt="Wellness logo"
                    width={361}
                    height={103}
                    className={styles.logo}
                />
            </div>

            <div className={`${styles.buttons} ${showButtons ? styles.visible : ''}`}>
                <Link href="/login" className={styles.primary}>
                    <div className={regularfont.className}>
                        войти
                    </div>
                </Link>
                <Link href="/register" className={styles.secondary}>
                    зарегистрироваться
                </Link>
            </div>
        </main>
    );
}
