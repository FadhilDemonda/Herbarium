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
import initialSeedInstallations from '../../data/installations.json';

const GAS_URL = import.meta.env.VITE_GAS_URL;

const STORAGE_KEYS = {
  TOKEN: 'herbarium_session_token',
  USERNAME: 'herbarium_session_username',
  EXPIRES_AT: 'herbarium_session_expires',
  LOCAL_QUERIES: 'herbarium_local_queries_cache',
  LOCAL_CATEGORIES: 'herbarium_local_categories_cache',
  LOCAL_TYPES: 'herbarium_local_types_cache',
  LOCAL_INSTALLATIONS: 'herbarium_local_installations_cache'
};

/**
 * Infer default hospital installation from query title or SQL text
 */
export function inferInstallationFromQuery(q) {
  if (q && q.installation && String(q.installation).trim()) {
    return String(q.installation).trim();
  }
  const text = `${q?.title || ''} ${q?.sql_query || ''}`.toLowerCase();
  if (text.includes('operasi') || text.includes('bedah') || text.includes('lap_operasi') || text.includes('pisau')) {
    return 'Kamar Operasi (OK)';
  }
  if (text.includes('radiologi') || text.includes('lab') || text.includes('mcu') || text.includes('ro ')) {
    return 'Radiologi & Lab';
  }
  if (text.includes('resep') || text.includes('obat') || text.includes('farmasi') || text.includes('apotek')) {
    return 'Farmasi';
  }
  if (text.includes('igd') || text.includes('gawat darurat') || text.includes('triase')) {
    return 'IGD';
  }
  if (text.includes('inap') || text.includes('ranap') || text.includes('bangsal') || text.includes('kamar') || text.includes('tempat tidur')) {
    return 'Rawat Inap';
  }
  if (text.includes('rajal') || text.includes('rawat jalan') || text.includes('poli') || text.includes('antrol') || text.includes('antrean') || text.includes('kontrol') || text.includes('rujukan') || text.includes('prb')) {
    return 'Rawat Jalan';
  }
  return 'Umum / Semua Unit';
}

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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(q => ({
          ...q,
          installation: inferInstallationFromQuery(q)
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached local queries:', e);
  }
  return (initialSeedQueries || []).map(q => ({
    ...q,
    installation: inferInstallationFromQuery(q)
  }));
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

export function getLocalInstallations() {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_INSTALLATIONS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached local installations:', e);
  }
  return initialSeedInstallations || [];
}

export function saveLocalInstallations(installations) {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_INSTALLATIONS, JSON.stringify(installations));
  } catch (e) {
    console.warn('Failed to save local installations:', e);
  }
}

function getMasterMeta_(entity) {
  if (entity === 'category') {
    return {
      prefix: 'cat_',
      defaultColor: 'terracotta',
      prop: 'category',
      fallbackName: 'Lainnya',
      getList: getLocalCategories,
      saveList: saveLocalCategories,
    };
  }
  if (entity === 'installation') {
    return {
      prefix: 'ins_',
      defaultColor: 'teal',
      prop: 'installation',
      fallbackName: 'Umum / Semua Unit',
      getList: getLocalInstallations,
      saveList: saveLocalInstallations,
    };
  }
  return {
    prefix: 'typ_',
    defaultColor: 'neutral',
    prop: 'type',
    fallbackName: 'Query',
    getList: getLocalTypes,
    saveList: saveLocalTypes,
  };
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
      const normalized = data.map(q => ({
        ...q,
        installation: inferInstallationFromQuery(q)
      }));
      saveLocalQueries(normalized);
      return normalized;
    }
    return data;
  } catch (err) {
    console.warn('[Herbarium] Gagal mengambil query dari GAS, beralih ke cache lokal:', err);
    return getLocalQueries();
  }
}

/**
 * List all master data (Categories, Types & Installations)
 */
