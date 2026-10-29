/**
 * Herbarium - Google Apps Script Backend (Code.gs)
 * Pustaka Query Superset & Master Data (Kategori & Jenis)
 *
 * Requirements:
 * - Single Code.gs file
 * - Standard JSON envelope: { ok: boolean, data?: any, error?: { code, message } }
 * - HTTP 200 always (ContentService JSON)
 * - Session token in CacheService (6 hours TTL)
 * - Rate limit: 5 failed logins locks account for 15 minutes
 * - Concurrency lock with LockService
 * - Dynamic column lookup by header name
 * - Plain text formatting (@) on sql_query
 * - Master Data management for Categories and Types with Cascade Update & Reassign on Delete
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
var CONFIG = {
  SHEET_QUERIES: 'queries',
  SHEET_USERS: 'users',
  SHEET_CATEGORIES: 'categories',
  SHEET_TYPES: 'types',
  SESSION_TTL_SEC: 6 * 60 * 60, // 6 hours
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_TTL_SEC: 15 * 60,     // 15 minutes
  LOCK_TIMEOUT_MS: 30000,       // 30 seconds
};

// ============================================================================
// ROUTERS
// ============================================================================

/**
 * Handle GET requests
 * GET ?action=list
 * GET ?action=masters
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'list';
    if (action === 'list') {
      return handleList();
    }
    if (action === 'masters') {
      return handleListMasters();
    }
    return json_({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Action not found: ' + action }
    });
  } catch (err) {
    return json_({
      ok: false,
      error: { code: 'SERVER_ERROR', message: err.toString() }
    });
  }
}

/**
 * Handle POST requests
 * Expected JSON body with action:
 * - login | logout
 * - create | update | delete (queries)
 * - create_category | update_category | delete_category
 * - create_type | update_type | delete_type
 * Content-Type sent by client: text/plain;charset=utf-8 to avoid CORS preflight
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing request body' }
      });
    }

    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return json_({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON payload' }
      });
    }

    var action = body.action;
    switch (action) {
      case 'login':
        return handleLogin(body);
      case 'logout':
        return handleLogout(body);

      // Query CRUD
      case 'create':
        return handleCreate(body);
      case 'update':
        return handleUpdate(body);
      case 'delete':
        return handleDelete(body);

      // Master Category CRUD
      case 'create_category':
        return handleCreateMaster(body, 'category');
      case 'update_category':
        return handleUpdateMaster(body, 'category');
      case 'delete_category':
        return handleDeleteMaster(body, 'category');

      // Master Type CRUD
      case 'create_type':
        return handleCreateMaster(body, 'type');
      case 'update_type':
        return handleUpdateMaster(body, 'type');
      case 'delete_type':
        return handleDeleteMaster(body, 'type');

      default:
        return json_({
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Unknown action: ' + action }
        });
    }
  } catch (err) {
    return json_({
      ok: false,
      error: { code: 'SERVER_ERROR', message: err.toString() }
    });
  }
}

// ============================================================================
// QUERY HANDLERS
// ============================================================================

/**
 * List all queries (Public read)
 */
function handleList() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('QUERIES_LIST_DATA');
  if (cached) {
    try {
      return json_({ ok: true, data: JSON.parse(cached) });
    } catch (e) {}
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
  if (!sheet) {
    return json_({ ok: true, data: [] });
  }

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return json_({ ok: true, data: [] });
  }

  var headers = values[0].map(function (h) {
    return String(h).trim();
  });
  var headerMap = getHeaderMap(headers);

  var requiredCols = ['id', 'title', 'category', 'type', 'sql_query', 'created_at', 'updated_at', 'updated_by'];
  for (var r = 0; r < requiredCols.length; r++) {
    if (headerMap[requiredCols[r]] === undefined) {
      return json_({
        ok: false,
        error: { code: 'SERVER_ERROR', message: 'Missing column in queries sheet: ' + requiredCols[r] }
      });
    }
  }

  var data = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var idVal = row[headerMap['id']];
    if (!idVal) continue; // skip blank rows

    data.push({
      id: String(idVal),
      title: String(row[headerMap['title']] || ''),
      category: String(row[headerMap['category']] || ''),
      type: String(row[headerMap['type']] || 'Query'),
      sql_query: String(row[headerMap['sql_query']] || ''),
      created_at: formatIso(row[headerMap['created_at']]),
      updated_at: formatIso(row[headerMap['updated_at']]),
      updated_by: String(row[headerMap['updated_by']] || '')
    });
  }

  try {
    cache.put('QUERIES_LIST_DATA', JSON.stringify(data), 21600);
  } catch (e) {}

  return json_({ ok: true, data: data });
}

