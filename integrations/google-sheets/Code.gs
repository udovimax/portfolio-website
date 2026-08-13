/**
 * Max Udovichenko portfolio lead capture.
 *
 * Deploy this script as a Web app from Max's Google account. The website sends
 * a second, best-effort no-cors POST here; FormSubmit remains the email source
 * of truth if this optional sheet endpoint is not configured.
 */
function doPost(event) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Leads') || spreadsheet.insertSheet('Leads');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Received at', 'Name', 'Email', 'Interest', 'Message', 'Subject', 'Status']);
    sheet.setFrozenRows(1);
  }

  var values = event && event.parameter ? event.parameter : {};
  sheet.appendRow([
    new Date(),
    safeCell(values.name),
    safeCell(values.email),
    safeCell(values.interest || 'General enquiry'),
    safeCell(values.message),
    safeCell(values._subject || 'Portfolio enquiry'),
    'New',
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Prevent form values beginning with =, +, -, or @ from being interpreted as
// spreadsheet formulas when Max opens the lead log.
function safeCell(value) {
  var text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
