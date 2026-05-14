'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!userId || !password) {
      setError('ユーザーIDとパスワードを入力してください');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userId, password }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'エラーが発生しました');
    } else {
      router.push('/projects');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <div className={styles.logoIcon}>
          K
        </div>
        <span className={styles.logoText}>KRC Software</span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>
          {isLogin ? 'Log in to your account' : 'Sign up for your account'}
        </h1>

        {error && (
          <div className={styles.errorAlert} role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={styles.input}
              placeholder="Enter your user ID"
              required
            />
          </div>

          <div>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? '処理中...' : (isLogin ? 'Log in' : 'Sign up')}
          </button>
        </form>

        <div className={styles.switchSection}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className={styles.switchButton}
          >
            {isLogin ? "Sign up for an account" : "Log in to an existing account"}
          </button>
        </div>
      </div>
    </div>
  );
}
