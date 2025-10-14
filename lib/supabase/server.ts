import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const SUPABASE_URL = "https://qdkjqefzzjdkspatdzcn.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFka2pxZWZ6empka3NwYXRkemNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MTUsImV4cCI6MjA3NTk2MTYxNX0.nmxtS1JezbQ5MMdg6Kw2ZIR5dkS7oAjSK41FQhaYJls"

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
