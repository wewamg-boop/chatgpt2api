import { useEffect, useRef, useState } from 'react'
import { Play, Square, RotateCcw, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchRegisterConfig,
  updateRegisterConfig,
  startRegister,
  stopRegister,
  resetRegister,
  type RegisterConfig,
} from '../lib/server-api'

export default function RegisterPage() {
  const [config, setConfig] = useState<RegisterConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [editConfig, setEditConfig] = useState<Partial<RegisterConfig>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const data = await fetchRegisterConfig()
      setConfig(data.register)
      setEditConfig(data.register)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载配置失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    if (config?.stats?.running) {
      pollRef.current = setInterval(loadConfig, 3000)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [config?.stats?.running])

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await startRegister()
      toast.success('注册任务已启动')
      await loadConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '启动失败')
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    setIsStopping(true)
    try {
      await stopRegister()
      toast.success('注册任务已停止')
      await loadConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '停止失败')
    } finally {
      setIsStopping(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await resetRegister()
      toast.success('注册统计已重置')
      await loadConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重置失败')
    } finally {
      setIsResetting(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateRegisterConfig(editConfig)
      toast.success('配置已保存')
      await loadConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  if (isLoading || !config) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>
  }

  const stats = config.stats || {}
  const isRunning = stats.running > 0

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">注册机</h1>
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 inline mr-1" />
              启动
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isStopping}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Square className="w-4 h-4 inline mr-1" />
              停止
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 inline mr-1" />
            重置
          </button>
          <button
            onClick={loadConfig}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">成功</p>
          <p className="text-2xl font-bold text-green-600">{stats.success || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">失败</p>
          <p className="text-2xl font-bold text-red-600">{stats.fail || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">完成</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.done || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">成功率</p>
          <p className="text-2xl font-bold text-blue-600">{stats.success_rate ? `${(stats.success_rate * 100).toFixed(1)}%` : '-'}</p>
        </div>
      </div>

      {/* Config */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-lg font-bold">配置</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">目标数量</label>
            <input
              type="number"
              value={editConfig.total || 0}
              onChange={(e) => setEditConfig({ ...editConfig, total: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">线程数</label>
            <input
              type="number"
              value={editConfig.threads || 1}
              onChange={(e) => setEditConfig({ ...editConfig, threads: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">模式</label>
            <select
              value={editConfig.mode || 'total'}
              onChange={(e) => setEditConfig({ ...editConfig, mode: e.target.value as 'total' | 'quota' | 'available' })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="total">按数量</option>
              <option value="quota">按额度</option>
              <option value="available">按可用账号</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">检查间隔(秒)</label>
            <input
              type="number"
              value={editConfig.check_interval || 60}
              onChange={(e) => setEditConfig({ ...editConfig, check_interval: parseInt(e.target.value) || 60 })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">代理</label>
            <input
              type="text"
              value={editConfig.proxy || ''}
              onChange={(e) => setEditConfig({ ...editConfig, proxy: e.target.value })}
              placeholder="socks5://..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
        >
          保存配置
        </button>
      </div>

      {/* Logs */}
      {config.logs && config.logs.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-bold mb-3">运行日志</h2>
          <div className="max-h-60 overflow-auto space-y-1">
            {config.logs.map((log, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-gray-400 whitespace-nowrap">{new Date(log.time).toLocaleTimeString()}</span>
                <span className={log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-300'}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
