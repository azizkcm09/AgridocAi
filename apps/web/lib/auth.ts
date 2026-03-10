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
