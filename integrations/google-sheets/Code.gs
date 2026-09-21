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
var AVAILABILITY_SHEET_NAME = 'Availability';
var LEAD_HEADERS = [
  'Received at', 'Name', 'Email', 'Interest', 'Message', 'Subject',
  'Status', 'Priority', 'Notes', 'Follow-up', 'Last replied at',
  'Booking date', 'Booking time', 'Confirmation sent', 'Project URL', 'Booking end time',
  'Booking location', 'Booking price', 'Payment URL',
  'Booking travel fee', 'Booking estimate total', 'Booking type', 'Booking public location',
];
var ANALYTICS_HEADERS = ['Received at', 'Page', 'Path'];
var AVAILABILITY_HEADERS = [
  'Date', 'Time', 'Status', 'Lead row', 'Updated at', 'End time', 'Location', 'Price', 'Payment URL',
  'Public location', 'Booking type', 'Booking key',
];
var TRAVEL_RULES_SHEET_NAME = 'Travel rules';
var TRAVEL_RULE_HEADERS = ['From location', 'To location', 'Minutes', 'Fee', 'Updated at'];

/** Public entry point for anonymous website lead and page-view POSTs. */
function doPost(event) {
  var values = event && event.parameter ? event.parameter : {};

  if (values._type === 'pageview') {
    appendPageView_(values);
    return jsonResponse_({ ok: true, recorded: 'pageview' });
  }

  if (!isValidEmail_(values.email)) {
    return jsonResponse_({ ok: false, error: 'invalid_email' });
  }
  if (!isValidProjectUrl_(values.projectUrl)) {
    return jsonResponse_({ ok: false, error: 'invalid_project_url' });
  }
  if (isCollaboration_(values) && !String(values.projectUrl || '').trim()) {
    return jsonResponse_({ ok: false, error: 'project_url_required' });
  }
  if (isBooking_(values) && (!values.bookingDate || !values.bookingTime || !values.bookingEndTime || !values.bookingToken)) {
    return jsonResponse_({ ok: false, error: 'booking_range_required' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var reservation = null;
    if (isBooking_(values)) {
      reservation = reserveBookingSlot_(values.bookingToken, values.bookingDate, values.bookingTime, values.bookingEndTime);
      if (!reservation.ok) return jsonResponse_(reservation);
    }

    var bookingLocation = reservation ? reservation.location : safeCell(values.bookingLocation);
    var bookingPrice = reservation ? reservation.price : safeCell(values.bookingPrice);
    var paymentUrl = reservation ? reservation.paymentUrl : safeCell(values.paymentUrl);
    var bookingTravelFee = reservation ? reservation.travelFee : safeCell(values.bookingTravelFee);
    var bookingEstimateTotal = reservation ? reservation.estimateTotal : safeCell(values.bookingEstimateTotal);
    var bookingType = reservation ? reservation.bookingType : safeCell(values.bookingType);
    var bookingPublicLocation = reservation ? reservation.publicLocation : safeCell(values.bookingPublicLocation);

    var sheet = getOrCreateSheet_(LEADS_SHEET_NAME, LEAD_HEADERS);
    var leadRow = sheet.getLastRow() + 1;
    sheet.appendRow([
      new Date(), safeCell(values.name), safeCell(values.email),
      safeCell(values.interest || 'General enquiry'), safeCell(values.message),
      safeCell(values._subject || 'Portfolio enquiry'), 'New', 'Normal', '', '', '',
      safeCell(values.bookingDate), safeCell(values.bookingTime), '', safeCell(values.projectUrl), safeCell(values.bookingEndTime),
      bookingLocation, bookingPrice, paymentUrl, bookingTravelFee, bookingEstimateTotal, bookingType, bookingPublicLocation,
    ]);

    if (reservation) markBookingSlot_(reservation.row, leadRow, 'Requested');
    var confirmationSent = sendCustomerConfirmation_(Object.assign({}, values, {
      bookingLocation: bookingLocation,
      bookingPublicLocation: bookingPublicLocation,
      bookingType: bookingType,
      bookingPrice: bookingPrice,
      paymentUrl: paymentUrl,
      bookingTravelFee: bookingTravelFee,
      bookingEstimateTotal: bookingEstimateTotal,
    }));
    sheet.getRange(leadRow, headerColumn_(sheet, 'Confirmation sent'))
      .setValue(confirmationSent ? 'Sent' : 'Unavailable');

    return jsonResponse_({ ok: true, recorded: 'lead', confirmationSent: confirmationSent });
  } finally {
    lock.releaseLock();
  }
}

/** Private dashboard entry point. */
function doGet(event) {
  var parameters = event && event.parameter ? event.parameter : {};
  if (parameters.action === 'availability') return availabilityResponse_(parameters);

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
  var availability = readAdminAvailability_();
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
    availability: availability,
    travelRules: readTravelRules_(),
  };
}

/** Return upcoming availability rows for Max's private booking editor. */
function readAdminAvailability_() {
  return readAvailabilityRows_().sort(function (a, b) {
    return (a.date + a.startTime).localeCompare(b.date + b.startTime);
  });
}

/** Read normalized availability rows for private and public projections. */
function readAvailabilityRows_() {
  var sheet = getOrCreateSheet_(AVAILABILITY_SHEET_NAME, AVAILABILITY_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  ensureAvailabilityKeys_(sheet);
  var dateColumn = availabilityColumn_(sheet, 'Date');
  var timeColumn = availabilityColumn_(sheet, 'Time');
  var statusColumn = availabilityColumn_(sheet, 'Status');
  var leadColumn = availabilityColumn_(sheet, 'Lead row');
  var endTimeColumn = availabilityColumn_(sheet, 'End time');
  var locationColumn = availabilityColumn_(sheet, 'Location');
  var priceColumn = availabilityColumn_(sheet, 'Price');
  var paymentColumn = availabilityColumn_(sheet, 'Payment URL');
  var publicLocationColumn = availabilityColumn_(sheet, 'Public location');
  var bookingTypeColumn = availabilityColumn_(sheet, 'Booking type');
  var bookingKeyColumn = availabilityColumn_(sheet, 'Booking key');
  var values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), AVAILABILITY_HEADERS.length)).getValues();
  return values.map(function (row, index) {
    var startTime = timeKey_(row[timeColumn - 1]);
    return {
      row: index + 2,
      date: dateKey_(row[dateColumn - 1]),
      startTime: startTime,
      endTime: timeKey_(row[endTimeColumn - 1]) || addMinutesToTime_(startTime, 60),
      status: availabilityStatus_(row[statusColumn - 1]),
      leadRow: String(row[leadColumn - 1] || ''),
      location: String(row[locationColumn - 1] || '').trim(),
      price: priceKey_(row[priceColumn - 1]),
      paymentUrl: String(row[paymentColumn - 1] || '').trim(),
      publicLocation: String(row[publicLocationColumn - 1] || '').trim(),
      bookingType: String(row[bookingTypeColumn - 1] || '').trim(),
      bookingKey: String(row[bookingKeyColumn - 1] || '').trim(),
    };
  }).filter(function (slot) { return slot.date && slot.startTime; });
}

