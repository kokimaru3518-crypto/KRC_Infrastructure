import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

export function createServerClient() {
    // ビルド時のバリデーションを通過させるため、未定義時は形式的に有効なダミーURLを使用する
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

    return createSupabaseClient<Database>(
        supabaseUrl,
        supabaseAnonKey
    );
}
