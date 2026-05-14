import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../../supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    const { user_name, password } = await req.json();

    if (!user_name || !password) {
        return NextResponse.json({ error: 'ユーザーIDとパスワードを入力してください' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 既存ユーザーチェック
    const { data: existing } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_name', user_name)
        .single();

    if (existing) {
        return NextResponse.json({ error: 'このユーザーIDは既に使用されています。' }, { status: 409 });
    }

    // 新規ユーザー登録
    const newUserId = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('users').insert({ user_id: newUserId, password, user_name } as any);

    if (error) {
        return NextResponse.json({ error: '登録に失敗しました: ' + error.message }, { status: 500 });
    }

    // 登録後にそのままセッションをセット
    const cookieStore = await cookies();
    cookieStore.set('krc_session', JSON.stringify({ user_id: newUserId, user_name }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });

    return NextResponse.json({ success: true });
}
