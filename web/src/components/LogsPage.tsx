import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchSystemLogs,
  deleteSystemLogs,
  type SystemLog,
} from '../lib/server-api'

const LogType = {
  Call: 'call',
  Account: 'account',
} as const

const typeLabels: Record<string, string> = {
  [LogType.Call]: '调用日志',
  [LogType.Account]: '账号管理日志',
}

function getDetailText(item: SystemLog, key: string) {
  const value = item.detail?.[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '-'
}

function formatDuration(item: SystemLog) {
  const value = item.detail?.duration_ms
  return typeof value === 'number' ? `${(value / 1000).toFixed(2)} s` : '-'
}

function getStatus(item: SystemLog) {
  const status = item.detail?.status
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  return '-'
}

export default function LogsPage() {
  const [items, setItems] = useState<SystemLog[]>([])
  const [type, setType] = useState<string>(LogType.Call)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [detailLog, setDetailLog] = useState<SystemLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const isCallLog = type === LogType.Call
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const currentRows = items.slice((safePage - 1) * pageSize, safePage * pageSize)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const currentPageSelected = currentRows.length > 0 && currentRows.every((item) => selectedSet.has(item.id))
  const allSelected = items.length > 0 && items.every((item) => selectedSet.has(item.id))

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const data = await fetchSystemLogs({ type, start_date: startDate, end_date: endDate })
      setItems(data.items)
      setSelectedIds((current) => current.filter((id) => data.items.some((item) => item.id === id)))
      setPage(1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载日志失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((item) => item.id))
    }
  }

  const toggleSelectPage = () => {
    if (currentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentRows.some((r) => r.id === id)))
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...currentRows.map((r) => r.id)])])
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleDelete = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      await deleteSystemLogs(selectedIds)
      toast.success(`已删除 ${selectedIds.length} 条日志`)
      setSelectedIds([])
      await loadLogs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDetail = (item: SystemLog) => {
    setDetailLog(item)
    setDetailOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">日志管理</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 inline mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              删除 ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          >
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <button
          onClick={loadLogs}
          className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Search className="w-4 h-4 inline mr-1" />
          查询
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left w-10">
                <input
                  type="checkbox"
                  checked={currentPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !currentPageSelected && currentRows.some((r) => selectedSet.has(r.id))
                  }}
                  onChange={toggleSelectPage}
                />
              </th>
              <th className="px-3 py-2 text-left text-gray-500">时间</th>
              <th className="px-3 py-2 text-left text-gray-500">摘要</th>
              {isCallLog && (
                <>
                  <th className="px-3 py-2 text-left text-gray-500">状态</th>
                  <th className="px-3 py-2 text-left text-gray-500">耗时</th>
                </>
              )}
              <th className="px-3 py-2 text-left text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={isCallLog ? 6 : 4} className="px-3 py-8 text-center text-gray-400">
                  加载中...
                </td>
              </tr>
            ) : currentRows.length === 0 ? (
              <tr>
                <td colSpan={isCallLog ? 6 : 4} className="px-3 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              currentRows.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {new Date(item.time).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                    {item.summary || '-'}
                  </td>
                  {isCallLog && (
                    <>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          getStatus(item) === '成功' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          getStatus(item) === '失败' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {getStatus(item)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDuration(item)}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => openDetail(item)}
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {items.length} 条</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {safePage} / {pageCount}
            </span>
            <button
              onClick={() => setPage(Math.min(pageCount, safePage + 1))}
              disabled={safePage >= pageCount}
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailOpen && detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold">日志详情</h2>
              <button onClick={() => setDetailOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">ID:</span> {detailLog.id}</div>
                <div><span className="text-gray-500">时间:</span> {new Date(detailLog.time).toLocaleString()}</div>
                <div><span className="text-gray-500">类型:</span> {typeLabels[detailLog.type] || detailLog.type}</div>
                <div><span className="text-gray-500">摘要:</span> {detailLog.summary || '-'}</div>
              </div>
              {detailLog.detail && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">详细信息</h3>
                  <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-60">
                    {JSON.stringify(detailLog.detail, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
