import { useEffect, useState } from 'react'
import { RefreshCw, Download, Trash2, Play } from 'lucide-react'
import { toast } from 'sonner'
import {
  testBackupConnection,
  fetchBackups,
  runBackupNow,
  deleteBackup,
  fetchBackupDetail,
  getBackupDownloadUrl,
  type BackupItem,
  type BackupDetail,
  type BackupSettings,
  type BackupState,
} from '../../lib/server-api'

export function BackupSettingsCard() {
  const [items, setItems] = useState<BackupItem[]>([])
  const [state, setState] = useState<BackupState | null>(null)
  const [settings, setSettings] = useState<BackupSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [detailItem, setDetailItem] = useState<BackupDetail | null>(null)

  const loadBackups = async () => {
    setIsLoading(true)
    try {
      const data = await fetchBackups()
      setItems(data.items)
      setState(data.state)
      setSettings(data.settings)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载备份失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await testBackupConnection()
      if (result.result.ok) {
        toast.success('连接测试成功')
      } else {
        toast.error(`连接测试失败: HTTP ${result.result.status}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '测试连接失败')
    } finally {
      setIsTesting(false)
    }
  }

  const handleRunNow = async () => {
    setIsRunning(true)
    try {
      const result = await runBackupNow()
      toast.success(`备份已创建 (${(result.result.size / 1024).toFixed(1)} KB)`)
      await loadBackups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '手动备份失败')
    } finally {
      setIsRunning(false)
    }
  }

  const handleDelete = async (key: string) => {
    try {
      await deleteBackup(key)
      toast.success('备份已删除')
      await loadBackups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除备份失败')
    }
  }

  const handleShowDetail = async (key: string) => {
    try {
      const data = await fetchBackupDetail(key)
      setDetailItem(data.item)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载详情失败')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">备份管理</h2>
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={isTesting || !settings?.enabled}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            测试连接
          </button>
          <button
            onClick={handleRunNow}
            disabled={isRunning || !settings?.enabled}
            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4 inline mr-1" />
            立即备份
          </button>
          <button
            onClick={loadBackups}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* State */}
      {state && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">状态</span>
            <span className={state.running ? 'text-yellow-600' : 'text-gray-700 dark:text-gray-300'}>
              {state.running ? '备份中...' : '空闲'}
            </span>
          </div>
          {state.last_finished_at && (
            <div className="flex justify-between">
              <span className="text-gray-500">上次备份</span>
              <span className="text-gray-700 dark:text-gray-300">{new Date(state.last_finished_at).toLocaleString()}</span>
            </div>
          )}
          {state.last_status && (
            <div className="flex justify-between">
              <span className="text-gray-500">上次结果</span>
              <span className={state.last_status === 'success' ? 'text-green-600' : 'text-red-600'}>
                {state.last_status === 'success' ? '成功' : '失败'}
              </span>
            </div>
          )}
          {!settings?.enabled && (
            <p className="text-xs text-yellow-600">备份功能未启用，请先在配置中启用并填写 Cloudflare R2 设置</p>
          )}
        </div>
      )}

      {/* Backup list */}
      {isLoading ? (
        <p className="text-center text-gray-400 py-4">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-4">暂无备份</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>{formatSize(item.size)}</span>
                  {item.updated_at && <span>{new Date(item.updated_at).toLocaleString()}</span>}
                  {item.encrypted && <span className="text-blue-500">已加密</span>}
                </div>
              </div>
              <a
                href={getBackupDownloadUrl(item.key)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-500"
                title="下载"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => handleShowDetail(item.key)}
                className="px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                详情
              </button>
              <button
                onClick={() => handleDelete(item.key)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold">备份详情</h2>
              <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">名称:</span> {detailItem.name}</div>
                <div><span className="text-gray-500">加密:</span> {detailItem.encrypted ? '是' : '否'}</div>
                {detailItem.created_at && <div><span className="text-gray-500">创建时间:</span> {new Date(detailItem.created_at).toLocaleString()}</div>}
                {detailItem.trigger && <div><span className="text-gray-500">触发方式:</span> {detailItem.trigger}</div>}
                {detailItem.app_version && <div><span className="text-gray-500">版本:</span> {detailItem.app_version}</div>}
              </div>
              {detailItem.files.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">文件列表</h3>
                  <div className="space-y-1">
                    {detailItem.files.map((file) => (
                      <div key={file.name} className="flex justify-between text-xs">
                        <span className={file.exists ? '' : 'text-gray-400 line-through'}>{file.name}</span>
                        <span className="text-gray-400">{file.exists ? formatSize(file.size) : '缺失'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
