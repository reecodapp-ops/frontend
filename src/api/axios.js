import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

// In-memory token store (not localStorage)
let accessToken = null
let refreshToken = null
let isRefreshing = false
let failedQueue = []

// In-memory business ID — set after a business is selected
let businessId = null

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

export const setTokens = (access, refresh) => {
  accessToken = access
  refreshToken = refresh
}

export const clearTokens = () => {
  accessToken = null
  refreshToken = null
}

export const getAccessToken = () => accessToken
export const getRefreshToken = () => refreshToken

/** Call this when a business is selected (future modules). */
export const setBusinessId = (id) => { businessId = id }
export const clearBusinessId = () => { businessId = null }

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach Bearer token + X-Business-Id (when set)
api.interceptors.request.use(
  config => {
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    if (businessId) {
      config.headers['X-Business-Id'] = businessId
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      if (!refreshToken) {
        if (originalRequest.skipAuthRedirect) {
          return Promise.reject(error)
        }
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const newAccess = response.data.access_token
        const newRefresh = response.data.refresh_token || refreshToken
        setTokens(newAccess, newRefresh)
        processQueue(null, newAccess)
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        if (originalRequest.skipAuthRedirect) {
          return Promise.reject(refreshError)
        }
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
