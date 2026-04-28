import { useCallback, useEffect, useState } from 'react'
import * as serverApi from '../lib/server-api'
import type { Account, AccountStatus, AccountType } from '../lib/server-api'

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [addTokenText, setAddTokenText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadAccounts = useCallback(async () => {
    try {
      const data = await serverApi.fetchAccounts()
      setAccounts(data.items)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '加载账号失败' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAccounts() }, [loadAccounts])

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const handleAdd = async () => {
    const tokens = addTokenText.split('\n').map(t => t.trim()).filter(Boolean)
    if (!tokens.length) return
    setActionLoading(true)
    try {
      const result = await serverApi.createAccounts(tokens)
      setAccounts(result.items)
      setAddTokenText('')
      const parts: string[] = []
      if (result.added) parts.push(`添加 ${result.added} 个`)
      if (result.skipped) parts.push(`跳过 ${result.skipped} 个`)
      if (result.refreshed) parts.push(`刷新 ${result.refreshed} 个`)
      if (result.errors?.length) parts.push(`${result.errors.length} 个失败`)
      showMessage('success', parts.join('，') || '操作完成')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '添加失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (account: Account) => {
    if (!confirm(`确定删除 ${account.email || account.access_token.slice(0, 8)}...？`)) return
    setActionLoading(true)
    try {
      const result = await serverApi.deleteAccounts([account.access_token])
      setAccounts(result.items)
      showMessage('success', '已删除')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '删除失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefresh = async (account?: Account) => {
    setActionLoading(true)
    try {
      const tokens = account ? [account.access_token] : accounts.map(a => a.access_token)
      const result = await serverApi.refreshAccounts(tokens)
      setAccounts(result.items)
      showMessage('success', `已刷新 ${result.refreshed} 个账号`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '刷新失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async (account: Account) => {
    const newStatus: AccountStatus = account.status === '禁用' ? '正常' : '禁用'
    setActionLoading(true)
    try {
      const result = await serverApi.updateAccount(account.access_token, { status: newStatus })
      setAccounts(result.items)
      showMessage('success', `已${newStatus === '禁用' ? '禁用' : '启用'}账号`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '更新失败')
    } finally {
      setActionLoading(false)
    }
  }

  const statusColor: Record<AccountStatus, string> = {
    '正常': 'bg-green-50 text-green-700 border-green-200',
    '限流': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    '异常': 'bg-red-50 text-red-700 border-red-200',
    '禁用': 'bg-stone-100 text-stone-500 border-stone-200',
  }

  const typeColor: Record<AccountType, string> = {
    'Free': 'bg-stone-100 text-stone-600',
    'Plus': 'bg-blue-50 text-blue-700',
    'ProLite': 'bg-purple-50 text-purple-700',
    'Pro': 'bg-indigo-50 text-indigo-700',
    'Team': 'bg-teal-50 text-teal-700',
  }

  const availableQuota = accounts.filter(a => a.status !== '禁用').reduce((sum, a) => sum + Math.max(0, a.quota), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {message && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="总账号" value={accounts.length} />
        <StatCard label="可用额度" value={availableQuota} />
        <StatCard label="正常" value={accounts.filter(a => a.status === '正常').length} />
        <StatCard label="限流/异常" value={accounts.filter(a => a.status === '限流' || a.status === '异常').length} />
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-stone-700">添加账号</h3>
        <textarea
          value={addTokenText}
          onChange={(e) => setAddTokenText(e.target.value)}
          placeholder="每行一个 access token"
          rows={3}
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-0 resize-none"
        />
        <div className="flex gap-2">
          <button onClick={() => void handleAdd()} disabled={!addTokenText.trim() || actionLoading}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:bg-stone-300">
            添加
          </button>
          <button onClick={() => void handleRefresh()} disabled={actionLoading}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
            刷新全部
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-stone-400">加载中...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-400">暂无账号</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-900 truncate">
                      {account.email || account.access_token.slice(0, 12) + '...'}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${typeColor[account.type] || 'bg-stone-100 text-stone-600'}`}>
                      {account.type}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${statusColor[account.status]}`}>
                      {account.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-stone-400">
                    <span>额度: {account.quota}</span>
                    <span>成功: {account.success}</span>
                    <span>失败: {account.fail}</span>
                    {account.lastUsedAt && <span>最近: {new Date(account.lastUsedAt).toLocaleString('zh-CN')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => void handleRefresh(account)} disabled={actionLoading}
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50">
                    刷新
                  </button>
                  <button onClick={() => void handleToggleStatus(account)} disabled={actionLoading}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      account.status === '禁用'
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}>
                    {account.status === '禁用' ? '启用' : '禁用'}
                  </button>
                  <button onClick={() => void handleDelete(account)} disabled={actionLoading}
                    className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50">
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="text-xs font-medium text-stone-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-stone-900">{value}</div>
    </div>
  )
}
