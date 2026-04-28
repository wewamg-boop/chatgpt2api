const AUTH_KEY_STORAGE_KEY = 'chatgpt2api:auth_key'

export function getAuthKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(AUTH_KEY_STORAGE_KEY) || ''
}

export function setAuthKey(key: string): void {
  if (typeof window === 'undefined') return
  if (key) {
    localStorage.setItem(AUTH_KEY_STORAGE_KEY, key)
  } else {
    localStorage.removeItem(AUTH_KEY_STORAGE_KEY)
  }
}

export function isLoggedIn(): boolean {
  return !!getAuthKey()
}

function createHeaders(): Record<string, string> {
  const key = getAuthKey()
  return {
    'Content-Type': 'application/json',
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...createHeaders(),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    setAuthKey('')
    throw new Error('认证失败，请重新登录')
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const errJson = await response.json()
      if (errJson.error) {
        if (typeof errJson.error === 'string') errorMsg = errJson.error
        else if (errJson.error.message) errorMsg = errJson.error.message
      }
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  return response.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────

export async function login(authKey: string): Promise<{ ok: boolean; version: string }> {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authKey}`, 'Content-Type': 'application/json' },
    body: '{}',
  })

  if (!response.ok) {
    throw new Error('认证密钥无效')
  }

  const result = await response.json()
  setAuthKey(authKey)
  return result
}

// ── Version ───────────────────────────────────────────────────────

export async function getVersion(): Promise<{ version: string }> {
  return request('/version')
}

// ── Accounts ──────────────────────────────────────────────────────

export type AccountType = 'Free' | 'Plus' | 'ProLite' | 'Pro' | 'Team'
export type AccountStatus = '正常' | '限流' | '异常' | '禁用'

export interface Account {
  id: string
  access_token: string
  type: AccountType
  status: AccountStatus
  quota: number
  imageQuotaUnknown?: boolean
  email?: string | null
  user_id?: string | null
  limits_progress?: Array<{
    feature_name?: string
    remaining?: number
    reset_after?: string
  }>
  default_model_slug?: string | null
  restoreAt?: string | null
  success: number
  fail: number
  lastUsedAt: string | null
}

export async function fetchAccounts(): Promise<{ items: Account[] }> {
  return request('/api/accounts')
}

export async function createAccounts(tokens: string[]): Promise<{
  items: Account[]
  added?: number
  skipped?: number
  refreshed?: number
  errors?: Array<{ access_token: string; error: string }>
}> {
  return request('/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ tokens }),
  })
}

export async function deleteAccounts(tokens: string[]): Promise<{
  items: Account[]
  removed?: number
}> {
  return request('/api/accounts', {
    method: 'DELETE',
    body: JSON.stringify({ tokens }),
  })
}

export async function refreshAccounts(accessTokens: string[]): Promise<{
  items: Account[]
  refreshed: number
  errors: Array<{ access_token: string; error: string }>
}> {
  return request('/api/accounts/refresh', {
    method: 'POST',
    body: JSON.stringify({ access_tokens: accessTokens }),
  })
}

export async function updateAccount(
  accessToken: string,
  updates: { type?: AccountType; status?: AccountStatus; quota?: number },
): Promise<{ item: Account; items: Account[] }> {
  return request('/api/accounts/update', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken, ...updates }),
  })
}

// ── Settings ──────────────────────────────────────────────────────

export interface ServerConfig {
  proxy: string
  base_url?: string
  'auth-key'?: string
  refresh_account_interval_minute?: number | string
  [key: string]: unknown
}

export async function fetchServerSettings(): Promise<{ config: ServerConfig }> {
  return request('/api/settings')
}

export async function updateServerSettings(config: ServerConfig): Promise<{ config: ServerConfig }> {
  return request('/api/settings', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

// ── Proxy ─────────────────────────────────────────────────────────

export interface ProxyTestResult {
  ok: boolean
  status: number
  latency_ms: number
  error: string | null
}

export async function testProxy(url?: string): Promise<{ result: ProxyTestResult }> {
  return request('/api/proxy/test', {
    method: 'POST',
    body: JSON.stringify({ url: url ?? '' }),
  })
}