/** Add opaque row tokens without ever copying private location data publicly. */
function ensureAvailabilityKeys_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var keyColumn = availabilityColumn_(sheet, 'Booking key');
  var dateColumn = availabilityColumn_(sheet, 'Date');
  var timeColumn = availabilityColumn_(sheet, 'Time');
  var values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), AVAILABILITY_HEADERS.length)).getValues();
  values.forEach(function (row, index) {
    if (!dateKey_(row[dateColumn - 1]) || !timeKey_(row[timeColumn - 1]) || String(row[keyColumn - 1] || '').trim()) return;
    sheet.getRange(index + 2, keyColumn).setValue(Utilities.getUuid());
  });
}

function availabilityStatus_(value) {
  var text = String(value || 'Available').trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Available';
}

/** Add one slot or a contiguous date range from the private dashboard. */
function saveAvailabilitySlots(fromDate, toDate, startTime, endTime, location, price, paymentUrl, publicLocation, bookingType) {
  requireAdmin_();
  var startDate = validateDateKey_(fromDate, 'Choose a valid start date.');
  var finishDate = validateDateKey_(toDate || fromDate, 'Choose a valid end date.');
  var start = validateTimeKey_(startTime, 'Choose a valid start time.');
  var finish = validateTimeKey_(endTime, 'Choose a valid end time.');
  var studio = String(location || '').trim();
  if (!studio) throw new Error('Enter the studio or location for this window.');
  var publicArea = safeCell(publicLocation);
  if (!publicArea) throw new Error('Enter a rough public location for this window.');
  var kind = safeCell(bookingType);
  if (!kind) throw new Error('Enter a booking type for this window.');
  var amount = normalisePrice_(price);
  var payment = String(paymentUrl || '').trim();
  if (payment && !/^https?:\/\/\S+$/i.test(payment)) throw new Error('Payment link must begin with https://.');
  if (finish <= start) throw new Error('The end time must be later than the start time.');
  if (finishDate < startDate) throw new Error('The end date must be on or after the start date.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getOrCreateSheet_(AVAILABILITY_SHEET_NAME, AVAILABILITY_HEADERS);
    var existing = readAdminAvailability_();
    var dates = [];
    var cursor = new Date(startDate + 'T00:00:00');
    var last = new Date(finishDate + 'T00:00:00');
    while (cursor <= last) {
      dates.push(dateKey_(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    dates.forEach(function (date) {
      var conflict = existing.some(function (slot) {
        if (slot.date !== date || slot.location !== studio || ['Available', 'Requested', 'Booked'].indexOf(slot.status) < 0) return false;
        return timeMinutes_(start) < timeMinutes_(slot.endTime)
          && timeMinutes_(finish) > timeMinutes_(slot.startTime);
      });
      if (conflict) throw new Error('An existing booking window overlaps ' + date + '.');
    });
    dates.forEach(function (date) {
      sheet.appendRow([date, start, 'Available', '', '', finish, studio, amount, payment, publicArea, kind, Utilities.getUuid()]);
    });
    return readAdminAvailability_();
  } finally {
    lock.releaseLock();
  }
}

/** Apply checked changes to selected unused availability rows. */
function updateAvailabilitySelection(rowNumbers, changes) {
  requireAdmin_();
  var sheet = getOrCreateSheet_(AVAILABILITY_SHEET_NAME, AVAILABILITY_HEADERS);
  var rows = Array.isArray(rowNumbers) ? rowNumbers : [];
  var patch = changes || {};
  var statusColumn = availabilityColumn_(sheet, 'Status');
  var locationColumn = availabilityColumn_(sheet, 'Location');
  var priceColumn = availabilityColumn_(sheet, 'Price');
  var publicLocationColumn = availabilityColumn_(sheet, 'Public location');
  var bookingTypeColumn = availabilityColumn_(sheet, 'Booking type');
  var updatedColumn = availabilityColumn_(sheet, 'Updated at');
  var lastRow = sheet.getLastRow();
  var amount = null;
  if (patch.setPrice) amount = patch.clearPrice ? '' : normalisePrice_(patch.price);
  var locationFilter = String(patch.locationFilter || '').trim().toLowerCase();
  var updatedRows = 0;
  var skippedReasons = [];
  var seen = {};

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    rows.forEach(function (value) {
      var row = normaliseRowNumber_(value);
      if (row > lastRow || seen[row]) return;
      seen[row] = true;
      var status = availabilityStatus_(sheet.getRange(row, statusColumn).getValue());
      if (['Available', 'Unavailable'].indexOf(status) < 0) {
        skippedReasons.push({ row: row, reason: 'locked' });
        return;
      }
      var currentLocation = String(sheet.getRange(row, locationColumn).getValue() || '').trim();
      if (locationFilter && currentLocation.toLowerCase() !== locationFilter) {
        skippedReasons.push({ row: row, reason: 'location_filter' });
        return;
      }
      var changed = false;
      if (patch.setPrice) {
        sheet.getRange(row, priceColumn).setValue(amount);
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
        var nextLocation = safeCell(patch.location);
        if (!nextLocation) throw new Error('Exact internal location cannot be blank.');
        sheet.getRange(row, locationColumn).setValue(nextLocation);
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'publicLocation')) {
        var nextPublicLocation = safeCell(patch.publicLocation);
        if (!nextPublicLocation) throw new Error('Rough public location cannot be blank.');
        sheet.getRange(row, publicLocationColumn).setValue(nextPublicLocation);
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'bookingType')) {
        var nextBookingType = safeCell(patch.bookingType);
        if (!nextBookingType) throw new Error('Booking type cannot be blank.');
        sheet.getRange(row, bookingTypeColumn).setValue(nextBookingType);
        changed = true;
      }
      if (changed) {
        sheet.getRange(row, updatedColumn).setValue(new Date());
        updatedRows += 1;
      }
    });
    return {
      availability: readAdminAvailability_(),
      updatedRows: updatedRows,
      skippedRows: skippedReasons.length,
      skippedReasons: skippedReasons,
    };
  } finally {
    lock.releaseLock();
  }
}

