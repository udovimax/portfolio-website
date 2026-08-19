/**
 * Max Udovichenko portfolio lead capture and private dashboard.
 *
 * Deploy this project twice from Max's Google account:
 * 1. Public web app: Execute as Me, access Anyone. This receives anonymous
 *    website form/page-view POSTs.
 * 2. Private web app: Execute as Me, access Only myself. This serves Admin.html
 *    and exposes dashboard actions only to Max's Google account.
 *
 * The public form still uses FormSubmit as its delivery source of truth. The
 * Sheet is the organised lead log and the private dashboard is the workflow
 * surface for responding and tracking enquiries.
 */

var ADMIN_EMAIL = 'maxudovichenko.prod@gmail.com';
var LEADS_SHEET_NAME = 'Leads';
var ANALYTICS_SHEET_NAME = 'Analytics';
var LEAD_HEADERS = [
  'Received at', 'Name', 'Email', 'Interest', 'Message', 'Subject',
  'Status', 'Priority', 'Notes', 'Follow-up', 'Last replied at',
];
var ANALYTICS_HEADERS = ['Received at', 'Page', 'Path'];

/** Public entry point for anonymous website lead and page-view POSTs. */
function doPost(event) {
  var values = event && event.parameter ? event.parameter : {};

  if (values._type === 'pageview') {
    appendPageView_(values);
    return jsonResponse_({ ok: true, recorded: 'pageview' });
  }

  var sheet = getOrCreateSheet_(LEADS_SHEET_NAME, LEAD_HEADERS);
  sheet.appendRow([
    new Date(), safeCell(values.name), safeCell(values.email),
    safeCell(values.interest || 'General enquiry'), safeCell(values.message),
    safeCell(values._subject || 'Portfolio enquiry'), 'New', 'Normal', '', '', '',
  ]);

  return jsonResponse_({ ok: true, recorded: 'lead' });
}

/** Private dashboard entry point. */
function doGet() {
  if (!isAdmin_()) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<p style="font:16px system-ui;padding:2rem">This dashboard is private. Sign in with Max Udovichenko\'s Google account.</p>',
    );
  }

  return HtmlService.createTemplateFromFile('Admin').evaluate()
    .setTitle('Max Portfolio — Enquiries');
}

/** Return leads and aggregate counts to the private UI. */
function getDashboardData() {
  requireAdmin_();
  var leads = readLeads_();
  var pageViews = readPageViews_();
  var thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
  var recentViews = pageViews.filter(function (view) {
    return view.receivedAtValue >= thirtyDaysAgo;
  });
  var byPage = {};
  recentViews.forEach(function (view) {
    byPage[view.page] = (byPage[view.page] || 0) + 1;
  });

  return {
    adminEmail: ADMIN_EMAIL,
    leads: leads,
    stats: {
      totalLeads: leads.length,
      newLeads: countBy_(leads, 'status', 'New'),
      repliedLeads: countBy_(leads, 'status', 'Replied'),
      bookedLeads: countBy_(leads, 'status', 'Booked'),
      viewsLast30Days: recentViews.length,
      viewsByPage: byPage,
    },
  };
}

/** Update status, priority, notes, or follow-up for a lead row. */
function updateLead(rowNumber, changes) {
  requireAdmin_();
  var sheet = getOrCreateSheet_(LEADS_SHEET_NAME, LEAD_HEADERS);
  var row = normaliseRowNumber_(rowNumber);
  var allowed = { status: 'Status', priority: 'Priority', notes: 'Notes', followUp: 'Follow-up' };

  Object.keys(allowed).forEach(function (key) {
    if (!changes || !Object.prototype.hasOwnProperty.call(changes, key)) return;
    sheet.getRange(row, headerColumn_(sheet, allowed[key])).setValue(safeCell(changes[key]));
  });

  return readLeadAt_(sheet, row);
}

