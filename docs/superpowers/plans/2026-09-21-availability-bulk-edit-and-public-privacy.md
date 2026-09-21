# Availability Bulk Editing and Public Privacy Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement a privacy-safe public workload calendar, Shift-click/context-menu bulk editing, and travel-aware provisional booking estimates for Max's availability system.

**Architecture:** Keep Google Apps Script and the Availability sheet authoritative. Append new availability metadata without shifting existing columns, add a private travel-rule sheet, and expose a separate public projection that includes safe busy windows and estimates only for currently available windows. The GitHub Pages React client consumes opaque booking tokens, while the Apps Script reservation lock recalculates travel and price before creating a lead.

**Tech Stack:** Google Apps Script, Google Sheets, vanilla HTML/CSS/JavaScript private dashboard, React 19, TypeScript, Vite, Node test runner, GitHub Pages Actions.

**Spec:** docs/superpowers/specs/2026-09-21-availability-bulk-edit-and-public-privacy-design.md

## Global Constraints

- Keep existing Availability columns in place and append Public location, Booking type, and Booking key.
- Never include historical estimates, payment URLs, exact locations, lead rows, names, emails, or messages for requested/booked ranges in the public response.
- Available windows may show only their own clearly-labelled provisional estimate; no public booking action charges a visitor.
- Requested and booked rows are immutable from the bulk editor; only Available and Unavailable rows may be changed.
- Same exact locations require zero travel time and zero travel fee; different locations require a configured private travel rule.
- A missing cross-location travel rule must require confirmation rather than inventing travel time or cost.
- The public endpoint must use an opaque bookingToken, not the internal location, to identify a selected window.
- Preserve FormSubmit as the authoritative email delivery path and preserve the existing private Google-account check.
- Do not change DNS, WordPress, Gmail ownership, or unrelated dirty files.
- Do not claim the Apps Script feature is live until Max has redeployed both public and private web-app versions from his account.

## Review Focus

- A requested/booked row must never leak its amount, exact location, payment link, or lead identity through JSONP or rendered public text. Test in Task 2 and Task 5.
- A cross-location candidate must be rejected or marked travel-blocked when its rule is missing or its start/end cannot fit the required buffer. Test in Task 2 and Task 3.
- A stale or forged booking token must not reserve another row or bypass the current travel check. Test in Task 2.
- Shift-click, context-menu, keyboard, and mobile-visible controls must select the same date set and must never mutate requested/booked rows. Test in Task 4.
- A provisional estimate must be visibly provisional, snapshotted privately, and never trigger payment. Test in Task 2 and Task 5.

---

### Task 1: Establish backend domain tests and interfaces

**Files:**
- Create: integrations/google-sheets/Code.test.mjs
- Modify: integrations/google-sheets/Code.gs:1-30 only after the failing tests exist

**Interfaces:**
- Produces pure Apps Script functions that later tasks will keep callable from the VM test harness: travelRequirement_, estimateAvailability_, and toPublicAvailabilityRange_.
- Produces the public range contract { start, end, status, publicLocation, bookingType, bookingToken?, estimatedHourlyPrice?, estimatedTravelFee?, estimatedTotal? }.

- [ ] Step 1: Write failing tests for public projection and travel math

Create a Node test harness that reads Code.gs into a VM context with stubs for Utilities, Session, SpreadsheetApp, ContentService, LockService, and GmailApp. Add tests with these exact expectations:

~~~js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8')
const context = {
  Utilities: { formatDate: () => '2026-09-21', getUuid: () => 'test-key' },
  Session: { getScriptTimeZone: () => 'Europe/London' },
  SpreadsheetApp: {}, ContentService: {}, LockService: {}, GmailApp: {},
  console,
}
vm.runInNewContext(source, context)

test('same exact location has no travel requirement', () => {
  assert.deepEqual(context.travelRequirement_('Camden studio', 'Camden studio', []), {
    configured: true, minutes: 0, fee: 0,
  })
})

test('different locations use the configured rule', () => {
  assert.deepEqual(context.travelRequirement_('Camden studio', 'Kingston studio', [
    { fromLocation: 'Camden studio', toLocation: 'Kingston studio', minutes: 55, fee: '18' },
  ]), { configured: true, minutes: 55, fee: '18' })
})

