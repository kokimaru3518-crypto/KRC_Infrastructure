import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../../supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    const { user_name, password } = await req.json();

    if (!user_name || !password) {
        return NextResponse.json({ error: 'ユーザーIDとパスワードを入力してください' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_name', user_name)
        .eq('password', password)
        .single();

    if (error || !data) {
        return NextResponse.json(
            { error: 'ユーザーIDまたはパスワードが間違っています。' },
            { status: 401 }
        );
    }

    // HttpOnly Cookie にセッション情報（UUID + user_name）をセット
    const cookieStore = await cookies();
    cookieStore.set('krc_session', JSON.stringify({ user_id: data.user_id, user_name: data.user_name }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7日間
        path: '/',
    });

    return NextResponse.json({ success: true });
}
//baka