/** Read the private exact-location travel rules. */
function readTravelRules_() {
  var sheet = getOrCreateSheet_(TRAVEL_RULES_SHEET_NAME, TRAVEL_RULE_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var fromColumn = travelColumn_(sheet, 'From location');
  var toColumn = travelColumn_(sheet, 'To location');
  var minutesColumn = travelColumn_(sheet, 'Minutes');
  var feeColumn = travelColumn_(sheet, 'Fee');
  var values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), TRAVEL_RULE_HEADERS.length)).getValues();
  return values.map(function (row, index) {
    return {
      row: index + 2,
      fromLocation: String(row[fromColumn - 1] || '').trim(),
      toLocation: String(row[toColumn - 1] || '').trim(),
      minutes: Number(row[minutesColumn - 1]) || 0,
      fee: priceKey_(row[feeColumn - 1]),
    };
  }).filter(function (rule) { return rule.fromLocation && rule.toLocation; });
}

/** Add or replace one private exact-location travel rule. */
function saveTravelRule(fromLocation, toLocation, minutes, fee) {
  requireAdmin_();
  var from = safeCell(fromLocation);
  var to = safeCell(toLocation);
  if (!from || !to) throw new Error('Enter both exact locations.');
  if (from.toLowerCase() === to.toLowerCase()) throw new Error('Same-location travel is automatically zero.');
  var travelMinutes = Number(minutes);
  if (!Number.isInteger(travelMinutes) || travelMinutes < 0 || travelMinutes > 720) {
    throw new Error('Travel time must be a whole number from 0 to 720 minutes.');
  }
  var travelFee = normalisePrice_(fee);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getOrCreateSheet_(TRAVEL_RULES_SHEET_NAME, TRAVEL_RULE_HEADERS);
    var fromColumn = travelColumn_(sheet, 'From location');
    var toColumn = travelColumn_(sheet, 'To location');
    var lastRow = sheet.getLastRow();
    var values = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), TRAVEL_RULE_HEADERS.length)).getValues();
    var existingRow = 0;
    values.some(function (row, index) {
      var matches = String(row[fromColumn - 1] || '').trim().toLowerCase() === from.toLowerCase()
        && String(row[toColumn - 1] || '').trim().toLowerCase() === to.toLowerCase();
      if (matches) existingRow = index + 2;
      return matches;
    });
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, TRAVEL_RULE_HEADERS.length)
        .setValues([[from, to, travelMinutes, travelFee, new Date()]]);
    } else {
      sheet.appendRow([from, to, travelMinutes, travelFee, new Date()]);
    }
    return readTravelRules_();
  } finally {
    lock.releaseLock();
  }
}

