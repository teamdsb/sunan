import { env } from '../../app/env';

export const TOKEN_STORAGE_KEY = 'sunan_token';
export const TOKEN_EXPIRES_AT_KEY = 'sunan_token_expires_at';
export const OAUTH_STATE_STORAGE_KEY = 'sunan_oauth_state';
export const REDIRECT_TARGET_STORAGE_KEY = 'sunan_post_auth_redirect';
export const INITIAL_URL_STORAGE_KEY = 'sunan_initial_url';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getSessionStorage(): Storage | null {
  return isBrowser() ? window.sessionStorage : null;
}

function getLocalStorage(): Storage | null {
  return isBrowser() ? window.localStorage : null;
}

export function createOauthState(): string {
  const state = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  getSessionStorage()?.setItem(OAUTH_STATE_STORAGE_KEY, state);
  return state;
}

export function verifyOauthState(state: string | null): boolean {
  const expected = getSessionStorage()?.getItem(OAUTH_STATE_STORAGE_KEY);
  if (!state || !expected || state !== expected) {
    return false;
  }
  getSessionStorage()?.removeItem(OAUTH_STATE_STORAGE_KEY);
  return true;
}

export function persistToken(token: string, expiresIn: number): string {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  getLocalStorage()?.setItem(TOKEN_STORAGE_KEY, token);
  getLocalStorage()?.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
  return expiresAt;
}

export function clearToken(): void {
  getLocalStorage()?.removeItem(TOKEN_STORAGE_KEY);
  getLocalStorage()?.removeItem(TOKEN_EXPIRES_AT_KEY);
}

export function getStoredToken(): string | null {
  return getLocalStorage()?.getItem(TOKEN_STORAGE_KEY) ?? null;
}

export function getStoredTokenExpiresAt(): string | null {
  return getLocalStorage()?.getItem(TOKEN_EXPIRES_AT_KEY) ?? null;
}

export function setRedirectTarget(target: string): void {
  getSessionStorage()?.setItem(REDIRECT_TARGET_STORAGE_KEY, sanitizeRedirectTarget(target));
}

export function getRedirectTarget(): string | null {
  return getSessionStorage()?.getItem(REDIRECT_TARGET_STORAGE_KEY) ?? null;
}

export function consumeRedirectTarget(): string {
  const target = sanitizeRedirectTarget(getRedirectTarget() ?? '/my');
  getSessionStorage()?.removeItem(REDIRECT_TARGET_STORAGE_KEY);
  return target;
}

function sanitizeRedirectTarget(target: string): string {
  if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return '/my';
  try {
    const parsed = new URL(target, 'https://local.sunan.invalid');
    return parsed.origin === 'https://local.sunan.invalid' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : '/my';
  } catch {
    return '/my';
  }
}

export function buildWecomOAuthUrl(targetPath: string): string {
  setRedirectTarget(targetPath);
  const state = createOauthState();
  const redirectUri = encodeURIComponent(env.wecomRedirectUri);
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${env.wecomCorpId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state}&agentid=${env.wecomAgentId}#wechat_redirect`;
}

export function redirectToOAuth(targetPath: string): void {
  if (!isBrowser()) {
    return;
  }
  window.location.assign(buildWecomOAuthUrl(targetPath));
}

export function captureInitialUrl(): void {
  if (!isBrowser()) {
    return;
  }
  const storage = getSessionStorage();
  if (!storage?.getItem(INITIAL_URL_STORAGE_KEY)) {
    storage?.setItem(INITIAL_URL_STORAGE_KEY, window.location.href.split('#')[0]);
  }
}

export function getSignatureUrl(userAgent = navigator.userAgent, href = window.location.href): string {
  const cleanUrl = href.split('#')[0];
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  if (isIOS) {
    return getSessionStorage()?.getItem(INITIAL_URL_STORAGE_KEY) ?? cleanUrl;
  }
  return cleanUrl;
}