test('public booked projection omits private and estimate fields', () => {
  const result = context.toPublicAvailabilityRange_({
    startTime: '11:00', endTime: '15:00', status: 'Booked',
    location: 'Camden studio', publicLocation: 'Camden', bookingType: 'Studio session',
    bookingKey: 'secret-row-key', price: '1000', paymentUrl: 'https://private.test/pay',
  })
  assert.deepEqual(result, {
    start: '11:00', end: '15:00', status: 'booked',
    publicLocation: 'Camden', bookingType: 'Studio session',
  })
})

test('available estimate includes travel fee and duration total', () => {
  assert.deepEqual(context.estimateAvailability_(
    { startTime: '16:00', endTime: '18:00', location: 'Kingston studio', price: '40' },
    { endTime: '15:00', location: 'Camden studio' },
    null,
    [{ fromLocation: 'Camden studio', toLocation: 'Kingston studio', minutes: 45, fee: '18' }],
  ), {
    eligible: true, travelMinutes: 45, travelFee: '18', hourlyPrice: '40', total: '98',
  })
})
~~~

- [ ] Step 2: Run the backend tests and verify they fail for missing interfaces

Run:

~~~bash
node --test integrations/google-sheets/Code.test.mjs
~~~

Expected: FAIL because travelRequirement_, estimateAvailability_, and toPublicAvailabilityRange_ are not defined yet. Do not add production implementations before observing this failure.

- [ ] Step 3: Add the smallest pure-function declarations needed by later tasks

Add the named function declarations to Code.gs with the exact return shapes used by the tests. Keep these functions independent of Spreadsheet services so the same rules are used by public projection and reservation validation.

- [ ] Step 4: Run the focused tests and confirm the domain contract is green

Run:

~~~bash
node --test integrations/google-sheets/Code.test.mjs
~~~

Expected: all four tests pass. If a test needs a service stub, add only the missing stub and rerun the focused command.

- [ ] Step 5: Commit the domain contract

~~~bash
git add integrations/google-sheets/Code.test.mjs integrations/google-sheets/Code.gs
git commit -m "test: define availability privacy and travel contracts"
~~~

### Task 2: Implement Apps Script data model, public projection, travel-aware reservation, and estimates

**Files:**
- Modify: integrations/google-sheets/Code.gs:15-230 for headers, lead snapshots, public reads, reservation, and bulk-safe helpers
- Modify: integrations/google-sheets/Code.gs:390-620 for public projection and travel calculation helpers
- Test: integrations/google-sheets/Code.test.mjs

**Interfaces:**
- AVAILABILITY_HEADERS appends Public location, Booking type, Booking key after the existing columns.
- LEAD_HEADERS appends Booking travel fee, Booking estimate total, Booking type, Booking public location after the existing columns.
- TRAVEL_RULE_HEADERS is ['From location', 'To location', 'Minutes', 'Fee', 'Updated at'].
- readAvailabilityRows_() returns normalized private rows with row, date, startTime, endTime, status, leadRow, location, publicLocation, bookingType, price, paymentUrl, and bookingKey.
- readTravelRules_() returns { row, fromLocation, toLocation, minutes, fee } records.
- estimateAvailability_(slot, previousBusy, nextBusy, rules) returns { eligible, reason, travelMinutes, travelFee, hourlyPrice, total }.
- toPublicAvailabilityRange_(slot, estimate) strips private fields and emits no estimate/token for requested, booked, or travel status.

- [ ] Step 1: Extend headers without moving existing sheet data

Change the constants so new headers are appended, not inserted between Location, Price, and Payment URL:

~~~js
var AVAILABILITY_HEADERS = [
  'Date', 'Time', 'Status', 'Lead row', 'Updated at', 'End time', 'Location', 'Price', 'Payment URL',
  'Public location', 'Booking type', 'Booking key',
];
var TRAVEL_RULES_SHEET_NAME = 'Travel rules';
var TRAVEL_RULE_HEADERS = ['From location', 'To location', 'Minutes', 'Fee', 'Updated at'];
~~~

Append the four lead snapshot headers after the current LEAD_HEADERS values. Keep ensureHeaders_ and header lookups by name so legacy sheets migrate on the next read/write.

- [ ] Step 2: Add row migration and token generation

Implement ensureAvailabilityKeys_() so every non-empty availability row has a Booking key. Generate it with Utilities.getUuid() and write only the missing key cell. Call it from readAvailabilityRows_() after getOrCreateSheet_(); never copy the exact location into Public location automatically.

