/**
 * Maps backend error codes to user-facing messages.
 * All auth screens should use this instead of hard-coding error strings.
 */
const ERROR_MESSAGES = {
    // Registration
    email_taken:
        'An account with this email already exists. Try logging in instead.',

    // OTP / verification
    invalid_otp:
        'That code is invalid or has expired. Request a new one.',
    resend_too_soon:
        'Please wait a moment before requesting another code.',
    email_already_verified:
        'This email is already verified. Try logging in.',
    no_pending_verification:
        'Something went wrong. Please register again.',

    // Login / set-password
    email_not_verified:
        'Please verify your email first.',
    password_already_set:
        "A password is already set for this account. Use 'Forgot password' instead.",
    invalid_credentials:
        'Invalid email or password.',
    inactive_account:
        'This account is inactive. Contact support.',

    // Token errors
    invalid_token:
        'Your session has expired. Please log in again.',
    wrong_token_type:
        'Your session has expired. Please log in again.',
}

/**
 * Returns a human-readable error message for an auth Axios error.
 *
 * @param {import('axios').AxiosError} error
 * @returns {string}
 */
export function getAuthErrorMessage(error) {
    const code = error?.response?.data?.code
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]

    // Fallback: use the server's own message if provided
    const serverMsg = error?.response?.data?.message || error?.response?.data?.detail
    if (serverMsg) return serverMsg

    return 'Something went wrong. Please try again.'
}

export default getAuthErrorMessage
