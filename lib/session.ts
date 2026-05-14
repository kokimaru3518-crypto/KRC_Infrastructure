export type Session = {
    user_id: string;   // UUID
    user_name: string; // 表示用・admin判定用
};

/**
 * /api/auth/me を呼び出してセッション情報を取得する（クライアント用）
 */
export async function getSession(): Promise<Session | null> {
    try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) return null;
        return res.json() as Promise<Session>;
    } catch {
        return null;
    }
}
