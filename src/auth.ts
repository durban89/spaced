import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL as string

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export async function signInWithGoogle(): Promise<void> {
  if (!isNative()) {
    await signInWithRedirect(auth, googleProvider)
    return
  }

  // 原生层 Google 登录，拿到 idToken 后在 Web 层签名（Firestore 使用）
  const result = await FirebaseAuthentication.signInWithGoogle()
  if (!result.credential?.idToken) {
    throw new Error('Google sign-in failed: no id token returned')
  }
  const credential = GoogleAuthProvider.credential(result.credential.idToken)
  const user = (await signInWithCredential(auth, credential)).user
  if (!ensureAllowedUser(user)) {
    throw new Error('Access denied. This account is not authorized.')
  }
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
  if (isNative()) {
    try {
      await FirebaseAuthentication.signOut()
    } catch {
      // native layer 未登录时忽略
    }
  }
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
