import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Keys come from .env.local (see SETUP-ONLINE.md). Without them the app runs offline-only.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { realtime: { params: { eventsPerSecond: 30 } } }) : null
export const onlineReady = !!supabase
