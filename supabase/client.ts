import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ctkjzwdoxblmlnyvswse.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SQuos4RqNQxUByd1qqPfNg_Pl0QRRmq'
  return createBrowserClient<Database>(url, anonKey)
}