/** Clear one private travel rule without affecting availability history. */
function deleteTravelRule(rowNumber) {
  requireAdmin_();
  var row = normaliseRowNumber_(rowNumber);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getOrCreateSheet_(TRAVEL_RULES_SHEET_NAME, TRAVEL_RULE_HEADERS);
    if (row > sheet.getLastRow()) throw new Error('Invalid travel rule row.');
    sheet.getRange(row, 1, 1, TRAVEL_RULE_HEADERS.length).clearContent();
    return readTravelRules_();
  } finally {
    lock.releaseLock();
  }
}

/** Update the price on an unused availability row without changing its history. */
function updateAvailabilityPrice(rowNumber, price) {
  return updateAvailabilitySelection([rowNumber], { setPrice: true, price: price }).availability;
}

/** Hide an unused availability row without deleting its audit history. */
function removeAvailabilitySlot(rowNumber) {
  requireAdmin_();
  var sheet = getOrCreateSheet_(AVAILABILITY_SHEET_NAME, AVAILABILITY_HEADERS);
  var row = normaliseRowNumber_(rowNumber);
  var statusColumn = availabilityColumn_(sheet, 'Status');
  var status = String(sheet.getRange(row, statusColumn).getValue() || 'Available').trim();
  if (status !== 'Available') throw new Error('Only unused Available slots can be removed.');
  sheet.getRange(row, statusColumn).setValue('Unavailable');
  sheet.getRange(row, availabilityColumn_(sheet, 'Updated at')).setValue(new Date());
  return readAdminAvailability_();
}