export async function listMasters() {
  if (!isGasConfigured()) {
    return {
      categories: getLocalCategories(),
      types: getLocalTypes(),
      installations: getLocalInstallations(),
    };
  }

  try {
    const url = `${GAS_URL}?action=masters`;
    const data = await sendGasRequest('GET', url);
    if (data && Array.isArray(data.categories) && Array.isArray(data.types)) {
      saveLocalCategories(data.categories);
      saveLocalTypes(data.types);
      const instList = Array.isArray(data.installations) && data.installations.length > 0
        ? data.installations
        : getLocalInstallations();
      saveLocalInstallations(instList);
      return {
        categories: data.categories,
        types: data.types,
        installations: instList,
      };
    }
    return {
      categories: getLocalCategories(),
      types: getLocalTypes(),
      installations: getLocalInstallations(),
    };
  } catch (err) {
    console.warn('[Herbarium] Gagal mengambil master dari GAS, beralih ke cache lokal:', err);
    return {
      categories: getLocalCategories(),
      types: getLocalTypes(),
      installations: getLocalInstallations(),
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

  const catName = payload.category.trim();
  const typeName = (payload.type || 'Query').trim();
  const instName = (payload.installation || '').trim() || inferInstallationFromQuery(payload);

  if (!isGasConfigured()) {
    const local = getLocalQueries();
    const now = new Date().toISOString();

    const newQuery = {
      id: `qry_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      title: payload.title.trim(),
      category: catName,
      type: typeName,
      installation: instName,
      sql_query: payload.sql_query,
      created_at: now,
      updated_at: now,
      updated_by: session.username || 'editor',
    };
    local.unshift(newQuery);
    saveLocalQueries(local);

    // Auto-register to local masters if missing
    autoRegisterLocalMaster_('category', catName, session.username);
    autoRegisterLocalMaster_('type', typeName, session.username);
    autoRegisterLocalMaster_('installation', instName, session.username);

    return newQuery;
  }

  const created = await sendGasRequest('POST', GAS_URL, {
    action: 'create',
    token: session.token,
    payload: {
      title: payload.title,
      category: payload.category,
      type: payload.type,
      installation: instName,
      sql_query: payload.sql_query,
    },
  });

  return {
    ...created,
    installation: created?.installation || instName,
  };
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

  const catName = payload.category.trim();
  const typeName = (payload.type || 'Query').trim();
  const instName = (payload.installation || '').trim() || inferInstallationFromQuery(payload);

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
      category: catName,
      type: typeName,
      installation: instName,
      sql_query: payload.sql_query,
      updated_at: new Date().toISOString(),
      updated_by: session.username || 'editor',
    };
    local[idx] = updated;
    saveLocalQueries(local);

    autoRegisterLocalMaster_('category', catName, session.username);
    autoRegisterLocalMaster_('type', typeName, session.username);
    autoRegisterLocalMaster_('installation', instName, session.username);

    return updated;
  }

  const updated = await sendGasRequest('POST', GAS_URL, {
    action: 'update',
    token: session.token,
    id,
    payload: {
      title: payload.title,
      category: payload.category,
      type: payload.type,
      installation: instName,
      sql_query: payload.sql_query,
    },
  });

  return {
    ...updated,
    installation: updated?.installation || instName,
  };
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
// API METHODS - MASTER DATA CRUD (CATEGORIES, TYPES & INSTALLATIONS)
// ============================================================================

/**
 * Create Master (Category, Type, or Installation)
 * @param {'category' | 'type' | 'installation'} entity
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
    const meta = getMasterMeta_(entity);
    const list = meta.getList();
    const name = (payload.name || '').trim();
    if (!name) throw new Error('Nama wajib diisi');

    if (list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Nama ${name} sudah digunakan`);
    }

    const now = new Date().toISOString();
    const newItem = {
      id: `${meta.prefix}${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      description: (payload.description || '').trim(),
      color: payload.color || meta.defaultColor,
      sort_order: Number.isInteger(payload.sort_order) ? payload.sort_order : list.length + 1,
      created_at: now,
      updated_at: now,
      updated_by: session.username || 'editor',
    };

    list.push(newItem);
    meta.saveList(list);

    return newItem;
  }

  return sendGasRequest('POST', GAS_URL, {
    action: `create_${entity}`,
    token: session.token,
    payload,
  });
}

/**
 * Update Master (Category, Type, or Installation)
 * Performs cascade update on queries if name changed
 * @param {'category' | 'type' | 'installation'} entity
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
    const meta = getMasterMeta_(entity);
    const list = meta.getList();
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
    meta.saveList(list);

    // CASCADE UPDATE in local queries
    let cascadeCount = 0;
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      const queries = getLocalQueries();
      const prop = meta.prop;
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
 * Delete Master (Category, Type, or Installation)
 * Performs reassign on queries to fallback ('Lainnya' / 'Query' / 'Umum / Semua Unit')
 * @param {'category' | 'type' | 'installation'} entity
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

  const meta = getMasterMeta_(entity);
  const fallbackName = meta.fallbackName;

  if (!isGasConfigured()) {
    const list = meta.getList();
    const target = list.find(item => item.id === id);
    if (!target) {
      throw new Error('Item master tidak ditemukan');
    }

    const filtered = list.filter(item => item.id !== id);

    // Ensure fallback exists
    if (!filtered.some(item => item.name.toLowerCase() === fallbackName.toLowerCase())) {
      filtered.push({
        id: `${meta.prefix}fallback`,
        name: fallbackName,
        description: `Master ${entity} bawaan`,
        color: 'neutral',
        sort_order: 99,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      });
    }

    meta.saveList(filtered);

    // REASSIGN in local queries
    let reassignedCount = 0;
    const queries = getLocalQueries();
    const prop = meta.prop;
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
  const meta = getMasterMeta_(entity);
  const list = meta.getList();
  if (list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
    return;
  }
  const now = new Date().toISOString();
  list.push({
    id: `${meta.prefix}${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    description: '',
    color: meta.defaultColor,
    sort_order: list.length + 1,
    created_at: now,
    updated_at: now,
    updated_by: username || 'editor',
  });
  meta.saveList(list);
}
