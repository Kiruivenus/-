export function getDeviceFingerprint(): string {
  // Create a unique device identifier based on browser properties
  const navigator_vendor = navigator.vendor
  const navigator_language = navigator.language
  const screen_resolution = `${window.screen.width}x${window.screen.height}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const user_agent = navigator.userAgent

  // Create a hash-like identifier
  const fingerprint = `${navigator_vendor}|${navigator_language}|${screen_resolution}|${timezone}|${user_agent}`

  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  return Math.abs(hash).toString(36)
}

export function getSessionKey(): string {
  return `admin_session_${getDeviceFingerprint()}`
}

export function isSessionValid(): boolean {
  if (typeof window === "undefined") return false

  const sessionKey = getSessionKey()
  const session = localStorage.getItem(sessionKey)

  if (!session) return false

  try {
    const data = JSON.parse(session)
    const expiryTime = new Date(data.expiresAt).getTime()
    const currentTime = new Date().getTime()

    return currentTime < expiryTime
  } catch {
    return false
  }
}

export function setSession(): void {
  const sessionKey = getSessionKey()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  localStorage.setItem(
    sessionKey,
    JSON.stringify({
      deviceFingerprint: getDeviceFingerprint(),
      expiresAt: expiresAt.toISOString(),
      loginTime: new Date().toISOString(),
    }),
  )
}

export function clearSession(): void {
  const sessionKey = getSessionKey()
  localStorage.removeItem(sessionKey)
}
