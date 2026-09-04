import { lazy, Suspense, useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { onAuthChange } from './auth'
import Layout from './components/Layout'
import {
  checkNativeNotificationPermission,
  isNativeNotificationsAvailable,
  requestNativeNotificationPermission,
  resyncAllSchedules,
} from './nativeNotifications'
import { getAllCards } from './db'

const Home = lazy(() => import('./pages/Home'))
const Cards = lazy(() => import('./pages/Cards'))
const Review = lazy(() => import('./pages/Review'))
const Stats = lazy(() => import('./pages/Stats'))
const Auth = lazy(() => import('./pages/Auth'))

function PageLoader() {
  return (
    <div className="page">
      <div className="loading">Loading...</div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<null | { uid: string }>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u ? { uid: u.uid } : null)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!(await isNativeNotificationsAvailable())) return
      if (await checkNativeNotificationPermission()) return
      // 登录后首次启动主动请求通知权限（系统弹窗，仅触发一次）
      await requestNativeNotificationPermission()
      if (!cancelled) {
        // 权限状态由 DueNotify 在 resume 时刷新，无需额外处理
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        // 每次登录后重排所有未来提醒，兜底重启/进程被杀导致的排期丢失
        const cards = await getAllCards()
        if (!cancelled) await resyncAllSchedules(cards)
      } catch (e) {
        console.warn('resyncAllSchedules failed', e)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="auth-page"><div className="loading">Loading...</div></div>}>
        <Auth />
      </Suspense>
    )
  }

  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="cards" element={<Cards />} />
            <Route path="review" element={<Review />} />
            <Route path="stats" element={<Stats />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
