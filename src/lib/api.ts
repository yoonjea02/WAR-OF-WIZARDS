import type { Api } from './types'
import { createMockApi } from './mockApi'
import { createServerApi } from './serverApi'
import { createSupabaseApi } from './supabaseApi'

// 백엔드 선택 (우선순위)
//  1) VITE_API_BASE 가 정의되어 있으면 → Python 서버(Backend/wow_server.py).
//     빈 값("")이면 같은 주소(/api) — 개발 중에는 Vite 프록시(API_TARGET, 기본 http://localhost:8080)가 서버로 전달한다.
//  2) VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY → Supabase (보류)
//  3) 아무것도 없으면 → Mock(localStorage)
const apiBase = import.meta.env.VITE_API_BASE as string | undefined
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const api: Api = apiBase !== undefined
  ? createServerApi(apiBase)
  : url && key ? createSupabaseApi(url, key) : createMockApi()
