/**
 * Herbarium API Client
 * Centralized API service for Google Apps Script Web App
 * Handles:
 * - Public list querying
 * - Session storage management for auth tokens
 * - CORS-preflight avoidance using Content-Type: text/plain;charset=utf-8
 * - Standard envelope unwrapping { ok, data, error }
 * - UNAUTHORIZED event dispatcher
 * - Local fallback mode when GAS URL is not yet configured
 */

import initialSeedQueries from '../../data/queries.json';

const GAS_URL = import.meta.env.VITE_GAS_URL;

const STORAGE_KEYS = {
  TOKEN: 'herbarium_session_token',
  USERNAME: 'herbarium_session_username',
  EXPIRES_AT: 'herbarium_session_expires',
  LOCAL_QUERIES: 'herbarium_local_queries_cache'
};

// Listeners for 401 UNAUTHORIZED events
const authListeners = new Set();

export function onUnauthorized(callback) {
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

function notifyUnauthorized() {
  clearSession();
  authListeners.forEach(cb => {
    try {
      cb();
    } catch (err) {
      console.error('Error in unauthorized callback:', err);
    }
  });
}

// Session Helpers (sessionStorage per AGENTS.md)
export function getSession() {
  const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  const username = sessionStorage.getItem(STORAGE_KEYS.USERNAME);
  const expiresAt = sessionStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!token) return null;

  // Check expiration if set
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    clearSession();
    return null;
  }

  return { token, username, expiresAt };
}

export function setSession(token, username, expiresAt) {
  sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
  sessionStorage.setItem(STORAGE_KEYS.USERNAME, username);
  if (expiresAt) {
    sessionStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt);
  }
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.USERNAME);
  sessionStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
}

export function isAuthenticated() {
  return !!getSession();
}

/**
 * Check if GAS URL is configured and valid
 */
function isGasConfigured() {
  return typeof GAS_URL === 'string' && GAS_URL.startsWith('https://script.google.com') && !GAS_URL.includes('AKfycb...');
}

/**
 * Local fallback storage helpers for offline/demo mode and instant cache hydration
 */
export function getLocalQueries() {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_QUERIES);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached local queries:', e);
  }
  return initialSeedQueries || [];
}

export function saveLocalQueries(queries) {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_QUERIES, JSON.stringify(queries));
  } catch (e) {
    console.warn('Failed to save local queries:', e);
  }
}

/**
 * Generic request sender to GAS Web App with timeout protection
 */
async function sendGasRequest(method, url, body, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const options = {
    method,
    signal: controller.signal,
  };

  if (method === 'POST') {
    // text/plain;charset=utf-8 prevents browser CORS preflight (OPTIONS)
    options.headers = {
      'Content-Type': 'text/plain;charset=utf-8',
    };
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const resJson = await response.json();
    if (!resJson.ok) {
      if (resJson.error && resJson.error.code === 'UNAUTHORIZED') {
        notifyUnauthorized();
      }
      const err = new Error(resJson.error?.message || 'Permintaan gagal diproses server');
      err.code = resJson.error?.code || 'SERVER_ERROR';
      throw err;
    }

    return resJson.data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Koneksi ke server Google Apps Script melebihi batas waktu (timeout)');
    }
    throw err;
  }
}

// ============================================================================
// API METHODS
// ============================================================================

/**
 * List all queries
 */
export async function listQueries() {
  if (!isGasConfigured()) {
    console.info('[Herbarium] Menggunakan dataset lokal (VITE_GAS_URL belum dikonfigurasi).');
    return getLocalQueries();
  }

  try {
    const url = `${GAS_URL}?action=list`;
    const data = await sendGasRequest('GET', url);
    // Cache latest for offline resiliency & instant loading
    if (Array.isArray(data)) {
      saveLocalQueries(data);
    }
    return data;
  } catch (err) {
    console.warn('[Herbarium] Gagal mengambil dari GAS Web App, beralih ke cache lokal:', err);
    return getLocalQueries();
  }
}

/**
 * Login
 */
export async function login(username, password) {
  const cleanUsername = (username || '').trim().toLowerCase();

  if (!isGasConfigured()) {
    const err = new Error('Backend Google Apps Script belum terhubung. Harap tambahkan Environment Variable VITE_GAS_URL di pengaturan Netlify (Site configuration > Environment variables).');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const data = await sendGasRequest('POST', GAS_URL, {
    action: 'login',
    username: cleanUsername,
    password,
  });

  setSession(data.token, data.username, data.expiresAt);
  return data;
}

/**
 * Logout
 */
export async function logout() {
  const session = getSession();
  clearSession();

  if (isGasConfigured() && session?.token) {
    try {
      await sendGasRequest('POST', GAS_URL, {
        action: 'logout',
        token: session.token,
      });
    } catch (err) {
      console.warn('Logout notification error:', err);
    }
  }
  return true;
}

/**
 * Create Query
 */
export async function createQuery(payload) {
  const session = getSession();
  if (!session?.token) {
    notifyUnauthorized();
    const err = new Error('Harap masuk terlebih dahulu');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (!isGasConfigured()) {
    const local = getLocalQueries();
    const now = new Date().toISOString();
    const newQuery = {
      id: `qry_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      title: payload.title.trim(),
      category: payload.category.trim(),
      type: payload.type || 'Query',
      sql_query: payload.sql_query,
      created_at: now,
      updated_at: now,
      updated_by: session.username || 'editor',
    };
    local.unshift(newQuery);
    saveLocalQueries(local);
    return newQuery;
  }

  return sendGasRequest('POST', GAS_URL, {
    action: 'create',
    token: session.token,
    payload: {
      title: payload.title,
      category: payload.category,
      type: payload.type,
      sql_query: payload.sql_query,
    },
  });
}

/**
 * Update Query
 */
export async function updateQuery(id, payload) {
  const session = getSession();
  if (!session?.token) {
    notifyUnauthorized();
    const err = new Error('Harap masuk terlebih dahulu');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (!isGasConfigured()) {
    const local = getLocalQueries();
    const idx = local.findIndex(q => q.id === id);
    if (idx === -1) {
      const err = new Error('Query tidak ditemukan');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const updated = {
      ...local[idx],
      title: payload.title.trim(),
      category: payload.category.trim(),
      type: payload.type,
      sql_query: payload.sql_query,
      updated_at: new Date().toISOString(),
      updated_by: session.username || 'editor',
    };
    local[idx] = updated;
    saveLocalQueries(local);
    return updated;
  }

  return sendGasRequest('POST', GAS_URL, {
    action: 'update',
    token: session.token,
    id,
    payload: {
      title: payload.title,
      category: payload.category,
      type: payload.type,
      sql_query: payload.sql_query,
    },
  });
}

/**
 * Delete Query
 */
export async function deleteQuery(id) {
  const session = getSession();
  if (!session?.token) {
    notifyUnauthorized();
    const err = new Error('Harap masuk terlebih dahulu');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (!isGasConfigured()) {
    const local = getLocalQueries();
    const filtered = local.filter(q => q.id !== id);
    saveLocalQueries(filtered);
    return { id };
  }

  return sendGasRequest('POST', GAS_URL, {
    action: 'delete',
    token: session.token,
    id,
  });
}
