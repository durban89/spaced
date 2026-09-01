import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  checkAndNotify,
  requestNotificationPermission,
  startPeriodicCheck,
  stopPeriodicCheck,
} from '../notifications'

let globalForceCheck: (() => Promise<void>) | null = null

type PermissionState = 'default' | 'granted' | 'denied'

function getPermission(): PermissionState {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission as PermissionState
}

export function forceCheckDue() {
  globalForceCheck?.()
}

export default function DueNotify() {
  const navigate = useNavigate()
  const [dueCards, setDueCards] = useState<{ question: string; category: string; title?: string }[]>([])
  const [showBanner, setShowBanner] = useState(false)
  const [permission, setPermission] = useState<PermissionState>(getPermission)
  const [asking, setAsking] = useState(false)

  const checkDue = useCallback(async () => {
    const { count, cards } = await checkAndNotify()
    if (count > 0) {
      setDueCards(cards)
      setShowBanner(true)
    } else {
      setShowBanner(false)
    }
  }, [])

  useEffect(() => {
    globalForceCheck = checkDue
    startPeriodicCheck(() => checkDue())

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDue()
        setPermission(getPermission())
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopPeriodicCheck()
      document.removeEventListener('visibilitychange', onVisibility)
      globalForceCheck = null
    }
  }, [checkDue])

  const handleEnableNotify = async () => {
    setAsking(true)
    try {
      const granted = await requestNotificationPermission()
      setPermission(granted ? 'granted' : 'denied')
      if (granted) checkDue()
    } finally {
      setAsking(false)
    }
  }

  const handleDismiss = () => setShowBanner(false)

  const handleGoReview = () => navigate('/review')

  if (!showBanner || dueCards.length === 0) {
    if (permission === 'granted') return null

    return (
      <div className="notify-permission-banner">
        {permission === 'denied' ? (
          <>
            <span>Notifications blocked. You won't receive reminders.</span>
            <button className="btn btn-sm btn-ghost" onClick={handleEnableNotify} disabled={asking}>
              {asking ? '...' : 'Retry'}
            </button>
          </>
        ) : (
          <>
            <span>Enable notifications to get reminded on your phone</span>
            <button className="btn btn-sm btn-primary" onClick={handleEnableNotify} disabled={asking}>
              {asking ? '...' : 'Enable'}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="due-banner">
      <div className="due-banner-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="due-banner-title">{dueCards.length} cards due for review</span>
        <button className="btn btn-sm btn-ghost" onClick={handleDismiss}>✕</button>
      </div>
      <div className="due-banner-list">
        {dueCards.slice(0, 3).map((card, i) => (
          <div key={i} className="due-banner-item">
            <span className="due-banner-category">{card.category}</span>
            <span className="due-banner-question">{card.title || card.question.slice(0, 50)}{!card.title && card.question.length > 50 ? '...' : ''}</span>
          </div>
        ))}
        {dueCards.length > 3 && (
          <div className="due-banner-more">{dueCards.length - 3} more...</div>
        )}
      </div>
      <button className="btn btn-primary btn-lg" onClick={handleGoReview}>
        Review Now
      </button>
    </div>
  )
}
