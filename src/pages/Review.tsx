import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDueCards } from '../db'
import { processReview, recordStudyDay } from '../scheduler'
import { forceCheckDue } from '../components/DueNotify'
import CardFlip from '../components/CardFlip'
import { playForgotten, playFuzzy, playRemembered } from '../sounds'
import type { Card, ReviewResult } from '../types'

export default function Review() {
  const navigate = useNavigate()
  const [dueCards, setDueCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadDueCards()
  }, [])

  const loadDueCards = async () => {
    const cards = await getDueCards()
    setDueCards(cards.sort(() => Math.random() - 0.5))
    setLoading(false)
  }

  const handleReview = async (result: ReviewResult) => {
    const card = dueCards[currentIndex]
    if (!card || !card.id || submitting) return

    if (result === 'forgotten') playForgotten()
    else if (result === 'fuzzy') playFuzzy()
    else playRemembered()

    setSubmitting(true)
    try {
      await processReview(card.id, result)
      recordStudyDay()
      forceCheckDue()

      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex(currentIndex + 1)
        setIsFlipped(false)
      } else {
        setIsComplete(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (dueCards.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Review</h1>
        </header>
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2>All done for today!</h2>
          <p>No cards due for review</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Review Complete</h1>
        </header>
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2>Great job!</h2>
          <p>You reviewed {dueCards.length} cards</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const currentCard = dueCards[currentIndex]

  return (
    <div className="page review-page">
      <header className="page-header">
        <h1>Review</h1>
        <div className="review-progress">
          {currentIndex + 1} / {dueCards.length}
        </div>
      </header>

      <div className="review-progress-bar">
        <div
          className="review-progress-fill"
          style={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }}
        />
      </div>

      <div className={`review-card-wrapper ${isFlipped ? '' : 'not-flipped'}`}>
        <CardFlip
          key={currentCard.id}
          question={currentCard.question}
          answer={currentCard.answer}
          onFlip={() => setIsFlipped(true)}
        />
      </div>

      {isFlipped && (
        <div className="review-actions">
          <button
            className="btn btn-review btn-forgotten"
            onClick={() => handleReview('forgotten')}
            disabled={submitting}
          >
            {submitting ? '...' : 'Forgot'}
          </button>
          <button
            className="btn btn-review btn-fuzzy"
            onClick={() => handleReview('fuzzy')}
            disabled={submitting}
          >
            {submitting ? '...' : 'Fuzzy'}
          </button>
          <button
            className="btn btn-review btn-remembered"
            onClick={() => handleReview('remembered')}
            disabled={submitting}
          >
            {submitting ? '...' : 'Remembered'}
          </button>
        </div>
      )}
    </div>
  )
}
