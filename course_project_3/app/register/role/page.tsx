'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './role.module.css';

type Role = 'user' | 'expert';

export default function RolePage() {
    const router = useRouter();
    const [hoverExpert, setHoverExpert] = useState(false);

    const chooseRole = (role: 'user' | 'expert') => {
        // можно сохранить роль (пока без бэка)
        sessionStorage.setItem('role', role);

        if (role === 'expert') {
            router.push('/register/expert');
        } else {
            router.push('/register/tags');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Вы —</h1>

                <div className={styles.roles}>
                    <button className={styles.roleBtnUser} onClick={() => chooseRole('user')}>
                        Пользователь
                    </button>

                    <div
                        className={styles.expertWrap}
                        onMouseEnter={() => setHoverExpert(true)}
                        onMouseLeave={() => setHoverExpert(false)}
                    >
                        <button className={styles.roleBtnExpert} onClick={() => chooseRole('expert')}>
                            Эксперт
                        </button>

                        {hoverExpert && (
                            <div className={styles.tooltip} role="tooltip">
                                Нужно будет подтвердить свою экспертность
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
