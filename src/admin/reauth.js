/** The server's answer when an admin session is older than ADMIN_SESSION_MAX_HOURS. */
export const REAUTH_CODE = 'ADMIN_REAUTH_REQUIRED'

/** True when administration needs the person to sign in again (too old a session, or none any more). */
export const needsReauth = (error) => error?.code === REAUTH_CODE || error?.status === 401
