import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

const SUPABASE_URL = "https://qdkjqefzzjdkspatdzcn.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFka2pxZWZ6empka3NwYXRkemNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MTUsImV4cCI6MjA3NTk2MTYxNX0.nmxtS1JezbQ5MMdg6Kw2ZIR5dkS7oAjSK41FQhaYJls"

export function getSupabaseBrowserClient() {
  if (client) {
    return client
  }

  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  return client
}