Add readAvailabilityRows_() and make readAdminAvailability_() map its normalized records into the existing private dashboard fields plus publicLocation, bookingType, and bookingKey.

- [ ] Step 3: Add travel-rule persistence and calculation

Implement:

~~~js
function readTravelRules_() {}
function saveTravelRule(fromLocation, toLocation, minutes, fee) {}
function deleteTravelRule(rowNumber) {}
function travelRequirement_(fromLocation, toLocation, rules) {}
~~~

Require non-empty exact locations, minutes as an integer from 0 through 720, and fee as a non-negative GBP amount. Normalize matching by trimmed lowercase values while preserving the stored display text. Return { configured: true, minutes: 0, fee: 0 } for the same exact location. For a missing cross-location pair return { configured: false, minutes: 0, fee: '' }.

- [ ] Step 4: Implement two-sided eligibility and estimate calculation

Implement estimateAvailability_() using the nearest Requested/Booked row before and after the candidate on the same date. Reject a candidate when:

~~~text
previous.end + travel(previous.location, candidate.location).minutes > candidate.start
candidate.end + travel(candidate.location, next.location).minutes > next.start
~~~

Reject with a travel_not_configured reason when a different-location rule is missing. Same-location transitions consume zero time and fee. Calculate:

~~~text
estimated total = duration hours * hourly price + previous-to-candidate fee + candidate-to-next fee
~~~

Use two decimal GBP normalization. A blank base price does not make a slot ineligible: return an eligible slot with no estimate fields so the visitor sees “price to be confirmed” while the travel checks still apply.

- [ ] Step 5: Replace the public response with the safe workload projection

Change readAvailability_() so it returns safe ranges for Available, Requested, and Booked rows, plus synthetic travel ranges where configured travel time is required. Return Unavailable rows only to the private dashboard. Use toPublicAvailabilityRange_() as the only public serializer. For Available rows include the opaque token and estimate fields; for Requested/Booked/Travel omit them.

The public object must not contain these keys for busy ranges:

~~~js
['price', 'paymentUrl', 'location', 'leadRow', 'name', 'email', 'message']
~~~

Use publicLocation || 'Location to be confirmed' and bookingType || 'Booking details to be confirmed' for safe neutral labels.

- [ ] Step 6: Make reservation token- and travel-aware

Change doPost booking validation to require bookingToken and pass it to:

~~~js
reserveBookingSlot_(bookingToken, bookingDate, bookingTime, bookingEndTime)
~~~

Under the existing script lock, find exactly one row by token and matching date/time, require Available, recompute two-sided travel eligibility, and reject stale or ineligible requests. Do not use public location as an internal row selector.

- [ ] Step 7: Snapshot the provisional estimate privately

When reservation succeeds, append the existing private booking fields plus base hourly price, travel fee, estimated total, booking type, and public location to the lead row. Update sendCustomerConfirmation_() to say the amount is an estimate subject to Max's confirmation and that no payment was taken. Keep payment links private and do not include them in JSONP.

- [ ] Step 8: Run backend tests and syntax checks

Run:

~~~bash
node --test integrations/google-sheets/Code.test.mjs
node -e "const fs=require('fs'),vm=require('vm'); new vm.Script(fs.readFileSync('integrations/google-sheets/Code.gs','utf8')); console.log('Apps Script source syntax: valid')"
git diff --check
~~~

Expected: all domain tests pass, the syntax check prints Apps Script source syntax: valid, and git diff --check is silent.

- [ ] Step 9: Commit the backend integration

~~~bash
git add integrations/google-sheets/Code.gs integrations/google-sheets/Code.test.mjs
git commit -m "feat: add privacy-safe travel-aware availability"
~~~

### Task 3: Add public availability contract and utility tests

**Files:**
- Modify: app/src/utils/availability.ts
- Modify: app/src/utils/availability.test.ts

**Interfaces:**
- BookingStatus is 'available' | 'requested' | 'booked' | 'travel'.
- BookingRange contains start, end, status, publicLocation, bookingType, and optional bookingToken, estimatedHourlyPrice, estimatedTravelFee, estimatedTotal.
- normaliseAvailabilityResponse() drops malformed ranges and preserves estimate/token fields only when status === 'available'.
- isSelectableBookingRange(range) returns range.status === 'available' && Boolean(range.bookingToken).