/**
 * Login user
 * Authenticates against sheet 'users', applies rate limiting
 */
function handleLogin(body) {
  var username = (body.username || '').toString().trim().toLowerCase();
  var password = (body.password || '').toString();

  if (!username || !password) {
    return json_({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' }
    });
  }

  var cache = CacheService.getScriptCache();
  var rateKey = 'failed_login_' + username;
  var failedCount = parseInt(cache.get(rateKey) || '0', 10);

  if (failedCount >= CONFIG.MAX_FAILED_ATTEMPTS) {
    return json_({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan gagal. Silakan coba lagi setelah 15 menit.' }
    });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet) {
    return json_({
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Users sheet is not configured' }
    });
  }

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return json_({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password salah' }
    });
  }

  var headers = values[0].map(function (h) {
    return String(h).trim();
  });
  var headerMap = getHeaderMap(headers);

  var uCol = headerMap['username'];
  var pCol = headerMap['password'];
  var aCol = headerMap['active'];

  if (uCol === undefined || pCol === undefined || aCol === undefined) {
    return json_({
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Sheet users column configuration error' }
    });
  }

  var userFound = false;
  var userActive = false;

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowUser = String(row[uCol] || '').trim().toLowerCase();
    var rowPass = String(row[pCol] || '');
    var rowActive = row[aCol];

    if (rowUser === username) {
      userFound = true;
      var isActiveBool = (rowActive === true || String(rowActive).toUpperCase() === 'TRUE');
      if (isActiveBool && rowPass === password) {
        userActive = true;
        break;
      }
    }
  }

  if (!userFound || !userActive) {
    var newFailed = failedCount + 1;
    cache.put(rateKey, String(newFailed), CONFIG.LOCKOUT_TTL_SEC);
    return json_({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password salah' }
    });
  }

  // Login success -> reset rate limiter
  cache.remove(rateKey);

  // Generate session token
  var token = 'tok_' + Utilities.getUuid().replace(/-/g, '') + Utilities.base64EncodeWebSafe(Math.random().toString());
  var now = new Date();
  var expiresAt = new Date(now.getTime() + CONFIG.SESSION_TTL_SEC * 1000).toISOString();

  var sessionData = JSON.stringify({
    username: username,
    createdAt: now.toISOString(),
    expiresAt: expiresAt
  });

  cache.put('session_' + token, sessionData, CONFIG.SESSION_TTL_SEC);

  return json_({
    ok: true,
    data: {
      token: token,
      username: username,
      expiresAt: expiresAt
    }
  });
}

/**
 * Logout user
 */
function handleLogout(body) {
  var token = body.token;
  if (token) {
    var cache = CacheService.getScriptCache();
    cache.remove('session_' + token);
  }
  return json_({ ok: true, data: {} });
}

/**
 * Create a new query
 */
