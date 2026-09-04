import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  checkAndNotify,
  requestNotificationPermission,
  startPeriodicCheck,
  stopPeriodicCheck,
} from '../notifications'
import {
  checkNativeNotificationPermission,
  fireTestNotification,
  isNativeNotificationsAvailable,
} from '../nativeNotifications'

let globalForceCheck: (() => Promise<void>) | null = null

type PermissionState = 'default' | 'granted' | 'denied'

interface NativeDiag {
  reached: boolean
  raw: string
}

async function getPermission(): Promise<{
  state: PermissionState
  nativeDiag: NativeDiag
}> {
  const isNative = await isNativeNotificationsAvailable()
  if (isNative) {
    try {
      const granted = await checkNativeNotificationPermission()
      return {
        state: granted ? 'granted' : 'denied',
        nativeDiag: { reached: true, raw: String(granted) },
      }
    } catch (e) {
      return {
        state: 'denied',
        nativeDiag: {
          reached: true,
          raw: e instanceof Error ? e.message : String(e),
        },
      }
    }
  }
  if (!('Notification' in window)) {
    return { state: 'denied', nativeDiag: { reached: false, raw: 'no-web-notif-api' } }
  }
  return {
    state: Notification.permission as PermissionState,
    nativeDiag: { reached: false, raw: 'web:' + Notification.permission },
  }
}

export function forceCheckDue() {
  globalForceCheck?.()
}

export default function DueNotify() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dueCards, setDueCards] = useState<{ question: string; category: string }[]>([])
  const [showBanner, setShowBanner] = useState(false)
  const [permission, setPermission] = useState<PermissionState>('default')
  const [asking, setAsking] = useState(false)
  const [permError, setPermError] = useState('')
  const [nativeDiag, setNativeDiag] = useState<NativeDiag | null>(null)

  const checkDue = useCallback(async () => {
    const { count, cards } = await checkAndNotify()
    if (count > 0) {
      setDueCards(cards)
      setShowBanner(true)
    } else {
      setShowBanner(false)
    }
  }, [])

  const refreshPermission = useCallback(async () => {
    try {
      const { state, nativeDiag } = await getPermission()
      setPermission(state)
      setNativeDiag(nativeDiag)
      setPermError('')
    } catch (e) {
      setPermError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    globalForceCheck = checkDue
    startPeriodicCheck(() => checkDue())
    refreshPermission()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDue()
        refreshPermission()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopPeriodicCheck()
      document.removeEventListener('visibilitychange', onVisibility)
      globalForceCheck = null
    }
  }, [checkDue, refreshPermission])

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

  return (
    <>
      {nativeDiag && (
        <div
          style={{
            fontSize: 11,
            color: '#93c5fd',
            background: 'rgba(37,99,235,0.12)',
            padding: '5px 8px',
            wordBreak: 'break-all',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        >
          diag[{permission}] native={nativeDiag.reached ? 'yes' : 'no'} raw={nativeDiag.raw}
          {permError ? ` | err:${permError}` : ''}
        </div>
      )}

      {location.pathname === '/' && (
        <>
          {showBanner && dueCards.length > 0 ? (
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
                    <span className="due-banner-question">{card.question.slice(0, 50)}{card.question.length > 50 ? '...' : ''}</span>
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
          ) : permission !== 'granted' ? (
            <div className="notify-permission-banner">
              {permError && <div style={{ fontSize: 11, color: '#f87171', paddingBottom: 6, wordBreak: 'break-all' }}>err: {permError}</div>}
              <span>
                {permission === 'denied'
                  ? "Notifications blocked. You won't receive reminders."
                  : 'Enable notifications to get reminded on your phone'}
              </span>
              <button
                className={`btn btn-sm ${permission === 'denied' ? 'btn-ghost' : 'btn-primary'}`}
                onClick={handleEnableNotify}
                disabled={asking}
              >
                {asking ? '...' : permission === 'denied' ? 'Retry' : 'Enable'}
              </button>
            </div>
          ) : (
            <div className="notify-permission-banner">
              <span style={{ color: '#4ade80' }}>Notifications granted</span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => fireTestNotification()}
              >
                Test notif
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
