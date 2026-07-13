import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { setTokens, clearTokens, setBusinessId, getAccessToken } from '../api/axios'

const AuthContext = createContext(null)

export const mapBusinessTypeToId = (typeStr) => {
  const map = {
    retail: 1,
    boutique: 2,
    wholesale: 3,
    pharmacy: 4,
    hardware: 5,
    other: 6,
  }
  return map[typeStr] || 6
}

export const mapIdToBusinessType = (id) => {
  const map = {
    1: 'retail',
    2: 'boutique',
    3: 'wholesale',
    4: 'pharmacy',
    5: 'hardware',
    6: 'other',
  }
  return map[id] || 'other'
}

export const mapBusinessData = (biz) => {
  if (!biz) return null
  // The API returns `currency` as a nested object { id, iso_code, symbol, decimal_places, ... }.
  // Normalise to a plain iso_code string so components can use `business.currency` as a string.
  const currencyIso =
    (typeof biz.currency === 'object' && biz.currency !== null)
      ? biz.currency.iso_code
      : biz.currency_code ?? biz.currency
  return {
    ...biz,
    name: biz.shop_name ?? biz.name,
    phone: biz.phone_number ?? biz.phone,
    currency: currencyIso,
    currency_obj: (typeof biz.currency === 'object' ? biz.currency : null), // full object when available
    business_type: mapIdToBusinessType(biz.business_type_id) ?? biz.business_type,
    // New fields from the updated /businesses response
    opening_balance_set_at: biz.opening_balance_set_at ?? null,
    country_id: biz.country_id ?? null,
    country_ref: biz.country_ref ?? null,
  }
}

/**
 * Apply a complete auth payload (login / set-password / /auth/me response)
 * into local state. Returns the mapped active business (or null).
 *
 * Expected shape:
 *   { user, businesses: [...], has_business: bool }
 *
 * Callers are responsible for calling setTokens() before this if the payload
 * also contains access_token / refresh_token.
 */
const applyAuthPayload = ({ userData, bizList, hasBiz, setUser, setBusinessesState, setBusiness }) => {
  setUser(userData)

  const mapped = (bizList || []).map(mapBusinessData)
  setBusinessesState(mapped)

  if (hasBiz && mapped.length > 0) {
    const active = mapped[0]
    setBusiness(active)
    setBusinessId(active.id)
    return active
  } else {
    setBusiness(null)
    setBusinessId(null)
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [businesses, setBusinessesState] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Derived: true iff the user owns/belongs to at least one business.
  // This is the authoritative value — set from the server `has_business` boolean,
  // not recomputed from businesses.length.
  const hasBusiness = !!business

  // ── Public helpers ──────────────────────────────────────────────────────────

  /** Replaces the businesses[] list (e.g. after wizard creation). */
  const setBusinesses = useCallback((list) => {
    setBusinessesState((list || []).map(mapBusinessData))
  }, [])

  /**
   * Updates the single active business AND upserts it into businesses[].
   * Used by OnboardingShell after POST /businesses.
   */
  const updateBusiness = useCallback((bizData) => {
    if (!bizData) {
      setBusiness(null)
      setBusinessId(null)
      return
    }
    const mapped = mapBusinessData(bizData)
    setBusiness(mapped)
    setBusinessId(mapped.id)
    setBusinessesState(prev => {
      const alreadyIn = prev.some(b => b.id === mapped.id)
      return alreadyIn ? prev : [mapped, ...prev]
    })
  }, [])

  // ── Session bootstrap ───────────────────────────────────────────────────────

  /**
   * Cold-start: call /auth/me if a token is already in memory, otherwise just
   * mark loading done. Handles the new response shape:
   *   GET /auth/me → { user, businesses, has_business }
   *
   * NOTE: Tokens are currently in-memory only (cleared on every page refresh).
   * This branch will be exercised once token persistence is added.
   */
  useEffect(() => {
    const initializeSession = async () => {
      if (!getAccessToken()) {
        // No token in memory — nothing to restore, go straight to login.
        setIsLoading(false)
        return
      }

      try {
        const res = await api.get('/auth/me')
        const { user: userData, businesses: bizList = [], has_business: hasBiz = false } = res.data

        applyAuthPayload({
          userData,
          bizList,
          hasBiz,
          setUser,
          setBusinessesState,
          setBusiness,
        })

        setIsAuthenticated(true)
      } catch (err) {
        // 401 or network failure — clear everything and land on login.
        clearTokens()
        setUser(null)
        setBusiness(null)
        setBusinessesState([])
        setBusinessId(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth actions ────────────────────────────────────────────────────────────

  /**
   * Login: reads `has_business` directly from the response — no follow-up call
   * to /auth/me needed.
   *
   * Response shape: { access_token, refresh_token, user, businesses, has_business }
   */
  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const {
      access_token,
      refresh_token,
      user: userData,
      businesses: bizList = [],
      has_business: hasBiz = false,
    } = response.data

    setTokens(access_token, refresh_token)

    applyAuthPayload({
      userData,
      bizList,
      hasBiz,
      setUser,
      setBusinessesState,
      setBusiness,
    })

    setIsAuthenticated(true)
    return response.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore — server-side logout is stateless for us
    }
    clearTokens()
    setUser(null)
    setBusiness(null)
    setBusinessesState([])
    setBusinessId(null)
    setIsAuthenticated(false)
  }, [])

  /**
   * fetchMe: re-syncs session from /auth/me (called explicitly when needed,
   * e.g. from a settings page refresh). Handles new response shape.
   */
  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      const { user: userData, businesses: bizList = [], has_business: hasBiz = false } = res.data

      applyAuthPayload({
        userData,
        bizList,
        hasBiz,
        setUser,
        setBusinessesState,
        setBusiness,
      })

      setIsAuthenticated(true)
    } catch {
      logout()
    }
  }, [logout])

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        businesses,
        hasBusiness,
        isLoading,
        isAuthenticated,
        login,
        logout,
        updateBusiness,
        fetchMe,
        setUser,
        setIsAuthenticated,
        setBusinesses,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export default AuthContext