/** Reopen an unused availability row that was previously marked unavailable. */
function restoreAvailabilitySlot(rowNumber) {
  requireAdmin_();
  var sheet = getOrCreateSheet_(AVAILABILITY_SHEET_NAME, AVAILABILITY_HEADERS);
  var row = normaliseRowNumber_(rowNumber);
  var statusColumn = availabilityColumn_(sheet, 'Status');
  var status = String(sheet.getRange(row, statusColumn).getValue() || '').trim();
  if (status !== 'Unavailable') throw new Error('Only Unavailable slots can be restored.');
  sheet.getRange(row, statusColumn).setValue('Available');
  sheet.getRange(row, availabilityColumn_(sheet, 'Lead row')).clearContent();
  sheet.getRange(row, availabilityColumn_(sheet, 'Updated at')).setValue(new Date());
  return readAdminAvailability_();
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

  var updatedLead = readLeadAt_(sheet, row);
  syncBookingStatus_(updatedLead, updatedLead.status);

  return updatedLead;
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
    lastRepliedAt: formatDateOrText_(row[10]), bookingDate: dateKey_(row[11]),
    bookingTime: timeKey_(row[12]), confirmationSent: String(row[13] || ''),
    projectUrl: String(row[14] || ''), bookingEndTime: timeKey_(row[15]),
    bookingLocation: String(row[16] || ''), bookingPrice: priceKey_(row[17]), paymentUrl: String(row[18] || ''),
    bookingTravelFee: priceKey_(row[19]), bookingEstimateTotal: priceKey_(row[20]),
    bookingType: String(row[21] || ''), bookingPublicLocation: String(row[22] || ''),
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

/** Return published booking slots through a small JSONP response for the site. */
function availabilityResponse_(parameters) {
  var payload = { ok: true, slots: readAvailability_(parameters.from, parameters.days) };
  var callback = String(parameters.callback || '');
  if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse_(payload);
}

/** Read the safe public workload projection for future availability. */
function readAvailability_(from, days) {
  var firstDate = dateKey_(from || new Date());
  if (!firstDate) return [];
  var span = Math.min(Math.max(Number(days) || 120, 1), 180);
  var end = new Date(firstDate + 'T00:00:00');
  end.setDate(end.getDate() + span);
  var lastDate = dateKey_(end);
  var rules = readTravelRules_();
  var rows = readAvailabilityRows_().filter(function (slot) {
    return slot.date >= firstDate && slot.date <= lastDate;
  });
  var grouped = {};

  rows.forEach(function (slot) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    var status = availabilityStatus_(slot.status).toLowerCase();
    if (status === 'unavailable') return;
    if (status === 'requested' || status === 'booked') {
      grouped[slot.date].push(toPublicAvailabilityRange_(slot));
      return;
    }
    if (status !== 'available') return;

    var neighbours = availabilityNeighbours_(rows, slot);
    var estimate = estimateAvailability_(slot, neighbours.previous, neighbours.next, rules);
    if (estimate.eligible && slot.bookingKey) {
      grouped[slot.date].push(toPublicAvailabilityRange_(slot, estimate));
    }
  });

  Object.keys(grouped).forEach(function (date) {
    var busy = rows.filter(function (slot) {
      return slot.date === date && isBusyAvailabilityStatus_(slot.status);
    }).sort(sortAvailabilityRows_);
    publicTravelRanges_(busy, rules).forEach(function (range) {
      grouped[date].push(toPublicAvailabilityRange_(range));
    });
    grouped[date] = dedupePublicRanges_(grouped[date]).sort(function (a, b) {
      return a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.status.localeCompare(b.status);
    });
  });

  return Object.keys(grouped).sort().map(function (date) {
    return { date: date, ranges: grouped[date] };
  }).filter(function (day) { return day.ranges.length > 0; });
}

/** Atomically reserve a published slot before a lead row is created. */
function reserveBookingSlot_(bookingToken, date, time, endTime) {
  var token = String(bookingToken || '').trim();
  if (!token) return { ok: false, error: 'slot_unavailable' };
  var rows = readAvailabilityRows_();
  var matches = rows.filter(function (slot) {
    return slot.bookingKey === token
      && slot.date === dateKey_(date)
      && slot.startTime === timeKey_(time)
      && slot.endTime === timeKey_(endTime);
  });
  if (matches.length !== 1) return { ok: false, error: 'slot_unavailable' };

  var slot = matches[0];
  if (availabilityStatus_(slot.status).toLowerCase() !== 'available') {
    return { ok: false, error: 'slot_taken' };
  }
  var neighbours = availabilityNeighbours_(rows, slot);
  var estimate = estimateAvailability_(slot, neighbours.previous, neighbours.next, readTravelRules_());
  if (!estimate.eligible) return { ok: false, error: estimate.reason || 'slot_unavailable' };

  return {
    ok: true,
    row: slot.row,
    location: slot.location,
    publicLocation: slot.publicLocation,
    bookingType: slot.bookingType,
    price: slot.price,
    paymentUrl: slot.paymentUrl,
    travelFee: estimate.hasEstimate !== false ? estimate.travelFee : '',
    estimateTotal: estimate.hasEstimate !== false ? estimate.total : '',
  };
}

