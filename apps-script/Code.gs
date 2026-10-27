/**
 * Herbarium - Google Apps Script Backend (Code.gs)
 * Pustaka Query Superset
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
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
var CONFIG = {
  SHEET_QUERIES: 'queries',
  SHEET_USERS: 'users',
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
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'list';
    if (action === 'list') {
      return handleList();
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
 * Expected JSON body with action: login | logout | create | update | delete
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
      case 'create':
        return handleCreate(body);
      case 'update':
        return handleUpdate(body);
      case 'delete':
        return handleDelete(body);
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
// HANDLERS
// ============================================================================

/**
 * List all queries (Public read)
 * Never touches sheet 'users'
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
 * Removes session token from CacheService
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
 * Requires valid auth token
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

    var newRow = [];
    for (var c = 0; c < headers.length; c++) {
      newRow.push('');
    }

    newRow[headerMap['id']] = id;
    newRow[headerMap['title']] = payload.title.trim();
    newRow[headerMap['category']] = payload.category.trim();
    newRow[headerMap['type']] = payload.type;
    newRow[headerMap['sql_query']] = payload.sql_query;
    newRow[headerMap['created_at']] = now;
    newRow[headerMap['updated_at']] = now;
    newRow[headerMap['updated_by']] = auth.username;

    sheet.appendRow(newRow);

    // Invalidate cached query list
    CacheService.getScriptCache().remove('QUERIES_LIST_DATA');

    // Format sql_query column to plain text (@) to prevent formula injection
    var lastRow = sheet.getLastRow();
    var sqlCol = headerMap['sql_query'] + 1;
    sheet.getRange(lastRow, sqlCol).setNumberFormat('@');

    return json_({
      ok: true,
      data: {
        id: id,
        title: payload.title.trim(),
        category: payload.category.trim(),
        type: payload.type,
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
 * Requires valid auth token
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

    var now = new Date().toISOString();
    var created_at = formatIso(values[targetRowIndex - 1][headerMap['created_at']]);

    sheet.getRange(targetRowIndex, headerMap['title'] + 1).setValue(payload.title.trim());
    sheet.getRange(targetRowIndex, headerMap['category'] + 1).setValue(payload.category.trim());
    sheet.getRange(targetRowIndex, headerMap['type'] + 1).setValue(payload.type);

    var sqlRange = sheet.getRange(targetRowIndex, headerMap['sql_query'] + 1);
    sqlRange.setNumberFormat('@');
    sqlRange.setValue(payload.sql_query);

    sheet.getRange(targetRowIndex, headerMap['updated_at'] + 1).setValue(now);
    sheet.getRange(targetRowIndex, headerMap['updated_by'] + 1).setValue(auth.username);

    // Invalidate cached query list
    CacheService.getScriptCache().remove('QUERIES_LIST_DATA');

    return json_({
      ok: true,
      data: {
        id: id,
        title: payload.title.trim(),
        category: payload.category.trim(),
        type: payload.type,
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
 * Requires valid auth token
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
// VALIDATION & AUTH HELPERS
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
 * Validate input payload (4 fields)
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
  if (type !== 'Query' && type !== 'Dashboard') {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: "Jenis harus 'Query' atau 'Dashboard'" } };
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

// ============================================================================
// MANUAL MIGRATION IMPORTER & UTILITIES
// ============================================================================

/**
 * importBatch()
 * Fungsi pembantu manual untuk memastikan sheet queries siap dan mereset cache.
 * Catatan: Data 20 query sudah tersimpan di tab sheet 'queries'.
 */
function importBatch() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_QUERIES);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_QUERIES);
    initQueriesHeader(sheet);
  }

  // Reset cache agar data terbaru langsung terbaca
  CacheService.getScriptCache().remove('QUERIES_LIST_DATA');
  Logger.log('Sheet ' + CONFIG.SHEET_QUERIES + ' siap dan cache query berhasil direset.');
}
