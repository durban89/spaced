import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL as string

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider)
  const user = cred.user

  if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
    await signOut(auth)
    throw new Error('Access denied. This account is not authorized.')
  }

  return user
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user && ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
      signOut(auth)
      callback(null)
      return
    }
    callback(user)
  })
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}
