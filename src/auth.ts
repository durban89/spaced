import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL as string

export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider)
}

export function ensureAllowedUser(user: User | null): User | null {
  if (user && ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
    signOut(auth)
    return null
  }
  return user
}

export async function resolveRedirectResult(): Promise<void> {
  const cred = await getRedirectResult(auth)
  if (!cred) return
  if (!ensureAllowedUser(cred.user)) {
    throw new Error('Access denied. This account is not authorized.')
  }
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    callback(ensureAllowedUser(user))
  })
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}
