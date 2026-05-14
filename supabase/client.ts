import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

export function createClient() {
  // ビルド時のバリデーションを通過させるため、未定義時は形式的に有効なダミーURLを使用する
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
