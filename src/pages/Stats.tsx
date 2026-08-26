import { useState, useEffect } from 'react'
import { getStats, getAllCards } from '../db'
import { getStreak } from '../scheduler'
import type { Stats } from '../types'

export default function Stats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [streak, setStreak] = useState(0)
  const [levelDistribution, setLevelDistribution] = useState<number[]>([])
  const [recentActivity, setRecentActivity] = useState<{ date: string; count: number }[]>([])

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const s = await getStats()
    setStats(s)
    setStreak(getStreak())

    const allCards = await getAllCards()

    const levels = new Array(7).fill(0)
    for (const card of allCards) {
      levels[card.level]++
    }
    setLevelDistribution(levels)

    const activityMap = new Map<string, number>()
    for (const card of allCards) {
      for (const record of card.reviewHistory) {
        const date = new Date(record.date).toLocaleDateString('en-US')
        activityMap.set(date, (activityMap.get(date) || 0) + 1)
      }
    }
    const activity = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7)
    setRecentActivity(activity)
  }

  if (!stats) {
    return <div className="page"><div className="loading">Loading...</div></div>
  }

  const maxLevel = Math.max(...levelDistribution, 1)

  return (
    <div className="page">
      <header className="page-header">
        <h1>Statistics</h1>
      </header>

      <div className="stats-cards">
        <div className="stat-card primary">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Cards</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.mastered}</div>
          <div className="stat-label">Mastered</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.dueToday}</div>
          <div className="stat-label">Due Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>

      <div className="section">
        <h2>Mastery Distribution</h2>
        <div className="level-chart">
          {levelDistribution.map((count, level) => (
            <div key={level} className="level-bar-row">
              <span className="level-label">L{level}</span>
              <div className="level-bar-bg">
                <div
                  className="level-bar-fill"
                  style={{ width: `${(count / maxLevel) * 100}%` }}
                />
              </div>
              <span className="level-count">{count}</span>
            </div>
          ))}
        </div>
        <div className="level-legend">
          <span>L0: New</span>
          <span>L6: Mastered</span>
        </div>
      </div>

      {stats.categories.length > 0 && (
        <div className="section">
          <h2>Categories</h2>
          <div className="category-list">
            {stats.categories.map((cat) => (
              <div key={cat.name} className="category-item">
                <span className="category-name">{cat.name}</span>
                <span className="category-count">{cat.count} cards</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div key={item.date} className="activity-item">
                <span className="activity-date">{item.date}</span>
                <span className="activity-count">{item.count} reviews</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
