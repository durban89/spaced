import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addCard, getStats, getCategoryList } from '../db'
import { logout } from '../auth'
import { getStreak, recordStudyDay } from '../scheduler'
import CategoryManager from '../components/CategoryManager'
import type { Stats } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [categoryList, setCategoryList] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [streak, setStreak] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const s = await getStats()
    setStats(s)
    setStreak(await getStreak())
  }

  const loadCategories = async () => {
    const list = await getCategoryList()
    setCategoryList(list)
    setCategory((cur) => (cur && list.includes(cur) ? cur : list[0]))
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleAdd = async () => {
    if (!question.trim() || !answer.trim()) return
    await addCard({ category, question: question.trim(), answer: answer.trim() })
    setQuestion('')
    setAnswer('')
    setShowForm(false)
    loadStats()
  }

  const handleStartReview = async () => {
    await recordStudyDay()
    navigate('/review')
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Spaced</h1>
          <p className="subtitle">Spaced repetition for efficient learning</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => logout()} title="Sign out">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </header>

      {stats && (
        <div className="stats-cards">
          <div className="stat-card primary">
            <div className="stat-number">{stats.dueToday}</div>
            <div className="stat-label">Due Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.mastered}</div>
            <div className="stat-label">Mastered</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Cards</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{streak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>
      )}

      {stats && stats.dueToday > 0 && (
        <button className="btn btn-primary btn-lg" onClick={handleStartReview}>
          Start Review ({stats.dueToday} cards)
        </button>
      )}

      <div className="section">
        <div className="section-header">
          <h2>Quick Add</h2>
          <button
            className="btn btn-ghost"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {showForm && (
          <div className="add-form">
            <div className="form-group">
              <label>Category</label>
              <div className="category-row">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categoryList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setManageOpen(true)}
                >
                  Manage
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter question..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter answer..."
                rows={3}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={!question.trim() || !answer.trim()}
            >
              Add Card
            </button>
          </div>
        )}
      </div>

      {manageOpen && (
        <CategoryManager
          onClose={() => setManageOpen(false)}
          onChanged={loadCategories}
        />
      )}
    </div>
  )
}
