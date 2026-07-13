/**
 * Auth API layer — thin wrappers around the /auth/* endpoints.
 * All requests go through the shared axios instance (with Bearer + refresh logic).
 */
import api from './axios'

/** POST /auth/register — creates user, sends OTP. No tokens returned. */
export const register = (full_name, email) =>
    api.post('/auth/register', { full_name, email })

/** POST /auth/verify-email — verifies OTP, marks email verified. */
export const verifyEmail = (email, code) =>
    api.post('/auth/verify-email', { email, code })

/**
 * POST /auth/resend-otp
 * @param {string} email
 * @param {'EMAIL_VERIFICATION'|'PASSWORD_RESET'} verification_type
 */
export const resendOtp = (email, verification_type) =>
    api.post('/auth/resend-otp', { email, verification_type })

/** POST /auth/set-password — sets password, returns tokens + user. */
export const setPassword = (email, password) =>
    api.post('/auth/set-password', { email, password })

/** POST /auth/login — returns tokens + user + businesses. */
export const loginRequest = (email, password) =>
    api.post('/auth/login', { email, password })

/** POST /auth/forgot-password — always returns generic success. */
export const forgotPassword = (email) =>
    api.post('/auth/forgot-password', { email })

/** POST /auth/reset-password — resets password. */
export const resetPassword = (email, code, new_password) =>
    api.post('/auth/reset-password', { email, code, new_password })

/** POST /auth/refresh — exchanges refresh_token for new access_token. */
export const refreshToken = (refresh_token) =>
    api.post('/auth/refresh', { refresh_token })

/** POST /auth/logout — requires auth header. Fire-and-forget is acceptable. */
export const logoutRequest = () =>
    api.post('/auth/logout')

/** GET /auth/me — returns current user object. Requires auth. */
export const me = () =>
    api.get('/auth/me')
