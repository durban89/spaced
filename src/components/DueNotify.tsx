import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkAndNotify, requestNotificationPermission, startPeriodicCheck, stopPeriodicCheck } from '../notifications'

let globalForceCheck: (() => Promise<void>) | null = null

export function forceCheckDue() {
  globalForceCheck?.()
}

export default function DueNotify() {
  const navigate = useNavigate()
  const [dueCards, setDueCards] = useState<{ question: string; category: string }[]>([])
  const [showBanner, setShowBanner] = useState(false)
  const [permissionRequested, setPermissionRequested] = useState(false)

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
    checkDue()
    startPeriodicCheck(() => checkDue())

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkDue()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopPeriodicCheck()
      document.removeEventListener('visibilitychange', onVisibility)
      globalForceCheck = null
    }
  }, [checkDue])

  const handleEnableNotify = async () => {
    const granted = await requestNotificationPermission()
    setPermissionRequested(true)
    if (granted) checkDue()
  }

  const handleDismiss = () => setShowBanner(false)

  const handleGoReview = () => navigate('/review')

  if (!showBanner || dueCards.length === 0) {
    return (
      <>
        {!permissionRequested && (
          <div className="notify-permission-banner">
            <span>开启通知，到时间提醒你复习</span>
            <button className="btn btn-sm btn-primary" onClick={handleEnableNotify}>开启</button>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="due-banner">
      <div className="due-banner-header">
        <span className="due-banner-icon">⏰</span>
        <span className="due-banner-title">{dueCards.length} 张卡片需要复习</span>
        <button className="btn btn-sm btn-ghost" onClick={handleDismiss}>✕</button>
      </div>
      <div className="due-banner-list">
        {dueCards.slice(0, 3).map((card, i) => (
          <div key={i} className="due-banner-item">
            <span className="due-banner-category">{card.category}</span>
            <span className="due-banner-question">{card.question.slice(0, 50)}{card.question.length > 50 ? '...' : ''}</span>
          </div>
        ))}
        {dueCards.length > 3 && (
          <div className="due-banner-more">还有 {dueCards.length - 3} 张...</div>
        )}
      </div>
      <button className="btn btn-primary btn-lg" onClick={handleGoReview}>
        立即复习
      </button>
    </div>
  )
}
