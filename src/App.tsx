import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Cards from './pages/Cards'
import Review from './pages/Review'
import Stats from './pages/Stats'

export default function App() {
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
