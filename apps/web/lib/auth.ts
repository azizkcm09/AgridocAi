const TOKEN_KEY = 'agridoc_token';

// Save token after login
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Read token (returns null if not logged in)
// typeof window check: localStorage doesn't exist on the server (Next.js SSR)
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// Delete token on logout
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Quick check: is the user logged in?
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// Decode the JWT payload (no extra library needed)
// JWT = header.payload.signature — payload is base64url-encoded JSON
function decodePayload(): Record<string, any> | null {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function getUserEmail(): string | null {
  return decodePayload()?.email ?? null;
}

export function getUserName(): string | null {
  return decodePayload()?.name ?? null;
}

export function getUserRole(): 'USER' | 'ADMIN' | null {
  return decodePayload()?.role ?? null;
}
