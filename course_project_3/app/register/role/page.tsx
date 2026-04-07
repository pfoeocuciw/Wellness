'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './role.module.css';

type Role = 'user' | 'expert';

export default function RolePage() {
    const router = useRouter();
    const [hoverExpert, setHoverExpert] = useState(false);

    const chooseRole = async (role: 'user' | 'expert') => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                router.push('/login');
                return;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ role }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error(data.message || 'Не удалось сохранить роль');
                return;
            }

            if (role === 'expert') {
                router.push('/register/expert');
            } else {
                router.push('/register/tags');
            }
        } catch (error) {
            console.error('Ошибка при сохранении роли', error);
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
