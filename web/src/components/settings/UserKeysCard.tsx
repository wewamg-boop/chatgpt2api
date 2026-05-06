import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy, Eye, EyeOff, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchUserKeys,
  createUserKey,
  updateUserKey,
  deleteUserKey,
  type UserKey,
} from '../../lib/server-api'

export function UserKeysCard() {
  const [keys, setKeys] = useState<UserKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [createdKey, setCreatedKey] = useState<{ id: string; key: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const loadKeys = async () => {
    setIsLoading(true)
    try {
      const data = await fetchUserKeys()
      setKeys(data.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载密钥失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('请输入密钥名称')
      return
    }
    setIsCreating(true)
    try {
      const data = await createUserKey(newKeyName.trim())
      setKeys(data.items)
      setCreatedKey({ id: data.item.id, key: data.key })
      setNewKeyName('')
      toast.success('密钥已创建，请立即复制（仅显示一次）')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建密钥失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleEnabled = async (keyId: string, enabled: boolean) => {
    try {
      const data = await updateUserKey(keyId, { enabled: !enabled })
      setKeys(data.items)
      toast.success(enabled ? '密钥已禁用' : '密钥已启用')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const handleDelete = async (keyId: string) => {
    try {
      const data = await deleteUserKey(keyId)
      setKeys(data.items)
      toast.success('密钥已删除')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const handleRename = async (keyId: string) => {
    if (!editName.trim()) return
    try {
      const data = await updateUserKey(keyId, { name: editName.trim() })
      setKeys(data.items)
      setEditingId(null)
      toast.success('名称已更新')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重命名失败')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('已复制到剪贴板')
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-bold mb-4">用户密钥管理</h2>

      {/* Create new key */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="输入密钥名称"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          创建
        </button>
      </div>

      {/* Created key dialog */}
      {createdKey && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">新密钥已创建（仅显示一次）</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs font-mono break-all">
              {revealedKeys.has(createdKey.id) ? createdKey.key : '••••••••••••••••'}
            </code>
            <button onClick={() => setRevealedKeys((prev) => { const next = new Set(prev); next.add(createdKey.id); return next })} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-800/50">
              <Eye className="w-4 h-4 text-green-600" />
            </button>
            <button onClick={() => copyToClipboard(createdKey.key)} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-800/50">
              <Copy className="w-4 h-4 text-green-600" />
            </button>
            <button onClick={() => setCreatedKey(null)} className="text-xs text-green-600 hover:text-green-700">&times; 关闭</button>
          </div>
        </div>
      )}

      {/* Key list */}
      {isLoading ? (
        <p className="text-center text-gray-400 py-4">加载中...</p>
      ) : keys.length === 0 ? (
        <p className="text-center text-gray-400 py-4">暂无用户密钥</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="flex-1 min-w-0">
                {editingId === key.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(key.id)}
                      autoFocus
                    />
                    <button onClick={() => handleRename(key.id)} className="text-xs text-blue-500">保存</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">取消</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{key.name}</span>
                    <button onClick={() => { setEditingId(key.id); setEditName(key.name) }} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Edit3 className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>ID: {key.id.slice(0, 8)}...</span>
                  {key.created_at && <span>创建: {new Date(key.created_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <button
                onClick={() => handleToggleEnabled(key.id, key.enabled)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  key.enabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {key.enabled ? '启用' : '禁用'}
              </button>
              <button
                onClick={() => handleDelete(key.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
