import { useState } from 'react'
import { login, register } from '../auth'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setError('Invalid email or password')
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('Email already registered')
      } else if (msg.includes('auth/weak-password')) {
        setError('Password must be at least 6 characters')
      } else if (msg.includes('auth/invalid-email')) {
        setError('Invalid email address')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="40" height="40" viewBox="0 0 100 100">
              <rect width="100" height="100" rx="20" fill="#3b82f6"/>
              <g transform="translate(50,48)" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0,-25 C-8,-25 -15,-22 -18,-16 C-22,-17 -26,-13 -26,-8 C-28,-5 -28,0 -25,4 C-27,8 -25,13 -21,15 C-22,20 -18,24 -13,25 C-9,28 -4,28 0,28"/>
                <path d="M0,-25 C8,-25 15,-22 18,-16 C22,-17 26,-13 26,-8 C28,-5 28,0 25,4 C27,8 25,13 21,15 C22,20 18,24 13,25 C9,28 4,28 0,28"/>
                <path d="M0,-25 L0,28"/>
                <path d="M-20,-10 C-14,-8 -6,-12 0,-8"/>
                <path d="M20,-10 C14,-8 6,-12 0,-8"/>
                <path d="M-22,2 C-16,0 -8,4 0,0"/>
                <path d="M22,2 C16,0 8,4 0,0"/>
                <path d="M-18,14 C-12,12 -6,16 0,12"/>
                <path d="M18,14 C12,12 6,16 0,12"/>
              </g>
            </svg>
          </div>
          <h1>Ebbinghaus Memory</h1>
          <p>Spaced repetition for efficient learning</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button className="btn btn-ghost btn-sm" onClick={() => { setIsLogin(!isLogin); setError('') }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
