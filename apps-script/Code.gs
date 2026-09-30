/**
 * Nordis RCA acceptance guide: results backend.
 *
 * Bound to a Google Sheet. The guide page POSTs one verdict at a time and GETs
 * all rows to show everyone's results. One row per tester per test, upserted.
 *
 * Deploy: Extensions > Apps Script in the Sheet, paste this file, then
 * Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * Copy the /exec URL into RESULTS_ENDPOINT in index.html.
 */
var SHEET_NAME = 'Results';
var HEADERS = ['Key', 'Test ID', 'Tester', 'Status', 'Record #', 'Note', 'Updated (UTC)', 'Tester ID'];
var TEST_ID = /^[A-Z]{2}-\d{1,2}$/;
var STATUSES = { accepted: 1, rejected: 1 };

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Stop a note like "=HYPERLINK(...)" being evaluated as a formula in the Sheet.
function safe_(v, max) {
  var s = String(v == null ? '' : v).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function unsafe_(v) {
  var s = String(v == null ? '' : v);
  return s.charAt(0) === "'" ? s.slice(1) : s;
}

function doGet() {
  var values = sheet_().getDataRange().getValues();
  values.shift();
  var rows = values.filter(function (r) { return r[0]; }).map(function (r) {
    return {
      testId: String(r[1]),
      tester: unsafe_(r[2]),
      status: STATUSES[r[3]] ? r[3] : null,
      record: unsafe_(r[4]),
      note: unsafe_(r[5]),
      at: r[6] instanceof Date ? r[6].toISOString() : String(r[6] || ''),
      testerId: String(r[7])
    };
  });
  return json_({ ok: true, rows: rows });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  var testId = String(body.testId || '');
  var testerId = String(body.testerId || '');
  var tester = String(body.tester || '').trim();
  if (!TEST_ID.test(testId)) return json_({ ok: false, error: 'bad test id' });
  if (!/^t_[a-z0-9]{6,40}$/.test(testerId)) return json_({ ok: false, error: 'bad tester id' });
  if (!tester) return json_({ ok: false, error: 'name required' });
  var status = STATUSES[body.status] ? body.status : '';
  var at = new Date(body.at);
  if (isNaN(at.getTime())) at = new Date();

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_();
    var key = testerId + '|' + testId;
    var row = [key, testId, safe_(tester, 80), status, safe_(body.record, 60), safe_(body.note, 4000), at, testerId];
    var keys = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) {
        var existing = sh.getRange(i + 2, 7).getValue();
        if (existing instanceof Date && existing > at) return json_({ ok: true, stale: true });
        sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return json_({ ok: true });
      }
    }
    sh.appendRow(row);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