function isBusyAvailabilityStatus_(status) {
  var value = availabilityStatus_(status).toLowerCase();
  return value === 'requested' || value === 'booked';
}

function sortAvailabilityRows_(a, b) {
  return a.date.localeCompare(b.date)
    || a.startTime.localeCompare(b.startTime)
    || a.endTime.localeCompare(b.endTime)
    || a.row - b.row;
}

/** Find the nearest requested/booked rows that bound a candidate window. */
function availabilityNeighbours_(rows, candidate) {
  var previous = null;
  var next = null;
  var start = timeMinutes_(candidate.startTime);
  var end = timeMinutes_(candidate.endTime);
  rows.filter(function (slot) {
    return slot.date === candidate.date && isBusyAvailabilityStatus_(slot.status) && slot.row !== candidate.row;
  }).sort(sortAvailabilityRows_).forEach(function (slot) {
    var slotStart = timeMinutes_(slot.startTime);
    var slotEnd = timeMinutes_(slot.endTime);
    if (slotStart <= start && (!previous || slotStart >= timeMinutes_(previous.startTime))) {
      previous = slot;
      return;
    }
    if (slotStart >= end && (!next || slotStart <= timeMinutes_(next.startTime))) {
      next = slot;
      return;
    }
    if (slotStart < end && slotEnd > start) {
      if (slotStart <= start) previous = slot;
      else if (!next || slotStart < timeMinutes_(next.startTime)) next = slot;
    }
  });
  return { previous: previous, next: next };
}

/** Add neutral transit ranges between adjacent busy windows when travel is known. */
function publicTravelRanges_(busyRows, rules) {
  var ranges = [];
  for (var index = 0; index < busyRows.length - 1; index += 1) {
    var previous = busyRows[index];
    var next = busyRows[index + 1];
    var travel = travelRequirement_(previous.location, next.location, rules);
    if (!travel.configured || travel.minutes <= 0) continue;
    var start = timeMinutes_(previous.endTime);
    var nextStart = timeMinutes_(next.startTime);
    var finish = Math.min(start + travel.minutes, nextStart);
    if (!isFinite(start) || !isFinite(finish) || finish <= start) continue;
    ranges.push({
      startTime: previous.endTime,
      endTime: minutesToTime_(finish),
      status: 'Travel',
      publicLocation: 'Transit',
      bookingType: 'Travel / transit',
    });
  }
  return ranges;
}

function minutesToTime_(minutes) {
  var value = Math.max(0, Math.min(23 * 60 + 59, Math.floor(Number(minutes) || 0)));
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}

function dedupePublicRanges_(ranges) {
  var seen = {};
  return ranges.filter(function (range) {
    var key = [range.start, range.end, range.status, range.publicLocation, range.bookingType].join('|');
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function markBookingSlot_(row, leadRow, status) {
  var sheet = getOrCreateSheet_(AVAILABILITY_SHEET_NAME, AVAILABILITY_HEADERS);
  sheet.getRange(row, availabilityColumn_(sheet, 'Status')).setValue(status);
  sheet.getRange(row, availabilityColumn_(sheet, 'Lead row')).setValue(leadRow);
  sheet.getRange(row, availabilityColumn_(sheet, 'Updated at')).setValue(new Date());
}

function findAvailabilityRow_(sheet, date, time, endTime, location) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var dateColumn = availabilityColumn_(sheet, 'Date');
  var timeColumn = availabilityColumn_(sheet, 'Time');
  var endTimeColumn = availabilityColumn_(sheet, 'End time');
  var locationColumn = availabilityColumn_(sheet, 'Location');
  var values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), AVAILABILITY_HEADERS.length)).getValues();
  var requestedLocation = String(location || '').trim().toLowerCase();
  var matchingRows = [];
  for (var index = 0; index < values.length; index += 1) {
    var storedStart = timeKey_(values[index][timeColumn - 1]);
    var storedEnd = timeKey_(values[index][endTimeColumn - 1]) || addMinutesToTime_(storedStart, 60);
    if (dateKey_(values[index][dateColumn - 1]) === dateKey_(date)
      && storedStart === timeKey_(time)
      && (!endTime || storedEnd === timeKey_(endTime))) {
      var storedLocation = String(values[index][locationColumn - 1] || '').trim();
      if (!requestedLocation || storedLocation.toLowerCase() === requestedLocation) matchingRows.push(index + 2);
    }
  }
  return matchingRows.length === 1 ? matchingRows[0] : matchingRows.length > 1 && !requestedLocation ? 0 : matchingRows[0] || 0;
}