function handleCreate(body) {
  var auth = requireAuth(body.token);
  if (!auth.ok) return json_(auth);

  var payload = body.payload;
  var valid = validatePayload(payload);
  if (!valid.ok) return json_(valid);

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
  } catch (e) {
    return json_({
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Gagal memperoleh lock konkurensi: server sedang sibuk' }
    });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_QUERIES);
      initQueriesHeader(sheet);
    }

    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h).trim(); });
    var headerMap = getHeaderMap(headers);

    var now = new Date().toISOString();
    var id = 'qry_' + new Date().getTime().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

    var catName = payload.category.trim();
    var typeName = payload.type.trim();

    // Auto-register category & type to master sheets if not yet present (fail-safe)
    var masterChanged = false;
    try {
      masterChanged = autoRegisterMasterIfNeeded_(ss, catName, typeName, auth.username);
    } catch (e) {
      Logger.log('Auto-register master warning on create: ' + e);
    }

    var newRow = [];
    for (var c = 0; c < headers.length; c++) {
      newRow.push('');
    }

    newRow[headerMap['id']] = id;
    newRow[headerMap['title']] = payload.title.trim();
    newRow[headerMap['category']] = catName;
    newRow[headerMap['type']] = typeName;
    newRow[headerMap['sql_query']] = payload.sql_query;
    newRow[headerMap['created_at']] = now;
    newRow[headerMap['updated_at']] = now;
    newRow[headerMap['updated_by']] = auth.username;

    sheet.appendRow(newRow);

    // Invalidate caches
    CacheService.getScriptCache().remove('QUERIES_LIST_DATA');
    if (masterChanged) {
      CacheService.getScriptCache().remove('MASTERS_LIST_DATA');
    }

    // Format sql_query column to plain text (@) to prevent formula injection
    var lastRow = sheet.getLastRow();
    var sqlCol = headerMap['sql_query'] + 1;
    sheet.getRange(lastRow, sqlCol).setNumberFormat('@');

    return json_({
      ok: true,
      data: {
        id: id,
        title: payload.title.trim(),
        category: catName,
        type: typeName,
        sql_query: payload.sql_query,
        created_at: now,
        updated_at: now,
        updated_by: auth.username
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update an existing query
 */
function handleUpdate(body) {
  var auth = requireAuth(body.token);
  if (!auth.ok) return json_(auth);

  var id = (body.id || '').toString().trim();
  if (!id) {
    return json_({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'ID query wajib disertakan' }
    });
  }

  var payload = body.payload;
  var valid = validatePayload(payload);
  if (!valid.ok) return json_(valid);

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
  } catch (e) {
    return json_({
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Gagal memperoleh lock konkurensi: server sedang sibuk' }
    });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
    if (!sheet) {
      return json_({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Sheet queries tidak ditemukan' }
      });
    }

    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h).trim(); });
    var headerMap = getHeaderMap(headers);
    var idCol = headerMap['id'];

    var targetRowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === id) {
        targetRowIndex = i + 1; // 1-indexed in Sheets
        break;
      }
    }

    if (targetRowIndex === -1) {
      return json_({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Query dengan ID ' + id + ' tidak ditemukan' }
      });
    }

    var catName = payload.category.trim();
    var typeName = payload.type.trim();

    // Auto-register category & type to master sheets if not yet present (fail-safe)
    var masterChanged = false;
    try {
      masterChanged = autoRegisterMasterIfNeeded_(ss, catName, typeName, auth.username);
    } catch (e) {
      Logger.log('Auto-register master warning: ' + e);
    }

    var now = new Date().toISOString();
    var targetRow = values[targetRowIndex - 1];
    var created_at = formatIso(targetRow[headerMap['created_at']]);

    targetRow[headerMap['title']] = payload.title.trim();
    targetRow[headerMap['category']] = catName;
    targetRow[headerMap['type']] = typeName;
    targetRow[headerMap['sql_query']] = payload.sql_query;
    targetRow[headerMap['updated_at']] = now;
    targetRow[headerMap['updated_by']] = auth.username;

    // Batch update single row for optimal speed (<100ms)
    sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([targetRow]);

    var sqlCol = headerMap['sql_query'] + 1;
    sheet.getRange(targetRowIndex, sqlCol).setNumberFormat('@');

    // Invalidate caches
    CacheService.getScriptCache().remove('QUERIES_LIST_DATA');
    if (masterChanged) {
      CacheService.getScriptCache().remove('MASTERS_LIST_DATA');
    }

    return json_({
      ok: true,
      data: {
        id: id,
        title: payload.title.trim(),
        category: catName,
        type: typeName,
        sql_query: payload.sql_query,
        created_at: created_at,
        updated_at: now,
        updated_by: auth.username
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete a query
 */
function handleDelete(body) {
  var auth = requireAuth(body.token);
  if (!auth.ok) return json_(auth);

  var id = (body.id || '').toString().trim();
  if (!id) {
    return json_({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'ID query wajib disertakan' }
    });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
  } catch (e) {
    return json_({
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Gagal memperoleh lock konkurensi: server sedang sibuk' }
    });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
    if (!sheet) {
      return json_({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Sheet queries tidak ditemukan' }
      });
    }

    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h).trim(); });
    var headerMap = getHeaderMap(headers);
    var idCol = headerMap['id'];

    var targetRowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === id) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return json_({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Query dengan ID ' + id + ' tidak ditemukan' }
      });
    }

    sheet.deleteRow(targetRowIndex);

    // Invalidate cached query list
    CacheService.getScriptCache().remove('QUERIES_LIST_DATA');

    return json_({
      ok: true,
      data: { id: id }
    });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// MASTER DATA (CATEGORIES & TYPES) HANDLERS
