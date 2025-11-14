/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly VITE_SUPABASE_URL?: string
    readonly VITE_SUPABASE_ANON_KEY?: string
    readonly VITE_SUPABASE_KEY?: string
    readonly VITE_CONECTABOT_KB_TABLE?: string
  }
}

declare interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_KEY?: string
  readonly VITE_CONECTABOT_KB_TABLE?: string
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv
}
