import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { initStore } from './store'
import { useStore } from './store'
import { normalizeBaseUrl } from './lib/api'
import { isLoggedIn, setAuthKey, getAuthKey } from './lib/server-api'
import type { ApiMode } from './types'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import TaskGrid from './components/TaskGrid'
import InputBar from './components/InputBar'
import DetailModal from './components/DetailModal'
import Lightbox from './components/Lightbox'
import SettingsModal from './components/SettingsModal'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import MaskEditorModal from './components/MaskEditorModal'
import ImageContextMenu from './components/ImageContextMenu'
import { LoginPage } from './components/LoginPage'
import { AccountsPage } from './components/AccountsPage'
import { ServerSettings } from './components/ServerSettings'

function ImagePlayground() {
  const setSettings = useStore((s) => s.setSettings)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const nextSettings: { baseUrl?: string; apiKey?: string; codexCli?: boolean; apiMode?: ApiMode } = {
      codexCli: false,
      apiMode: 'images',
    }

    // When deployed with chatgpt2api backend, default to same-origin
    const authKey = getAuthKey()
    if (authKey) {
      nextSettings.apiKey = authKey
      nextSettings.baseUrl = normalizeBaseUrl(window.location.origin + '/v1')
    }

    const apiUrlParam = searchParams.get('apiUrl')
    if (apiUrlParam !== null) {
      nextSettings.baseUrl = normalizeBaseUrl(apiUrlParam.trim())
    }

    const apiKeyParam = searchParams.get('apiKey')
    if (apiKeyParam !== null) {
      nextSettings.apiKey = apiKeyParam.trim()
    }

    const codexCliParam = searchParams.get('codexCli')
    if (codexCliParam !== null) {
      nextSettings.codexCli = codexCliParam.trim().toLowerCase() === 'true'
    }

    const apiModeParam = searchParams.get('apiMode')
    if (apiModeParam === 'images' || apiModeParam === 'responses') {
      nextSettings.apiMode = apiModeParam
    }

    setSettings(nextSettings)

    if (searchParams.has('apiUrl') || searchParams.has('apiKey') || searchParams.has('codexCli') || searchParams.has('apiMode')) {
      searchParams.delete('apiUrl')
      searchParams.delete('apiKey')
      searchParams.delete('codexCli')
      searchParams.delete('apiMode')

      const nextSearch = searchParams.toString()
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', nextUrl)
    }

    initStore()
  }, [setSettings])

  useEffect(() => {
    const preventPageImageDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest('img')) {
        e.preventDefault()
      }
    }

    document.addEventListener('dragstart', preventPageImageDrag)
    return () => document.removeEventListener('dragstart', preventPageImageDrag)
  }, [])

  return (
    <>
      <Header />
      <main data-home-main className="safe-area-x max-w-7xl mx-auto pb-48">
        <SearchBar />
        <TaskGrid />
      </main>
      <InputBar />
      <DetailModal />
      <Lightbox />
      <SettingsModal />
      <ConfirmDialog />
      <Toast />
      <MaskEditorModal />
      <ImageContextMenu />
    </>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    if (isLoggedIn()) {
      setAuthed(true)
      return
    }
    setAuthed(false)
  }, [])

  if (authed === null) return null
  if (!authed) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export default function App() {
  const navigate = useNavigate()

  const handleLogin = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  const handleLogout = useCallback(() => {
    setAuthKey('')
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/" element={
        <RequireAuth>
          <ImagePlayground />
        </RequireAuth>
      } />
      <Route path="/accounts" element={
        <RequireAuth>
          <>
            <Header showNav onLogout={handleLogout} />
            <AccountsPage />
          </>
        </RequireAuth>
      } />
      <Route path="/settings" element={
        <RequireAuth>
          <>
            <Header showNav onLogout={handleLogout} />
            <ServerSettings />
          </>
        </RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
