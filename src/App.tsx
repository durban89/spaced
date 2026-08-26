import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { onAuthChange } from './auth'
import Layout from './components/Layout'
import Home from './pages/Home'
import Cards from './pages/Cards'
import Review from './pages/Review'
import Stats from './pages/Stats'
import Auth from './pages/Auth'

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
    return <Auth />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="cards" element={<Cards />} />
          <Route path="review" element={<Review />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
