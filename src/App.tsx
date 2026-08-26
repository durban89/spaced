import { lazy, Suspense, useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { onAuthChange } from './auth'
import Layout from './components/Layout'

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
