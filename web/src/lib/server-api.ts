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

export interface LoginResponse {
  ok: boolean
  version: string
  role: AuthRole
  subject_id: string
  name: string
}

export async function login(authKey: string): Promise<LoginResponse> {
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

export type AccountType = string
export type AccountStatus = '正常' | '限流' | '异常' | '禁用'
export type ImageModel = 'gpt-image-2' | 'codex-gpt-image-2'
export type AuthRole = 'admin' | 'user'

export interface Account {
  access_token: string
  type: AccountType
  status: AccountStatus
  quota: number
  image_quota_unknown?: boolean
  email?: string | null
  user_id?: string | null
  limits_progress?: Array<{
    feature_name?: string
    remaining?: number
    reset_after?: string
  }>
  default_model_slug?: string | null
  restore_at?: string | null
  success: number
  fail: number
  last_used_at?: string | null
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
  global_system_prompt?: string
  sensitive_words?: string[]
  ai_review?: {
    enabled?: boolean
    base_url?: string
    api_key?: string
    model?: string
    prompt?: string
  }
  refresh_account_interval_minute?: number | string
  image_retention_days?: number | string
  image_poll_timeout_secs?: number | string
  image_account_concurrency?: number | string
  auto_remove_invalid_accounts?: boolean
  auto_remove_rate_limited_accounts?: boolean
  log_levels?: string[]
  backup?: BackupSettings
  backup_state?: BackupState
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
  global_system_prompt?: string
  sensitive_words?: string[]
  ai_review?: {
    enabled?: boolean
    base_url?: string
    api_key?: string
    model?: string
    prompt?: string
  }
  image_retention_days?: number | string
  image_poll_timeout_secs?: number | string
  image_account_concurrency?: number | string
  auto_remove_invalid_accounts?: boolean
  auto_remove_rate_limited_accounts?: boolean
  log_levels?: string[]
  backup?: BackupSettings
  backup_state?: BackupState
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
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  total: number
  completed: number
  added: number
  skipped: number
  refreshed: number
  failed: number
  errors: Array<{ name: string; error: string }>
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

export async function createCPAPool(pool: { name: string; base_url: string; secret_key: string }): Promise<{ pool: CPAPool; pools: CPAPool[] }> {
  return request('/api/cpa/pools', {
    method: 'POST',
    body: JSON.stringify(pool),
  })
}

export async function updateCPAPool(poolId: string, updates: { name?: string; base_url?: string; secret_key?: string }): Promise<{ pool: CPAPool; pools: CPAPool[] }> {
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

export async function fetchCPAPoolImportJob(poolId: string): Promise<{ import_job: CPAImportJob | null }> {
  return request(`/api/cpa/pools/${poolId}/import`)
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

// ── Image Tasks ──────────────────────────────────────────────────

export type ImageResponse = {
  created: number
  data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>
}

export type ImageTask = {
  id: string
  status: 'queued' | 'running' | 'success' | 'error'
  mode: 'generate' | 'edit'
  model?: ImageModel
  size?: string
  created_at: string
  updated_at: string
  data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>
  error?: string
}

type ImageTaskListResponse = {
  items: ImageTask[]
  missing_ids: string[]
}

export async function createImageGenerationTask(clientTaskId: string, prompt: string, model?: ImageModel, size?: string): Promise<ImageTask> {
  return request('/api/image-tasks/generations', {
    method: 'POST',
    body: JSON.stringify({
      client_task_id: clientTaskId,
      prompt,
      ...(model ? { model } : {}),
      ...(size ? { size } : {}),
    }),
  })
}

export async function createImageEditTask(
  clientTaskId: string,
  files: File | File[],
  prompt: string,
  model?: ImageModel,
  size?: string,
): Promise<ImageTask> {
  const formData = new FormData()
  const uploadFiles = Array.isArray(files) ? files : [files]
  uploadFiles.forEach((file) => formData.append('image', file))
  formData.append('client_task_id', clientTaskId)
  formData.append('prompt', prompt)
  if (model) formData.append('model', model)
  if (size) formData.append('size', size)
  return request('/api/image-tasks/edits', {
    method: 'POST',
    body: formData,
  })
}

export async function fetchImageTasks(ids: string[]): Promise<ImageTaskListResponse> {
  const params = new URLSearchParams()
  if (ids.length > 0) params.set('ids', ids.join(','))
  return request(`/api/image-tasks${params.toString() ? `?${params.toString()}` : ''}`)
}

// ── System Logs ───────────────────────────────────────────────────

export type SystemLog = {
  id: string
  time: string
  type: 'call' | 'account' | string
  summary?: string
  detail?: Record<string, unknown>
  [key: string]: unknown
}

export async function fetchSystemLogs(filters: { type?: string; start_date?: string; end_date?: string }): Promise<{ items: SystemLog[] }> {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date) params.set('end_date', filters.end_date)
  return request(`/api/logs${params.toString() ? `?${params.toString()}` : ''}`)
}

export async function deleteSystemLogs(ids: string[]): Promise<{ removed: number }> {
  return request('/api/logs/delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

// ── Image Manager ─────────────────────────────────────────────────

export type ManagedImage = {
  rel: string
  path?: string
  name: string
  date: string
  size: number
  url: string
  thumbnail_url?: string
  created_at: string
  width?: number
  height?: number
  tags?: string[]
}

export async function fetchManagedImages(filters: { start_date?: string; end_date?: string }): Promise<{ items: ManagedImage[]; groups: Array<{ date: string; items: ManagedImage[] }> }> {
  const params = new URLSearchParams()
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date) params.set('end_date', filters.end_date)
  return request(`/api/images${params.toString() ? `?${params.toString()}` : ''}`)
}

export async function deleteManagedImages(body: { paths?: string[]; start_date?: string; end_date?: string; all_matching?: boolean }): Promise<{ removed: number }> {
  return request('/api/images/delete', { method: 'POST', body: JSON.stringify(body) })
}

export async function fetchImageTags(): Promise<{ tags: string[] }> {
  return request('/api/images/tags')
}

export async function setImageTags(path: string, tags: string[]): Promise<{ ok: boolean; tags: string[] }> {
  return request('/api/images/tags', {
    method: 'POST',
    body: JSON.stringify({ path, tags }),
  })
}

export async function deleteImageTag(tag: string): Promise<{ ok: boolean; removed_from: number }> {
  return request(`/api/images/tags/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  })
}

// ── User Keys ─────────────────────────────────────────────────────

export type UserKey = {
  id: string
  name: string
  role: 'user'
  enabled: boolean
  created_at: string | null
  last_used_at: string | null
}

export async function fetchUserKeys(): Promise<{ items: UserKey[] }> {
  return request('/api/auth/users')
}

export async function createUserKey(name: string): Promise<{ item: UserKey; key: string; items: UserKey[] }> {
  return request('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function updateUserKey(keyId: string, updates: { enabled?: boolean; name?: string; key?: string }): Promise<{ item: UserKey; items: UserKey[] }> {
  return request(`/api/auth/users/${keyId}`, {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}

export async function deleteUserKey(keyId: string): Promise<{ items: UserKey[] }> {
  return request(`/api/auth/users/${keyId}`, {
    method: 'DELETE',
  })
}

// ── Backup ────────────────────────────────────────────────────────

export type BackupInclude = {
  config: boolean
  register: boolean
  cpa: boolean
  sub2api: boolean
  logs: boolean
  image_tasks: boolean
  accounts_snapshot: boolean
  auth_keys_snapshot: boolean
  images: boolean
}

export type BackupSettings = {
  enabled: boolean
  provider: 'cloudflare_r2' | string
  account_id: string
  access_key_id: string
  secret_access_key: string
  bucket: string
  prefix: string
  interval_minutes: number | string
  rotation_keep: number | string
  encrypt: boolean
  passphrase: string
  include: BackupInclude
}

export type BackupState = {
  running: boolean
  last_started_at?: string | null
  last_finished_at?: string | null
  last_status?: string
  last_error?: string | null
  last_object_key?: string | null
}

export type BackupItem = {
  key: string
  name: string
  size: number
  updated_at?: string | null
  encrypted: boolean
}

export type BackupDetail = {
  key: string
  name: string
  encrypted: boolean
  created_at?: string | null
  trigger?: string | null
  app_version?: string | null
  storage_backend?: Record<string, unknown> | null
  files: Array<{ name: string; exists: boolean; content_type?: string; size: number; sha256?: string }>
  snapshots: Array<{ name: string; count: number }>
}

export async function testBackupConnection(): Promise<{ result: { ok: boolean; status: number } }> {
  return request('/api/backup/test', { method: 'POST', body: '{}' })
}

export async function fetchBackups(): Promise<{ items: BackupItem[]; state: BackupState; settings: BackupSettings }> {
  return request('/api/backups')
}

export async function runBackupNow(): Promise<{ result: { key: string; size: number; encrypted: boolean } }> {
  return request('/api/backups/run', { method: 'POST', body: '{}' })
}

export async function deleteBackup(key: string): Promise<{ ok: boolean }> {
  return request('/api/backups/delete', { method: 'POST', body: JSON.stringify({ key }) })
}

export async function fetchBackupDetail(key: string): Promise<{ item: BackupDetail }> {
  const params = new URLSearchParams()
  params.set('key', key)
  return request(`/api/backups/detail?${params.toString()}`)
}

export function getBackupDownloadUrl(key: string): string {
  const params = new URLSearchParams()
  params.set('key', key)
  return `/api/backups/download?${params.toString()}`
}

// ── Register ──────────────────────────────────────────────────────

export type RegisterConfig = {
  enabled: boolean
  mail: {
    request_timeout: number
    wait_timeout: number
    wait_interval: number
    providers: Array<Record<string, unknown>>
  }
  proxy: string
  total: number
  threads: number
  mode: 'total' | 'quota' | 'available'
  target_quota: number
  target_available: number
  check_interval: number
  stats: {
    job_id?: string
    success: number
    fail: number
    done: number
    running: number
    threads: number
    elapsed_seconds?: number
    avg_seconds?: number
    success_rate?: number
    current_quota?: number
    current_available?: number
    started_at?: string
    updated_at?: string
    finished_at?: string
  }
  logs?: Array<{ time: string; text: string; level: string }>
}

export async function fetchRegisterConfig(): Promise<{ register: RegisterConfig }> {
  return request('/api/register')
}

export async function updateRegisterConfig(updates: Partial<RegisterConfig>): Promise<{ register: RegisterConfig }> {
  return request('/api/register', {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}

export async function startRegister(): Promise<{ register: RegisterConfig }> {
  return request('/api/register/start', { method: 'POST' })
}

export async function stopRegister(): Promise<{ register: RegisterConfig }> {
  return request('/api/register/stop', { method: 'POST' })
}

export async function resetRegister(): Promise<{ register: RegisterConfig }> {
  return request('/api/register/reset', { method: 'POST' })
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