/** Send a reply from Max's Gmail account and mark the lead as Replied. */
function sendLeadReply(rowNumber, subject, message) {
  requireAdmin_();
  var sheet = getOrCreateSheet_(LEADS_SHEET_NAME, LEAD_HEADERS);
  var row = normaliseRowNumber_(rowNumber);
  var lead = readLeadAt_(sheet, row);
  if (!lead.email) throw new Error('This enquiry does not contain a reply email address.');
  if (!String(message || '').trim()) throw new Error('Write a reply before sending.');

  var replySubject = String(subject || '').trim() || ('Re: ' + (lead.subject || 'Portfolio enquiry'));
  GmailApp.sendEmail(lead.email, replySubject, String(message).trim(), {
    name: 'Max Udovichenko', replyTo: ADMIN_EMAIL,
  });
  sheet.getRange(row, headerColumn_(sheet, 'Status')).setValue('Replied');
  sheet.getRange(row, headerColumn_(sheet, 'Last replied at')).setValue(new Date());
  return readLeadAt_(sheet, row);
}

/** Run once from the Apps Script editor to grant the script Gmail permission. */
function authorizeGmail() {
  requireAdmin_();
  GmailApp.getAliases();
  return 'Gmail access is ready.';
}

function appendPageView_(values) {
  var sheet = getOrCreateSheet_(ANALYTICS_SHEET_NAME, ANALYTICS_HEADERS);
  sheet.appendRow([new Date(), safeAnalyticsValue_(values.page || 'home'), safeAnalyticsValue_(values.path || '/')]);
}

function readLeads_() {
  var sheet = getOrCreateSheet_(LEADS_SHEET_NAME, LEAD_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, LEAD_HEADERS.length).getValues()
    .map(function (row, index) { return leadFromRow_(row, index + 2); }).reverse();
}

function readLeadAt_(sheet, rowNumber) {
  return leadFromRow_(sheet.getRange(rowNumber, 1, 1, LEAD_HEADERS.length).getValues()[0], rowNumber);
}

function leadFromRow_(row, rowNumber) {
  return {
    row: rowNumber, receivedAt: formatDate_(row[0]), name: String(row[1] || ''),
    email: String(row[2] || ''), interest: String(row[3] || 'General enquiry'),
    message: String(row[4] || ''), subject: String(row[5] || 'Portfolio enquiry'),
    status: String(row[6] || 'New'), priority: String(row[7] || 'Normal'),
    notes: String(row[8] || ''), followUp: formatDateOrText_(row[9]),
    lastRepliedAt: formatDateOrText_(row[10]),
  };
}

function readPageViews_() {
  var sheet = getOrCreateSheet_(ANALYTICS_SHEET_NAME, ANALYTICS_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, ANALYTICS_HEADERS.length).getValues().map(function (row) {
    var date = row[0] instanceof Date ? row[0] : new Date(row[0]);
    return { receivedAtValue: date.getTime() || 0, page: String(row[1] || 'home') };
  });
}

function getOrCreateSheet_(name, headers) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var next = headers.map(function (header, index) { return existing[index] || header; });
  sheet.getRange(1, 1, 1, headers.length).setValues([next]);
  sheet.setFrozenRows(1);
}

function headerColumn_(sheet, header) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), LEAD_HEADERS.length)).getValues()[0];
  var index = headers.indexOf(header);
  if (index < 0) throw new Error('Missing sheet column: ' + header);
  return index + 1;
}

function normaliseRowNumber_(rowNumber) {
  var row = Number(rowNumber);
  if (!Number.isInteger(row) || row < 2) throw new Error('Invalid enquiry row.');
  return row;
}

function countBy_(items, key, value) {
  return items.filter(function (item) { return item[key] === value; }).length;
}

function isAdmin_() {
  return String(Session.getActiveUser().getEmail() || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function requireAdmin_() {
  if (!isAdmin_()) throw new Error('Access denied. Sign in with Max Udovichenko\'s Google account.');
}

function formatDate_(value) {
  if (!(value instanceof Date)) return String(value || '');
  return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function formatDateOrText_(value) {
  return value instanceof Date ? formatDate_(value) : String(value || '');
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// Prevent user values beginning with =, +, -, or @ from becoming formulas.
function safeCell(value) {
  var text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function safeAnalyticsValue_(value) {
  return String(value || '').trim().slice(0, 120);
}
