const TOKEN_KEY = 'agridoc_token';

// Save token after login
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Read token (returns null if not logged in)
export function getToken(): string | null {
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

// Decode email from the JWT payload (no extra library needed)
// JWT = header.payload.signature — payload is base64url-encoded JSON
export function getUserEmail(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email ?? null;
  } catch {
    return null;
  }
}