// ============================================================================

/**
 * List all master categories and types
 * GET ?action=masters
 */
function handleListMasters() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('MASTERS_LIST_DATA');
  if (cached) {
    try {
      return json_({ ok: true, data: JSON.parse(cached) });
    } catch (e) {}
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureMasterSheets_(ss);

  var catData = readMasterSheet_(ss, CONFIG.SHEET_CATEGORIES, 'terracotta');
  var typData = readMasterSheet_(ss, CONFIG.SHEET_TYPES, 'neutral');

  var result = {
    categories: catData,
    types: typData
  };

  try {
    cache.put('MASTERS_LIST_DATA', JSON.stringify(result), 21600);
  } catch (e) {}

  return json_({ ok: true, data: result });
}

/**
 * Create a new master category or type
 */
function handleCreateMaster(body, entity) {
  var auth = requireAuth(body.token);
  if (!auth.ok) return json_(auth);

  var payload = body.payload;
  if (!payload || typeof payload !== 'object') {
    return json_({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Payload tidak ditemukan' } });
  }

  var name = (payload.name || '').toString().trim();
  if (!name) {
    return json_({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Nama wajib diisi' } });
  }
  if (name.length > 100) {
    return json_({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Nama maksimal 100 karakter' } });
  }

  var sheetName = entity === 'category' ? CONFIG.SHEET_CATEGORIES : CONFIG.SHEET_TYPES;
  var defaultColor = entity === 'category' ? 'terracotta' : 'neutral';
  var prefix = entity === 'category' ? 'cat_' : 'typ_';

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
  } catch (e) {
    return json_({ ok: false, error: { code: 'SERVER_ERROR', message: 'Server sedang sibuk' } });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureMasterSheets_(ss);
    var sheet = ss.getSheetByName(sheetName);

    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h).trim(); });
    var headerMap = getHeaderMap(headers);

    // Duplicate check (case-insensitive)
    for (var i = 1; i < values.length; i++) {
      var rowName = String(values[i][headerMap['name']] || '').trim().toLowerCase();
      if (rowName === name.toLowerCase()) {
        return json_({
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Nama sudah ada dalam master ' + entity }
        });
      }
    }

    var now = new Date().toISOString();
    var id = prefix + new Date().getTime().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    var description = (payload.description || '').toString().trim();
    var color = (payload.color || defaultColor).toString().trim();
    var sortOrder = parseInt(payload.sort_order, 10);
    if (isNaN(sortOrder)) sortOrder = values.length; // auto-order to bottom

    var newRow = [];
    for (var c = 0; c < headers.length; c++) newRow.push('');

    newRow[headerMap['id']] = id;
    newRow[headerMap['name']] = name;
    newRow[headerMap['description']] = description;
    newRow[headerMap['color']] = color;
    newRow[headerMap['sort_order']] = sortOrder;
    newRow[headerMap['created_at']] = now;
    newRow[headerMap['updated_at']] = now;
    newRow[headerMap['updated_by']] = auth.username;

    sheet.appendRow(newRow);

    CacheService.getScriptCache().remove('MASTERS_LIST_DATA');

    return json_({
      ok: true,
      data: {
        id: id,
        name: name,
        description: description,
        color: color,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
        updated_by: auth.username
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update an existing master category or type
 * Includes cascade update to sheet 'queries' if name has changed
 */
function handleUpdateMaster(body, entity) {
  var auth = requireAuth(body.token);
  if (!auth.ok) return json_(auth);

  var id = (body.id || '').toString().trim();
  if (!id) {
    return json_({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'ID master wajib disertakan' } });
  }

  var payload = body.payload;
  if (!payload || typeof payload !== 'object') {
    return json_({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Payload tidak ditemukan' } });
  }

  var newName = (payload.name || '').toString().trim();
  if (!newName) {
    return json_({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Nama wajib diisi' } });
  }

  var sheetName = entity === 'category' ? CONFIG.SHEET_CATEGORIES : CONFIG.SHEET_TYPES;
  var queryColumnName = entity === 'category' ? 'category' : 'type';

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
  } catch (e) {
    return json_({ ok: false, error: { code: 'SERVER_ERROR', message: 'Server sedang sibuk' } });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureMasterSheets_(ss);
    var sheet = ss.getSheetByName(sheetName);

    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h).trim(); });
    var headerMap = getHeaderMap(headers);

    var targetRowIndex = -1;
    var oldName = '';
    var createdAt = '';

    for (var i = 1; i < values.length; i++) {
      var rowId = String(values[i][headerMap['id']] || '').trim();
      var rowName = String(values[i][headerMap['name']] || '').trim();

      if (rowId === id) {
        targetRowIndex = i + 1;
        oldName = rowName;
        createdAt = formatIso(values[i][headerMap['created_at']]);
      } else if (rowName.toLowerCase() === newName.toLowerCase()) {
        return json_({
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Nama ' + newName + ' sudah digunakan item lain' }
        });
      }
    }

    if (targetRowIndex === -1) {
      return json_({ ok: false, error: { code: 'NOT_FOUND', message: 'Item master tidak ditemukan' } });
    }

    var now = new Date().toISOString();
    var description = (payload.description !== undefined ? payload.description : '').toString().trim();
    var color = (payload.color || (entity === 'category' ? 'terracotta' : 'neutral')).toString().trim();
    var sortOrder = parseInt(payload.sort_order, 10);
    if (isNaN(sortOrder)) sortOrder = 0;

    sheet.getRange(targetRowIndex, headerMap['name'] + 1).setValue(newName);
    sheet.getRange(targetRowIndex, headerMap['description'] + 1).setValue(description);
    sheet.getRange(targetRowIndex, headerMap['color'] + 1).setValue(color);
    sheet.getRange(targetRowIndex, headerMap['sort_order'] + 1).setValue(sortOrder);
    sheet.getRange(targetRowIndex, headerMap['updated_at'] + 1).setValue(now);
    sheet.getRange(targetRowIndex, headerMap['updated_by'] + 1).setValue(auth.username);

    // CASCADE UPDATE in sheet queries if name changed
    var updatedQueriesCount = 0;
    if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      updatedQueriesCount = cascadeRenameInQueries_(ss, queryColumnName, oldName, newName);
      CacheService.getScriptCache().remove('QUERIES_LIST_DATA');
    }

    CacheService.getScriptCache().remove('MASTERS_LIST_DATA');

    return json_({
      ok: true,
      data: {
        item: {
          id: id,
          name: newName,
          description: description,
          color: color,
          sort_order: sortOrder,
          created_at: createdAt,
          updated_at: now,
          updated_by: auth.username
        },
        cascadeCount: updatedQueriesCount
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete a master category or type
 * Includes reassigning any referencing queries in sheet 'queries' to default ('Lainnya' / 'Query')
 */
function handleDeleteMaster(body, entity) {
  var auth = requireAuth(body.token);
  if (!auth.ok) return json_(auth);

  var id = (body.id || '').toString().trim();
  if (!id) {
    return json_({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'ID master wajib disertakan' } });
  }

  var sheetName = entity === 'category' ? CONFIG.SHEET_CATEGORIES : CONFIG.SHEET_TYPES;
  var queryColumnName = entity === 'category' ? 'category' : 'type';
  var fallbackTargetName = entity === 'category' ? 'Lainnya' : 'Query';

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
  } catch (e) {
    return json_({ ok: false, error: { code: 'SERVER_ERROR', message: 'Server sedang sibuk' } });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureMasterSheets_(ss);
    var sheet = ss.getSheetByName(sheetName);

    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h).trim(); });
    var headerMap = getHeaderMap(headers);

    var targetRowIndex = -1;
    var targetName = '';

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][headerMap['id']] || '').trim() === id) {
        targetRowIndex = i + 1;
        targetName = String(values[i][headerMap['name']] || '').trim();
        break;
      }
    }

    if (targetRowIndex === -1) {
      return json_({ ok: false, error: { code: 'NOT_FOUND', message: 'Item master tidak ditemukan' } });
    }

    // Do not delete fallback target itself if it is the only one
    if (targetName.toLowerCase() === fallbackTargetName.toLowerCase() && values.length <= 2) {
      return json_({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Tidak dapat menghapus master default utama: ' + fallbackTargetName }
      });
    }

    sheet.deleteRow(targetRowIndex);

    // REASSIGN in sheet queries to fallback target
    var reassignedQueriesCount = cascadeRenameInQueries_(ss, queryColumnName, targetName, fallbackTargetName);

    // Ensure fallback target exists in master sheet
    ensureFallbackMasterExists_(ss, entity, fallbackTargetName);

    if (reassignedQueriesCount > 0) {
      CacheService.getScriptCache().remove('QUERIES_LIST_DATA');
    }
    CacheService.getScriptCache().remove('MASTERS_LIST_DATA');

    return json_({
      ok: true,
      data: {
        id: id,
        reassignedCount: reassignedQueriesCount,
        reassignedTo: fallbackTargetName
      }
    });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// HELPER FUNCTIONS & MIGRATIONS
// ============================================================================

/**
 * Verify token against CacheService
 */
function requireAuth(token) {
  if (!token) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' }
    };
  }

  var cache = CacheService.getScriptCache();
  var sessionRaw = cache.get('session_' + token);
  if (!sessionRaw) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesi kedaluwarsa atau tidak valid. Silakan login kembali.' }
    };
  }

  try {
    var session = JSON.parse(sessionRaw);
    return {
      ok: true,
      username: session.username
    };
  } catch (e) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesi korup. Silakan login kembali.' }
    };
  }
}