- [ ] Step 1: Add failing TypeScript tests for the new public contract

Add tests that assert:

~~~ts
const result = normaliseAvailabilityResponse({
  ok: true,
  slots: [{ date: '2026-10-04', ranges: [
    {
      start: '16:00', end: '18:00', status: 'available',
      publicLocation: 'Kingston', bookingType: 'Studio session', bookingToken: 'slot-1',
      estimatedHourlyPrice: '40', estimatedTravelFee: '18', estimatedTotal: '98',
      price: '40', paymentUrl: 'https://private.test/pay', location: 'Exact room',
    },
    {
      start: '11:00', end: '15:00', status: 'booked',
      publicLocation: 'Camden', bookingType: 'Studio session',
      price: '1000', paymentUrl: 'https://private.test/pay', location: 'Exact room',
    },
  ] }],
})

assert.deepEqual(result['2026-10-04'], [
  {
    start: '16:00', end: '18:00', status: 'available',
    publicLocation: 'Kingston', bookingType: 'Studio session', bookingToken: 'slot-1',
    estimatedHourlyPrice: '40', estimatedTravelFee: '18', estimatedTotal: '98',
  },
  { start: '11:00', end: '15:00', status: 'booked', publicLocation: 'Camden', bookingType: 'Studio session' },
])
assert.equal(isSelectableBookingRange(result['2026-10-04'][0]), true)
assert.equal(isSelectableBookingRange(result['2026-10-04'][1]), false)
~~~

- [ ] Step 2: Run the focused TypeScript test and observe the failure

Run:

~~~bash
npm --prefix app test -- src/utils/availability.test.ts
~~~

Expected: FAIL because the new status fields and isSelectableBookingRange do not exist.

- [ ] Step 3: Implement strict normalization

Update BookingRange, normaliseRange(), and normaliseAvailabilityResponse() so unknown fields such as price, paymentUrl, location, and leadRow are never copied. Normalize estimate strings only for available ranges and return null for invalid time/status/token combinations.

- [ ] Step 4: Run the focused test and commit the utility contract

Run:

~~~bash
npm --prefix app test -- src/utils/availability.test.ts
~~~

Expected: all availability tests pass. Commit:

~~~bash
git add app/src/utils/availability.ts app/src/utils/availability.test.ts
git commit -m "feat: model safe availability ranges"
~~~

### Task 4: Implement private calendar selection, bulk editor, and travel-rule UI

**Files:**
- Modify: integrations/google-sheets/Admin.html:65-180 for styles and form markup
- Modify: integrations/google-sheets/Admin.html:185-590 for state, selection, editor, and server calls
- Create: integrations/google-sheets/Admin.test.mjs

**Interfaces:**
- state.selectedAvailabilityDates is an ordered array of YYYY-MM-DD keys.
- state.availabilityAnchorDate is the first date in the current Shift-click selection.
- getSelectedAvailabilityRows() returns { editableRows, lockedRows, dates }.
- serverCall('updateAvailabilitySelection', rowNumbers, changes) returns { availability, updatedRows, skippedRows, skippedReasons }.
- serverCall('saveTravelRule', fromLocation, toLocation, minutes, fee) returns normalized private travel rules.

- [ ] Step 1: Write failing structural dashboard tests

Create a lightweight source test that reads Admin.html and asserts the new interaction hooks exist and the old single-row prompt is gone:

~~~js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const html = fs.readFileSync(new URL('./Admin.html', import.meta.url), 'utf8')

