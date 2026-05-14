import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

export function createClient() {
  // 環境変数が未定義の場合でもビルドを落とさないためのガード
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
