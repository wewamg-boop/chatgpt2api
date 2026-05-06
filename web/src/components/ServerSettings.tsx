import { useCallback, useEffect, useState } from 'react'
import * as serverApi from '../lib/server-api'
import type { ServerConfig, ProxyTestResult } from '../lib/server-api'

export function ServerSettings() {
  const [config, setConfig] = useState<ServerConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [proxyTestUrl, setProxyTestUrl] = useState('')
  const [proxyTesting, setProxyTesting] = useState(false)
  const [proxyResult, setProxyResult] = useState<ProxyTestResult | null>(null)

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const data = await serverApi.fetchServerSettings()
        setConfig(data.config)
        setProxyTestUrl(data.config.proxy || '')
      } catch (err) {
        showMessage('error', err instanceof Error ? err.message : '加载设置失败')
      } finally {
        setLoading(false)
      }
    })()
  }, [showMessage])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const result = await serverApi.updateServerSettings(config)
      setConfig(result.config)
      showMessage('success', '设置已保存')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTestProxy = async () => {
    setProxyTesting(true)
    setProxyResult(null)
    try {
      const data = await serverApi.testProxy(proxyTestUrl || undefined)
      setProxyResult(data.result)
    } catch (err) {
      setProxyResult({ ok: false, status: 0, latency_ms: 0, error: err instanceof Error ? err.message : '测试失败' })
    } finally {
      setProxyTesting(false)
    }
  }

  if (loading) return <div className="p-4 text-sm text-stone-400">加载中...</div>
  if (!config) return <div className="p-4 text-sm text-red-600">无法加载设置</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {message && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-700">服务端配置</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">代理地址</label>
            <input type="text" value={config.proxy || ''} onChange={(e) => setConfig({ ...config, proxy: e.target.value })}
              placeholder="http://127.0.0.1:7890"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Base URL</label>
            <input type="text" value={config.base_url || ''} onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
              placeholder="自动检测"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">认证密钥</label>
            <input type="password" value={String(config['auth-key'] || '')} onChange={(e) => setConfig({ ...config, 'auth-key': e.target.value })}
              placeholder="未设置"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">账号刷新间隔（分钟）</label>
            <input type="number" value={config.refresh_account_interval_minute || ''}
              onChange={(e) => setConfig({ ...config, refresh_account_interval_minute: e.target.value ? Number(e.target.value) : '' })}
              placeholder="30"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-0" />
          </div>
        </div>
        <button onClick={() => void handleSave()} disabled={saving}
          className="rounded-xl bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:bg-stone-300">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-stone-700">代理测试</h3>
        <div className="flex gap-2">
          <input type="text" value={proxyTestUrl} onChange={(e) => setProxyTestUrl(e.target.value)}
            placeholder="输入代理地址测试连通性"
            className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-0" />
          <button onClick={() => void handleTestProxy()} disabled={proxyTesting}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
            {proxyTesting ? '测试中...' : '测试'}
          </button>
        </div>
        {proxyResult && (
          <div className={`rounded-xl px-4 py-2.5 text-sm border ${
            proxyResult.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {proxyResult.ok
              ? `连通成功 - 状态: ${proxyResult.status}, 延迟: ${proxyResult.latency_ms}ms`
              : `连接失败 - ${proxyResult.error || `HTTP ${proxyResult.status}`}`}
          </div>
        )}
      </div>
    </div>
  )
}