/** Keep a requested slot reserved until Max marks the lead Declined or Booked. */
function syncBookingStatus_(lead, status) {
  if (!lead.bookingDate || !lead.bookingTime) return;
  var sheet = getOrCreateSheet_(AVAILABILITY_SHEET_NAME, AVAILABILITY_HEADERS);
  var row = findAvailabilityRow_(sheet, lead.bookingDate, lead.bookingTime, lead.bookingEndTime, lead.bookingLocation);
  if (!row) return;
  if (status === 'Declined') {
    markBookingSlot_(row, '', 'Available');
  } else if (status === 'Booked' || status === 'Complete') {
    markBookingSlot_(row, lead.row, 'Booked');
  } else {
    markBookingSlot_(row, lead.row, 'Requested');
  }
}

/** Send a real confirmation from Max's account so the customer can trust the thread. */
function sendCustomerConfirmation_(values) {
  if (!isValidEmail_(values.email) || values._honey) return false;
  var name = String(values.name || 'there').trim();
  var interest = String(values.interest || 'General enquiry').trim();
  var body = [
    'Hi ' + name + ',',
    '',
    'This is a confirmation that Max Udovichenko received your enquiry through his portfolio website.',
    '',
    'Enquiry type: ' + interest,
  ];
  if (values.bookingDate && values.bookingTime) {
    body.push('Requested booking: ' + values.bookingDate + ' from ' + values.bookingTime + (values.bookingEndTime ? ' to ' + values.bookingEndTime : ''));
  }
  if (values.bookingPublicLocation) body.push('Approximate location: ' + String(values.bookingPublicLocation).trim());
  if (values.bookingType) body.push('Booking type: ' + String(values.bookingType).trim());
  if (values.bookingDate && values.bookingTime) {
    if (values.bookingPrice) {
      body.push('Estimated rate: £' + String(values.bookingPrice).trim() + ' per hour (subject to Max\'s confirmation).');
      if (values.bookingTravelFee && Number(values.bookingTravelFee) > 0) {
        body.push('Estimated travel fee: £' + String(values.bookingTravelFee).trim() + '.');
      }
      if (values.bookingEstimateTotal) {
        body.push('Estimated total for this window: £' + String(values.bookingEstimateTotal).trim() + '.');
      }
    } else {
      body.push('Price: to be confirmed by Max.');
    }
    body.push('No payment was taken. Max will confirm the final price, travel requirements, and payment details before the booking is accepted.');
  }
  if (values.projectUrl) body.push('Project link: ' + String(values.projectUrl).trim());
  body.push('', 'Your message:', String(values.message || '').trim());
  body.push('', 'Max will review your message and reply as soon as possible.',
    '', 'If you do not see his reply, please check your spam or junk folder.',
    '', '— Max Udovichenko');

  try {
    GmailApp.sendEmail(String(values.email).trim(), 'We received your enquiry for Max Udovichenko', body.join('\n'), {
      name: 'Max Udovichenko', replyTo: ADMIN_EMAIL,
    });
    return true;
  } catch (error) {
    return false;
  }
}

function isBooking_(values) {
  return String(values.interest || '').trim() === 'Booking / studio session';
}

function isCollaboration_(values) {
  return String(values.interest || '').trim() === 'Artist / music collaboration';
}

function isValidEmail_(value) {
  var email = String(value || '').trim();
  return email.length <= 254 && EMAIL_PATTERN_().test(email);
}

function isValidProjectUrl_(value) {
  var url = String(value || '').trim();
  return !url || /^https?:\/\/\S+$/i.test(url);
}

function addMinutesToTime_(value, minutes) {
  var match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  var total = Number(match[1]) * 60 + Number(match[2]) + minutes;
  total = total % (24 * 60);
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

function validateDateKey_(value, message) {
  var date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dateKey_(date) !== date) throw new Error(message);
  return date;
}

