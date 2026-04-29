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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ChatGPT2API</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">请输入认证密钥登录</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-800">
          <div className="space-y-4">
            <div>
              <label htmlFor="auth-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                认证密钥
              </label>
              <input
                id="auth-key"
                type="password"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="输入 Auth Key"
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!authKey.trim() || loading}
              className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:bg-gray-700"
            >
              {loading ? '验证中...' : '登录'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          密钥将在浏览器本地保存，不会上传至第三方
        </p>
      </div>
    </div>
  )
}
