import { useState } from 'react'
import * as serverApi from '../lib/server-api'

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [authKey, setAuthKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = authKey.trim()
    if (!key) return

    setLoading(true)
    setError('')
    try {
      await serverApi.login(key)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-900">ChatGPT2API</h1>
          <p className="mt-2 text-sm text-stone-500">请输入认证密钥登录</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="auth-key" className="block text-sm font-medium text-stone-700 mb-1.5">
                认证密钥
              </label>
              <input
                id="auth-key"
                type="password"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="输入 Auth Key"
                autoFocus
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-0"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!authKey.trim() || loading}
              className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {loading ? '验证中...' : '登录'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-stone-400">
          密钥将在浏览器本地保存，不会上传至第三方
        </p>
      </div>
    </div>
  )
}
