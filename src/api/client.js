/**
 * Herbarium API Client
 * Centralized API service for Google Apps Script Web App
 * Handles:
 * - Public list querying (queries & masters)
 * - Session storage management for auth tokens
 * - CORS-preflight avoidance using Content-Type: text/plain;charset=utf-8
 * - Standard envelope unwrapping { ok, data, error }
 * - UNAUTHORIZED event dispatcher
 * - Local fallback mode & instant cache hydration for queries, categories, and types
 */

import initialSeedQueries from '../../data/queries.json';
import initialSeedCategories from '../../data/categories.json';
import initialSeedTypes from '../../data/types.json';

const GAS_URL = import.meta.env.VITE_GAS_URL;

const STORAGE_KEYS = {
  TOKEN: 'herbarium_session_token',
  USERNAME: 'herbarium_session_username',
  EXPIRES_AT: 'herbarium_session_expires',
  LOCAL_QUERIES: 'herbarium_local_queries_cache',
  LOCAL_CATEGORIES: 'herbarium_local_categories_cache',
  LOCAL_TYPES: 'herbarium_local_types_cache'
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

export function getLocalCategories() {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_CATEGORIES);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached local categories:', e);
  }
  return initialSeedCategories || [];
}

export function saveLocalCategories(categories) {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.warn('Failed to save local categories:', e);
  }
}

export function getLocalTypes() {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_TYPES);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached local types:', e);
  }
  return initialSeedTypes || [];
}

export function saveLocalTypes(types) {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_TYPES, JSON.stringify(types));
  } catch (e) {
    console.warn('Failed to save local types:', e);
  }
}

/**
 * Generic request sender to GAS Web App with timeout protection
 */
