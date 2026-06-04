import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authAPI, getToken, clearToken } from '../api/client'
import type { User } from '../api/types'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(getToken())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('wms_v2_user')
    if (token && storedUser) {
      try { setUser(JSON.parse(storedUser)) } catch {}
    }
    setLoading(false)
  }, [token])

  const login = async (email: string, password: string) => {
    const data = await authAPI.login(email, password)
    setTokenState(data.token)
    setUser(data.user)
  }

  const logout = () => {
    clearToken()
    localStorage.removeItem('wms_v2_user')
    setTokenState(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