/**
 * Validate input payload (4 fields for query)
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Payload tidak ditemukan' }
    };
  }

  var title = (payload.title || '').toString().trim();
  var category = (payload.category || '').toString().trim();
  var type = (payload.type || '').toString().trim();
  var sql_query = (payload.sql_query || '').toString();

  if (!title) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Judul query wajib diisi' } };
  }
  if (title.length > 150) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Judul query maksimal 150 karakter' } };
  }
  if (!category) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Kategori query wajib diisi' } };
  }
  if (!type) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Jenis query wajib diisi' } };
  }
  if (type.length > 50) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Jenis query maksimal 50 karakter' } };
  }
  if (!sql_query || !sql_query.trim()) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Query SQL wajib diisi' } };
  }

  return { ok: true };
}

/**
 * Format headers into index map
 */
function getHeaderMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[headers[i].toLowerCase()] = i;
  }
  return map;
}

/**
 * ISO date formatter
 */
function formatIso(val) {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

/**
 * JSON response output helper
 */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Initialize headers for sheet queries
 */
function initQueriesHeader(sheet) {
  var headers = ['id', 'title', 'category', 'type', 'sql_query', 'created_at', 'updated_at', 'updated_by'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * Initialize headers for master sheets (categories / types)
 */
function initMasterHeader(sheet) {
  var headers = ['id', 'name', 'description', 'color', 'sort_order', 'created_at', 'updated_at', 'updated_by'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * Read data from a master sheet and sort by sort_order
 */
function readMasterSheet_(ss, sheetName, defaultColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0].map(function (h) { return String(h).trim(); });
  var map = getHeaderMap(headers);

  var items = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var idVal = row[map['id']];
    var nameVal = row[map['name']];
    if (!idVal || !nameVal) continue;

    var sortOrder = parseInt(row[map['sort_order']], 10);
    if (isNaN(sortOrder)) sortOrder = i;

    items.push({
      id: String(idVal),
      name: String(nameVal).trim(),
      description: String(row[map['description']] || '').trim(),
      color: String(row[map['color']] || defaultColor).trim(),
      sort_order: sortOrder,
      created_at: formatIso(row[map['created_at']]),
      updated_at: formatIso(row[map['updated_at']]),
      updated_by: String(row[map['updated_by']] || '')
    });
  }

  // Sort by sort_order ascending, then name
  items.sort(function (a, b) {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name);
  });

  return items;
}

/**
 * Ensure master sheets exist and auto-seed if empty
 */
function ensureMasterSheets_(ss) {
  try {
    var catSheet = ss.getSheetByName(CONFIG.SHEET_CATEGORIES);
    if (!catSheet) {
      catSheet = ss.insertSheet(CONFIG.SHEET_CATEGORIES);
      initMasterHeader(catSheet);
    }

    var typSheet = ss.getSheetByName(CONFIG.SHEET_TYPES);
    if (!typSheet) {
      typSheet = ss.insertSheet(CONFIG.SHEET_TYPES);
      initMasterHeader(typSheet);
    }

    var now = new Date().toISOString();

    // Auto-seed categories if empty
    if (catSheet.getLastRow() <= 1) {
      var querySheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
      var existingCats = {};

      if (querySheet && querySheet.getLastRow() > 1) {
        var qValues = querySheet.getDataRange().getValues();
        if (qValues && qValues.length > 0) {
          var qHeaders = qValues[0].map(function (h) { return String(h).trim(); });
          var qMap = getHeaderMap(qHeaders);
          if (qMap['category'] !== undefined) {
            for (var q = 1; q < qValues.length; q++) {
              var cName = String(qValues[q][qMap['category']] || '').trim();
              if (cName) existingCats[cName] = true;
            }
          }
        }
      }

      var defaultCats = ['Query Permintaan Dataset', 'Query Superset', 'Lainnya'];
      for (var d = 0; d < defaultCats.length; d++) {
        existingCats[defaultCats[d]] = true;
      }

      var catNames = Object.keys(existingCats);
      var order = 1;
      var catRows = [];
      for (var c = 0; c < catNames.length; c++) {
        var name = catNames[c];
        var color = name === 'Query Permintaan Dataset' ? 'terracotta' : (name === 'Query Superset' ? 'teal' : 'neutral');
        catRows.push([
          'cat_' + c.toString(36) + '_' + Math.random().toString(36).substring(2, 6),
          name,
          'Koleksi ' + name,
          color,
          order++,
          now,
          now,
          'system'
        ]);
      }
      if (catRows.length > 0) {
        catSheet.getRange(2, 1, catRows.length, 8).setValues(catRows);
      }
    }

    // Auto-seed types if empty
    if (typSheet.getLastRow() <= 1) {
      var typeRows = [
        ['typ_query', 'Query', 'Query SQL standar / ad-hoc query', 'neutral', 1, now, now, 'system'],
        ['typ_dashboard', 'Dashboard', 'Query untuk kartu metrik dan bagan dashboard Superset', 'forest', 2, now, now, 'system']
      ];
      typSheet.getRange(2, 1, typeRows.length, 8).setValues(typeRows);
    }
  } catch (err) {
    Logger.log('ensureMasterSheets_ warning: ' + err);
  }
}

/**
 * Cascade rename a category or type across all matching rows in sheet queries
 */
function cascadeRenameInQueries_(ss, columnName, oldName, newName) {
  var sheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
  if (!sheet || sheet.getLastRow() <= 1) return 0;

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var headerMap = getHeaderMap(headers);
  var colIndex = headerMap[columnName];
  if (colIndex === undefined) return 0;

  var count = 0;
  for (var i = 1; i < values.length; i++) {
    var val = String(values[i][colIndex] || '').trim();
    if (val.toLowerCase() === oldName.toLowerCase()) {
      sheet.getRange(i + 1, colIndex + 1).setValue(newName);
      count++;
    }
  }

  return count;
}

/**
 * Ensure fallback master (e.g. 'Lainnya' or 'Query') exists in master sheet
 */
function ensureFallbackMasterExists_(ss, entity, fallbackName) {
  var sheetName = entity === 'category' ? CONFIG.SHEET_CATEGORIES : CONFIG.SHEET_TYPES;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  var headers = values[0].map(function (h) { return String(h).trim(); });
  var map = getHeaderMap(headers);

  for (var i = 1; i < values.length; i++) {
    var rowName = String(values[i][map['name']] || '').trim().toLowerCase();
    if (rowName === fallbackName.toLowerCase()) {
      return; // Already exists
    }
  }

  var now = new Date().toISOString();
  var prefix = entity === 'category' ? 'cat_' : 'typ_';
  sheet.appendRow([
    prefix + 'fallback_' + Math.random().toString(36).substring(2, 6),
    fallbackName,
    'Master ' + entity + ' bawaan',
    'neutral',
    99,
    now,
    now,
    'system'
  ]);
}

/**
 * Auto-register category or type to master sheet if not yet present
 */
function autoRegisterMasterIfNeeded_(ss, catName, typeName, username) {
  try {
    ensureMasterSheets_(ss);
    var changed = false;
    var now = new Date().toISOString();

    // Check category
    if (catName) {
      var catSheet = ss.getSheetByName(CONFIG.SHEET_CATEGORIES);
      if (catSheet) {
        var catValues = catSheet.getDataRange().getValues();
        if (catValues && catValues.length > 0) {
          var catMap = getHeaderMap(catValues[0].map(function (h) { return String(h).trim(); }));
          var nameCol = catMap['name'];
          if (nameCol !== undefined) {
            var catExists = false;
            for (var c = 1; c < catValues.length; c++) {
              if (String(catValues[c][nameCol] || '').trim().toLowerCase() === catName.toLowerCase()) {
                catExists = true;
                break;
              }
            }
            if (!catExists) {
              catSheet.appendRow([
                'cat_' + new Date().getTime().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
                catName,
                '',
                'terracotta',
                catValues.length,
                now,
                now,
                username || 'system'
              ]);
              changed = true;
            }
          }
        }
      }
    }

    // Check type
    if (typeName) {
      var typSheet = ss.getSheetByName(CONFIG.SHEET_TYPES);
      if (typSheet) {
        var typValues = typSheet.getDataRange().getValues();
        if (typValues && typValues.length > 0) {
          var typMap = getHeaderMap(typValues[0].map(function (h) { return String(h).trim(); }));
          var tNameCol = typMap['name'];
          if (tNameCol !== undefined) {
            var typExists = false;
            for (var t = 1; t < typValues.length; t++) {
              if (String(typValues[t][tNameCol] || '').trim().toLowerCase() === typeName.toLowerCase()) {
                typExists = true;
                break;
              }
            }
            if (!typExists) {
              typSheet.appendRow([
                'typ_' + new Date().getTime().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
                typeName,
                '',
                'neutral',
                typValues.length,
                now,
                now,
                username || 'system'
              ]);
              changed = true;
            }
          }
        }
      }
    }

    return changed;
  } catch (err) {
    Logger.log('autoRegisterMasterIfNeeded_ warning: ' + err);
    return false;
  }
}

// ============================================================================
// MANUAL MIGRATION & UTILITIES
// ============================================================================

/**
 * importBatch()
 * Helper manual untuk memastikan sheet queries & master sheet siap dan mereset cache.
 */
function importBatch() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_QUERIES);
    initQueriesHeader(sheet);
  }

  ensureMasterSheets_(ss);

  // Reset cache agar data terbaru langsung terbaca
  CacheService.getScriptCache().remove('QUERIES_LIST_DATA');
  CacheService.getScriptCache().remove('MASTERS_LIST_DATA');
  Logger.log('Semua sheet siap dan seluruh cache berhasil direset.');
}