async function sendGasRequest(method, url, body, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const options = {
    method,
    signal: controller.signal,
    redirect: 'follow',
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
// API METHODS - QUERIES & AUTH
// ============================================================================

/**
 * List all queries
 */
export async function listQueries() {
  if (!isGasConfigured()) {
    return getLocalQueries();
  }

  try {
    const url = `${GAS_URL}?action=list`;
    const data = await sendGasRequest('GET', url);
    if (Array.isArray(data)) {
      saveLocalQueries(data);
    }
    return data;
  } catch (err) {
    console.warn('[Herbarium] Gagal mengambil query dari GAS, beralih ke cache lokal:', err);
    return getLocalQueries();
  }
}

/**
 * List all master data (Categories & Types)
 */
export async function listMasters() {
  if (!isGasConfigured()) {
    return {
      categories: getLocalCategories(),
      types: getLocalTypes()
    };
  }

  try {
    const url = `${GAS_URL}?action=masters`;
    const data = await sendGasRequest('GET', url);
    if (data && Array.isArray(data.categories) && Array.isArray(data.types)) {
      saveLocalCategories(data.categories);
      saveLocalTypes(data.types);
    }
    return data;
  } catch (err) {
    console.warn('[Herbarium] Gagal mengambil master dari GAS, beralih ke cache lokal:', err);
    return {
      categories: getLocalCategories(),
      types: getLocalTypes()
    };
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
    const catName = payload.category.trim();
    const typeName = (payload.type || 'Query').trim();

    const newQuery = {
      id: `qry_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      title: payload.title.trim(),
      category: catName,
      type: typeName,
      sql_query: payload.sql_query,
      created_at: now,
      updated_at: now,
      updated_by: session.username || 'editor',
    };
    local.unshift(newQuery);
    saveLocalQueries(local);

    // Auto-register to local categories if missing
    autoRegisterLocalMaster_('category', catName, session.username);
    autoRegisterLocalMaster_('type', typeName, session.username);

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
    const catName = payload.category.trim();
    const typeName = (payload.type || 'Query').trim();

    const updated = {
      ...local[idx],
      title: payload.title.trim(),
      category: catName,
      type: typeName,
      sql_query: payload.sql_query,
      updated_at: new Date().toISOString(),
      updated_by: session.username || 'editor',
    };
    local[idx] = updated;
    saveLocalQueries(local);

    autoRegisterLocalMaster_('category', catName, session.username);
    autoRegisterLocalMaster_('type', typeName, session.username);

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

// ============================================================================
// API METHODS - MASTER DATA CRUD (CATEGORIES & TYPES)
// ============================================================================

/**
 * Create Master (Category or Type)
 * @param {'category' | 'type'} entity
 * @param {{ name: string, description?: string, color?: string, sort_order?: number }} payload
 */
export async function createMaster(entity, payload) {
  const session = getSession();
  if (!session?.token) {
    notifyUnauthorized();
    const err = new Error('Harap masuk terlebih dahulu');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (!isGasConfigured()) {
    const list = entity === 'category' ? getLocalCategories() : getLocalTypes();
    const name = (payload.name || '').trim();
    if (!name) throw new Error('Nama wajib diisi');

    if (list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Nama ${name} sudah digunakan`);
    }

    const now = new Date().toISOString();
    const newItem = {
      id: `${entity === 'category' ? 'cat_' : 'typ_'}${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      description: (payload.description || '').trim(),
      color: payload.color || (entity === 'category' ? 'terracotta' : 'neutral'),
      sort_order: Number.isInteger(payload.sort_order) ? payload.sort_order : list.length + 1,
      created_at: now,
      updated_at: now,
      updated_by: session.username || 'editor',
    };

    list.push(newItem);
    if (entity === 'category') saveLocalCategories(list);
    else saveLocalTypes(list);

    return newItem;
  }

  return sendGasRequest('POST', GAS_URL, {
    action: `create_${entity}`,
    token: session.token,
    payload,
  });
}

/**
 * Update Master (Category or Type)
 * Performs cascade update on queries if name changed
 * @param {'category' | 'type'} entity
 * @param {string} id
 * @param {{ name: string, description?: string, color?: string, sort_order?: number }} payload
 */
export async function updateMaster(entity, id, payload) {
  const session = getSession();
  if (!session?.token) {
    notifyUnauthorized();
    const err = new Error('Harap masuk terlebih dahulu');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (!isGasConfigured()) {
    const list = entity === 'category' ? getLocalCategories() : getLocalTypes();
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error('Item master tidak ditemukan');
    }

    const oldName = list[idx].name;
    const newName = (payload.name || '').trim();
    if (!newName) throw new Error('Nama wajib diisi');

    if (list.some(item => item.id !== id && item.name.toLowerCase() === newName.toLowerCase())) {
      throw new Error(`Nama ${newName} sudah digunakan item lain`);
    }

    const updatedItem = {
      ...list[idx],
      name: newName,
      description: payload.description !== undefined ? payload.description.trim() : list[idx].description,
      color: payload.color || list[idx].color,
      sort_order: Number.isInteger(payload.sort_order) ? payload.sort_order : list[idx].sort_order,
      updated_at: new Date().toISOString(),
      updated_by: session.username || 'editor',
    };

    list[idx] = updatedItem;
    if (entity === 'category') saveLocalCategories(list);
    else saveLocalTypes(list);

    // CASCADE UPDATE in local queries
    let cascadeCount = 0;
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      const queries = getLocalQueries();
      const prop = entity === 'category' ? 'category' : 'type';
      queries.forEach(q => {
        if ((q[prop] || '').toLowerCase() === oldName.toLowerCase()) {
          q[prop] = newName;
          cascadeCount++;
        }
      });
      if (cascadeCount > 0) {
        saveLocalQueries(queries);
      }
    }

    return { item: updatedItem, cascadeCount };
  }

  return sendGasRequest('POST', GAS_URL, {
    action: `update_${entity}`,
    token: session.token,
    id,
    payload,
  });
}

/**
 * Delete Master (Category or Type)
 * Performs reassign on queries to fallback ('Lainnya' / 'Query')
 * @param {'category' | 'type'} entity
 * @param {string} id
 */
export async function deleteMaster(entity, id) {
  const session = getSession();
  if (!session?.token) {
    notifyUnauthorized();
    const err = new Error('Harap masuk terlebih dahulu');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const fallbackName = entity === 'category' ? 'Lainnya' : 'Query';

  if (!isGasConfigured()) {
    const list = entity === 'category' ? getLocalCategories() : getLocalTypes();
    const target = list.find(item => item.id === id);
    if (!target) {
      throw new Error('Item master tidak ditemukan');
    }

    const filtered = list.filter(item => item.id !== id);

    // Ensure fallback exists
    if (!filtered.some(item => item.name.toLowerCase() === fallbackName.toLowerCase())) {
      filtered.push({
        id: `${entity === 'category' ? 'cat_' : 'typ_'}fallback`,
        name: fallbackName,
        description: `Master ${entity} bawaan`,
        color: 'neutral',
        sort_order: 99,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      });
    }

    if (entity === 'category') saveLocalCategories(filtered);
    else saveLocalTypes(filtered);

    // REASSIGN in local queries
    let reassignedCount = 0;
    const queries = getLocalQueries();
    const prop = entity === 'category' ? 'category' : 'type';
    queries.forEach(q => {
      if ((q[prop] || '').toLowerCase() === target.name.toLowerCase()) {
        q[prop] = fallbackName;
        reassignedCount++;
      }
    });
    if (reassignedCount > 0) {
      saveLocalQueries(queries);
    }

    return { id, reassignedCount, reassignedTo: fallbackName };
  }

  return sendGasRequest('POST', GAS_URL, {
    action: `delete_${entity}`,
    token: session.token,
    id,
  });
}

/**
 * Helper to auto-register a master item in local storage if missing
 */
function autoRegisterLocalMaster_(entity, name, username) {
  if (!name) return;
  const list = entity === 'category' ? getLocalCategories() : getLocalTypes();
  if (list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
    return;
  }
  const now = new Date().toISOString();
  list.push({
    id: `${entity === 'category' ? 'cat_' : 'typ_'}${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    description: '',
    color: entity === 'category' ? 'terracotta' : 'neutral',
    sort_order: list.length + 1,
    created_at: now,
    updated_at: now,
    updated_by: username || 'editor',
  });
  if (entity === 'category') saveLocalCategories(list);
  else saveLocalTypes(list);
}