test('dashboard exposes range editing and travel controls', () => {
  assert.match(html, /event\\.shiftKey/)
  assert.match(html, /contextmenu/)
  assert.match(html, /updateAvailabilitySelection/)
  assert.match(html, /saveTravelRule/)
  assert.doesNotMatch(html, /window\\.prompt\\(/)
})
~~~

- [ ] Step 2: Run the structural test and verify it fails

Run:

~~~bash
node --test integrations/google-sheets/Admin.test.mjs
~~~

Expected: FAIL because the current dashboard has window.prompt, no Shift-click selection, and no travel-rule controls.

- [ ] Step 3: Add calendar selection state and interactions

Add selectedAvailabilityDates, availabilityAnchorDate, and context-menu state. On normal click set one selected date; on Shift-click calculate every date between the anchor and clicked date inclusive. Add contextmenu handling that prevents the browser menu, selects the clicked date when necessary, and opens a menu positioned within the dashboard viewport. Close the menu on Escape, outside pointerdown, or selection change.

Add visible Edit selected and Clear selection controls. The visible control must be disabled when selectedAvailabilityDates is empty, so keyboard and touch users can complete the same action without a right-click.

- [ ] Step 4: Replace single-row price prompt with the bulk editor

Render an accessible dialog or inline editor with one checkbox per mutable field: price, exact location, public location, and booking type. Include a Clear price checkbox and an optional exact-location filter. Build the changes object only from checked fields:

~~~js
{
  setPrice: true,
  clearPrice: false,
  price: '40',
  location: 'Kingston studio',
  publicLocation: 'Kingston',
  bookingType: 'Studio session',
  locationFilter: 'Camden studio',
}
~~~

Submit selected editable row numbers to updateAvailabilitySelection. Display updated and skipped counts; list locked rows as unchanged. Refresh the calendar and day panel from the returned availability array.

- [ ] Step 5: Add public metadata to the publish form

Add required Public location and Booking type inputs to the existing publish form. Call:

~~~js
serverCall(
  'saveAvailabilitySlots',
  fromDate, toDate, startTime, endTime, location, price, paymentUrl,
  publicLocation, bookingType,
)
~~~

Keep the exact location and payment link private in the dashboard. Show public location/type in the private row details so Max can audit what visitors will see.

- [ ] Step 6: Add travel-rule form and private list

Add a Travel rules panel with exact From location, To location, Minutes, and Fee fields. Render current rules with Edit and Delete actions. Call saveTravelRule and deleteTravelRule, then refresh state.data.travelRules. Explain that same-location travel is automatic zero and an absent cross-location rule causes confirmation-required status.

- [ ] Step 7: Run dashboard tests and commit the private UI

Run:

~~~bash
node --test integrations/google-sheets/Admin.test.mjs
git diff --check
~~~

Expected: the structural test passes, no prompt remains, and the diff is clean. Commit:

~~~bash
git add integrations/google-sheets/Admin.html integrations/google-sheets/Admin.test.mjs
git commit -m "feat: add bulk availability and travel controls"
~~~

### Task 5: Render public busy windows and provisional estimates in the booking drawer

**Files:**
- Modify: app/src/components/ContactDrawer.tsx:55-165 for range state and selection logic
- Modify: app/src/components/ContactDrawer.tsx:210-470 for calendar, busy-window list, estimates, and hidden booking token
- Modify: app/src/components/ContactDrawer.tsx:220-300 for submission validation and reset
- Modify: app/src/App.css or the existing booking styles in app/src/index.css only where the rendered component requires new classes
- Modify: app/src/utils/availability.test.ts for selection and estimate formatting tests

**Interfaces:**
- bookingToken is the only availability identity submitted to Apps Script.
- availableRanges filters status === 'available' and bookingToken.
- busyRanges filters status !== 'available' and renders no estimate fields.
- formatBookingEstimate(range, durationHours) returns a user-facing provisional estimate string and never formats an estimate for busy ranges.

- [ ] Step 1: Add failing utility tests for selectable and busy rendering rules

Add tests for a booked range with a price-like unknown field being rendered without currency and an available range producing an estimate:

~~~ts
assert.equal(formatBookingEstimate({
  status: 'available', estimatedHourlyPrice: '40', estimatedTravelFee: '18', estimatedTotal: '98',
}, 2), 'Estimated £40/hour + £18 travel · £98 total')
assert.equal(formatBookingEstimate({ status: 'booked' }, 4), '')
~~~

- [ ] Step 2: Run the focused test and observe the failure

Run:

~~~bash
npm --prefix app test -- src/utils/availability.test.ts
~~~

Expected: FAIL because formatBookingEstimate does not exist.

- [ ] Step 3: Add booking-token state and strict available/busy partitions

Add bookingToken state and reset it whenever date, location, start, end, interest, or drawer state changes. Set the hidden form field bookingToken from the selected available range. Do not submit exact location; the selected public label may be retained only for visitor-facing copy.

When a selected date has multiple available ranges with the same public location/start/end, require a booking-type choice before assigning the token. The submit guard must require isSelectableBookingRange(selectedRange).

- [ ] Step 4: Render all safe busy ranges without exposing estimates

Keep dates containing only Requested/Booked/Travel ranges clickable so visitors can understand Max's workload. Under the selected date, render each busy range as 11:00–15:00 · Camden · Studio session or Travel / transit, with no price, payment URL, name, email, or exact location. Available ranges remain the only source for start/end select options.

- [ ] Step 5: Render provisional available estimates and confirmation copy

For an available selected range, show its hourly estimate, travel fee, and estimated total for the chosen duration. Use copy equivalent to:

~~~text
Estimated price · subject to Max confirming the booking. No payment is taken here.
~~~

Do not render any estimate for a range after it becomes Requested or Booked. Keep payment collection out of this flow.

- [ ] Step 6: Run frontend tests and commit the public booking changes

Run:

~~~bash
npm --prefix app test
npm --prefix app run typecheck
npm --prefix app run lint
~~~

Expected: all tests pass, TypeScript exits 0, and Oxlint reports no errors. Commit:

~~~bash
git add app/src/components/ContactDrawer.tsx app/src/utils/availability.ts app/src/utils/availability.test.ts app/src/App.css app/src/index.css
git commit -m "feat: show privacy-safe busy booking windows"
~~~

### Task 6: Update integration documentation and run complete local verification

**Files:**
- Modify: integrations/google-sheets/README.md:25-165
- Modify: app/src/utils/availability.test.ts only if a verified regression exposes a contract mismatch

- [ ] Step 1: Document the public/private field boundary

Update the README to state:

~~~text
Available public ranges may include a provisional hourly price, travel fee, and duration total.
Requested, Booked, and Travel ranges never include price, payment URL, exact location, or lead details.
The public form submits bookingToken; it never submits the internal Location as the reservation key.
~~~

Document the appended Availability columns, Travel rules sheet, same-location zero travel rule, missing-rule confirmation behavior, and estimate-confirmation/no-payment behavior.

- [ ] Step 2: Run every automated check from the repository root

Run:

~~~bash
node --test integrations/google-sheets/Code.test.mjs integrations/google-sheets/Admin.test.mjs
npm --prefix app test
npm --prefix app run typecheck
npm --prefix app run lint
npm --prefix app run build
node -e "const fs=require('fs'),vm=require('vm'); new vm.Script(fs.readFileSync('integrations/google-sheets/Code.gs','utf8')); console.log('Apps Script source syntax: valid')"
git diff --check
~~~

Expected: every command exits 0; the frontend test output reports zero failures; the build writes a production bundle; and the Apps Script syntax command prints Apps Script source syntax: valid.

- [ ] Step 3: Review the diff against the approved spec

Check each acceptance criterion in the spec against the changed files. Confirm no window.prompt remains in the availability editor, no public TypeScript path reads location, price, paymentUrl, or leadRow from an API range, and no test uses a real enquiry submission.

- [ ] Step 4: Commit the documentation and verification baseline

~~~bash
git add integrations/google-sheets/README.md
git commit -m "docs: describe privacy-safe booking estimates"
~~~

### Task 7: Validate the rendered public flow and deploy the frontend

**Files:**
- No new committed files; screenshots and temporary Playwright scripts stay outside the repository.
- Deployment artifact: GitHub Pages workflow on main.

**Environment:** The Browser plugin is not listed in the current session, so use the repository's regular Playwright fallback and record that reason in the QA handoff.

- [ ] Step 1: Start the production-like frontend server

Run:

~~~bash
npm --prefix app run build
npm --prefix app run preview -- --host 127.0.0.1
~~~

Use the printed local URL as the exact host for the Playwright checks.

- [ ] Step 2: Exercise the public booking flow at desktop and mobile widths

Use a temporary script outside the repo that:

1. opens the homepage and confirms it is not blank;
2. captures console errors and warnings;
3. opens the contact drawer with Booking / studio session selected;
4. injects a fixture response only for local UI testing containing one Available range, one Booked range, and one Travel range;
5. confirms booked/travel text is visible without currency symbols, email-like strings, payment URLs, or exact internal location text;
6. confirms the Available range can be selected and the hidden bookingToken is present;
7. confirms the estimate says it is subject to confirmation and no payment is requested;
8. repeats the visual check at a 390px viewport.

Save screenshots under /tmp/max-portfolio-qa/, never inside the repository.

- [ ] Step 3: Push the source and wait for Pages deployment

Before pushing, run:

~~~bash
git status --short --branch
git log -5 --oneline
git push origin main
gh run list --workflow "Deploy to GitHub Pages" --branch main --limit 1
~~~

Watch the returned run to completion:

~~~bash
gh run watch "$(gh run list --workflow \"Deploy to GitHub Pages\" --branch main --limit 1 --json databaseId --jq '.[0].databaseId')" --interval 10 --exit-status
~~~

Expected: lint, typecheck, test, build, artifact upload, and deploy all pass. Ignore only the known GitHub Actions Node 20 deprecation annotation if the job itself succeeds.

- [ ] Step 4: Verify the deployed frontend and distinguish backend state

Run:

~~~bash
curl -fsSL --max-time 30 -H 'Cache-Control: no-cache' https://maxudovichenko.art/ | rg -q '<title|Max|portfolio'
gh api repos/udovimax/portfolio-website/pages --jq '{cname,https_enforced,status}'
~~~

Expected: the live site contains meaningful page content and Pages reports cname maxudovichenko.art, https_enforced true, and status built. Do not report the new public data contract as live until Max redeploys Code.gs.

- [ ] Step 5: Commit any QA-only source corrections and prepare handoff

If rendered QA finds a source defect, return to the owning task, add a failing regression test, fix it, rerun the complete checks, and push a new commit. Do not edit the live Google Sheet or submit a real enquiry during QA.

### Task 8: Max Apps Script redeploy and live acceptance handoff

**Files:**
- Handoff: integrations/google-sheets/Code.gs
- Handoff: integrations/google-sheets/Admin.html
- Handoff: integrations/google-sheets/README.md

- [ ] Step 1: Give Max the exact two source files and deployment split

Tell Max to replace both Apps Script files from the repository, save, and update both deployments:

~~~text
Public deployment: Execute as Me, Who has access Anyone.
Private dashboard deployment: Execute as Me, Who has access Only myself.
~~~

Run authorizeGmail only if Apps Script requests permission again. Do not change the public endpoint URL in socials.json unless Max creates a different public deployment URL.

- [ ] Step 2: Have Max configure travel rules and metadata

Max must add rough public location and booking type to existing availability rows, then create exact-location travel rules with minutes and fees. Same exact location needs no rule. A missing pair must remain confirmation-required rather than receiving an invented default.

- [ ] Step 3: Run the live acceptance sequence

After Max redeploys, verify:

~~~text
1. Open the private dashboard while signed in as Max.
2. Shift-click a date range and use Edit selected to set an hourly price.
3. Right-click the range and repeat the edit; confirm the keyboard-visible button does the same.
4. Confirm Requested and Booked rows report locked/skipped and remain unchanged.
5. Open the public booking drawer and inspect a day containing a booked Camden session.
6. Confirm the booked period shows duration, Camden/rough location, and booking type, without name or amount.
7. Confirm a different-location candidate is blocked during the configured travel buffer.
8. Confirm a same-Camden candidate can begin immediately after the booked session when no other constraint applies.
9. Confirm an Available candidate shows an estimate plus subject-to-confirmation copy and submitting it does not take payment.
~~~

- [ ] Step 4: Update the goal only after both source and provider state are evidenced

Use update_goal with status complete only after local tests, Pages deployment, Max's Apps Script redeployment, and the live acceptance sequence all have evidence. If the source is complete but Max has not redeployed Apps Script, leave the goal active and report the provider handoff as the remaining action.

## Plan Self-Review

- Spec coverage: Tasks 1–2 cover the data model, travel rules, public projection, estimates, reservation lock, and private lead snapshot; Task 3 covers the typed public contract; Task 4 covers Shift-click/context-menu/keyboard bulk editing; Task 5 covers public busy windows and estimates; Tasks 6–8 cover documentation, rendered QA, Pages deployment, and Max's Apps Script handoff.
- Placeholder scan: no implementation step depends on an unspecified file, invented endpoint, or unbounded “handle edge cases” instruction.
- Type consistency: bookingToken, publicLocation, bookingType, estimatedHourlyPrice, estimatedTravelFee, and estimatedTotal are named consistently across Apps Script, TypeScript, tests, and handoff.
- Review focus: every listed privacy, travel, token, interaction, and estimate failure mode has a named test or live acceptance step.
