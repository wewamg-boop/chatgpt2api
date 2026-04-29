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

// ── Settings Config (legacy name) ─────────────────────────────────

export interface SettingsConfig {
  'auth-key'?: string
  refresh_account_interval_minute?: number | string
  proxy?: string
  base_url?: string
  [key: string]: unknown
}

export async function fetchSettingsConfig(): Promise<{ config: SettingsConfig }> {
  return request('/api/settings')
}

export async function updateSettingsConfig(config: SettingsConfig): Promise<{ config: SettingsConfig }> {
  return request('/api/settings', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

// ── CPA Pools ─────────────────────────────────────────────────────

export type CPAImportJob = {
  job_id?: string
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed'
  total: number
  completed: number
  failed: number
  added?: number
  skipped?: number
  refreshed?: number
  message: string
  created_at?: string
  updated_at: string
}

export type CPAPool = {
  id: string
  name: string
  base_url: string
  secret_key?: string
  import_job?: CPAImportJob | null
}

export type CPARemoteFile = {
  name: string
  email: string
}

export async function fetchCPAPools(): Promise<{ pools: CPAPool[] }> {
  return request('/api/cpa/pools')
}

export async function createCPAPool(pool: { name: string; base_url: string; secret_key: string }): Promise<{ pools: CPAPool[] }> {
  return request('/api/cpa/pools', {
    method: 'POST',
    body: JSON.stringify(pool),
  })
}

export async function updateCPAPool(poolId: string, updates: { name?: string; base_url?: string; secret_key?: string }): Promise<{ pools: CPAPool[] }> {
  return request(`/api/cpa/pools/${poolId}`, {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}

export async function deleteCPAPool(poolId: string): Promise<{ pools: CPAPool[] }> {
  return request(`/api/cpa/pools/${poolId}`, {
    method: 'DELETE',
  })
}

export async function fetchCPAPoolFiles(poolId: string): Promise<{ pool_id: string; files: CPARemoteFile[] }> {
  return request(`/api/cpa/pools/${poolId}/files`)
}

export async function startCPAImport(poolId: string, names: string[]): Promise<{ import_job: CPAImportJob | null }> {
  return request(`/api/cpa/pools/${poolId}/import`, {
    method: 'POST',
    body: JSON.stringify({ names }),
  })
}

// ── Sub2API ───────────────────────────────────────────────────────

export type Sub2APIServer = {
  id: string
  name: string
  base_url: string
  email: string
  has_api_key: boolean
  group_id: string
  import_job?: CPAImportJob | null
}

export type Sub2APIRemoteAccount = {
  id: string
  name: string
  email: string
  plan_type: string
  status: string
  expires_at: string
  has_refresh_token: boolean
}

export type Sub2APIRemoteGroup = {
  id: string
  name: string
  description: string
  platform: string
  status: string
  account_count: number
  active_account_count: number
}

export async function fetchSub2APIServers(): Promise<{ servers: Sub2APIServer[] }> {
  return request('/api/sub2api/servers')
}

export async function createSub2APIServer(server: {
  name: string
  base_url: string
  email: string
  password: string
  api_key: string
  group_id: string
}): Promise<{ server: Sub2APIServer; servers: Sub2APIServer[] }> {
  return request('/api/sub2api/servers', {
    method: 'POST',
    body: JSON.stringify(server),
  })
}

export async function updateSub2APIServer(
  serverId: string,
  updates: {
    name?: string
    base_url?: string
    email?: string
    password?: string
    api_key?: string
    group_id?: string
  },
): Promise<{ server: Sub2APIServer; servers: Sub2APIServer[] }> {
  return request(`/api/sub2api/servers/${serverId}`, {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}

export async function fetchSub2APIServerGroups(serverId: string): Promise<{ server_id: string; groups: Sub2APIRemoteGroup[] }> {
  return request(`/api/sub2api/servers/${serverId}/groups`)
}

export async function deleteSub2APIServer(serverId: string): Promise<{ servers: Sub2APIServer[] }> {
  return request(`/api/sub2api/servers/${serverId}`, {
    method: 'DELETE',
  })
}

export async function fetchSub2APIServerAccounts(serverId: string): Promise<{ server_id: string; accounts: Sub2APIRemoteAccount[] }> {
  return request(`/api/sub2api/servers/${serverId}/accounts`)
}

export async function startSub2APIImport(serverId: string, accountIds: string[]): Promise<{ import_job: CPAImportJob | null }> {
  return request(`/api/sub2api/servers/${serverId}/import`, {
    method: 'POST',
    body: JSON.stringify({ account_ids: accountIds }),
  })
}

export async function fetchSub2APIImportJob(serverId: string): Promise<{ import_job: CPAImportJob | null }> {
  return request(`/api/sub2api/servers/${serverId}/import`)
}

// ── Proxy Settings ────────────────────────────────────────────────

export type ProxySettings = {
  enabled: boolean
  url: string
}

export async function fetchProxy(): Promise<{ proxy: ProxySettings }> {
  return request('/api/proxy')
}

export async function updateProxy(updates: { enabled?: boolean; url?: string }): Promise<{ proxy: ProxySettings }> {
  return request('/api/proxy', {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}