function validateTimeKey_(value, message) {
  var time = timeKey_(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(message);
  return time;
}

function timeMinutes_(value) {
  var parts = String(value || '').split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function normalisePrice_(value) {
  var text = value == null ? '' : String(value).trim().replace(/^£/, '').replace(/,/g, '');
  if (!text) return '';
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error('Price must be a positive GBP amount, or left blank for price on request.');
  }
  return priceKey_(text);
}

/** Resolve the private travel requirement between two exact locations. */
function travelRequirement_(fromLocation, toLocation, rules) {
  var from = String(fromLocation || '').trim().toLowerCase();
  var to = String(toLocation || '').trim().toLowerCase();
  if (!from || !to || from === to) return { configured: true, minutes: 0, fee: 0 };

  var match = (rules || []).find(function (rule) {
    return String(rule.fromLocation || '').trim().toLowerCase() === from
      && String(rule.toLocation || '').trim().toLowerCase() === to;
  });
  if (!match) return { configured: false, minutes: 0, fee: '' };

  return {
    configured: true,
    minutes: Math.max(0, Math.floor(Number(match.minutes) || 0)),
    fee: priceKey_(match.fee),
  };
}

/** Calculate travel eligibility and a provisional estimate for an available row. */
function estimateAvailability_(slot, previousBusy, nextBusy, rules) {
  var previousTravel = previousBusy
    ? travelRequirement_(previousBusy.location, slot.location, rules)
    : { configured: true, minutes: 0, fee: 0 };
  var nextTravel = nextBusy
    ? travelRequirement_(slot.location, nextBusy.location, rules)
    : { configured: true, minutes: 0, fee: 0 };
  if (!previousTravel.configured || !nextTravel.configured) {
    return { eligible: false, reason: 'travel_not_configured', travelMinutes: 0, travelFee: '' };
  }

  var start = timeMinutes_(slot.startTime);
  var end = timeMinutes_(slot.endTime);
  if (previousBusy && timeMinutes_(previousBusy.endTime) + previousTravel.minutes > start) {
    return { eligible: false, reason: 'travel_conflict', travelMinutes: previousTravel.minutes, travelFee: previousTravel.fee };
  }
  if (nextBusy && end + nextTravel.minutes > timeMinutes_(nextBusy.startTime)) {
    return { eligible: false, reason: 'travel_conflict', travelMinutes: nextTravel.minutes, travelFee: nextTravel.fee };
  }

  var hourlyPrice = priceKey_(slot.price);
  if (!hourlyPrice) {
    return {
      eligible: true,
      hasEstimate: false,
      travelMinutes: previousTravel.minutes + nextTravel.minutes,
      travelFee: '',
    };
  }

  var durationHours = Math.max(0, end - start) / 60;
  var travelFee = Number(previousTravel.fee || 0) + Number(nextTravel.fee || 0);
  return {
    eligible: true,
    travelMinutes: previousTravel.minutes + nextTravel.minutes,
    travelFee: priceKey_(travelFee),
    hourlyPrice: hourlyPrice,
    total: priceKey_(Number(hourlyPrice) * durationHours + travelFee),
  };
}

/** Serialize only safe public availability fields. */
function toPublicAvailabilityRange_(slot, estimate) {
  var status = String(slot.status || 'Available').trim().toLowerCase();
  var result = {
    start: String(slot.startTime || ''),
    end: String(slot.endTime || ''),
    status: status,
    publicLocation: String(slot.publicLocation || 'Location to be confirmed').trim(),
    bookingType: String(slot.bookingType || 'Booking details to be confirmed').trim(),
  };
  if (status === 'available' && estimate && estimate.eligible && String(slot.bookingKey || '').trim()) {
    result.bookingToken = String(slot.bookingKey || '').trim();
    if (estimate.hasEstimate !== false) {
      result.estimatedHourlyPrice = estimate.hourlyPrice;
      result.estimatedTravelFee = estimate.travelFee;
      result.estimatedTotal = estimate.total;
    }
  }
  return result;
}

function EMAIL_PATTERN_() {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
}

function availabilityColumn_(sheet, header) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), AVAILABILITY_HEADERS.length)).getValues()[0];
  var index = headers.indexOf(header);
  if (index < 0) throw new Error('Missing availability column: ' + header);
  return index + 1;
}

function travelColumn_(sheet, header) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), TRAVEL_RULE_HEADERS.length)).getValues()[0];
  var index = headers.indexOf(header);
  if (index < 0) throw new Error('Missing travel rule column: ' + header);
  return index + 1;
}

function dateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function timeKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  var text = String(value || '').trim();
  var match = text.match(/^(\d{1,2}):(\d{2})/);
  return match ? ('0' + match[1]).slice(-2) + ':' + match[2] : text;
}

function priceKey_(value) {
  var text = value == null ? '' : String(value).trim();
  if (!text) return '';
  var amount = Number(text.replace(/^£/, ''));
  return isFinite(amount) && amount >= 0 ? amount.toFixed(2).replace(/\.00$/, '') : '';
}

// Prevent user values beginning with =, +, -, or @ from becoming formulas.
function safeCell(value) {
  var text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function safeAnalyticsValue_(value) {
  return String(value || '').trim().slice(0, 120);
}
