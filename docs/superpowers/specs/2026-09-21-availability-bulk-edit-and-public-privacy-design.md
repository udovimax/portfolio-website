# Availability Bulk Editing and Public Privacy Specification

## Outcome

Give Max a safe calendar workflow for managing availability across dates,
locations, prices, and booking types while making the anonymous public booking
feed privacy-safe. The private dashboard remains the source of control; the
public site receives only the minimum information needed to choose or
understand a booking window.

## Current evidence

- `Admin.html` currently selects one day at a time and edits one unused row's
  price through a prompt.
- `Code.gs` stores exact location, price, payment URL, lead row, and status in
  the `Availability` sheet.
- The public `availability` response currently returns only `Available` rows,
  including `price`, `paymentUrl`, and the exact `Location` value.
- The public contact drawer treats every returned range as selectable and
  displays the returned location and price.
- Requested and booked rows are private today, so the public site cannot show
  truthful busy periods or their safe category metadata.

## Scope

### Private dashboard interaction

1. Keep a normal click as the inspect/select-one-day action.
2. Add Shift-click selection for an inclusive date range. A date selection
   targets all existing availability rows on those dates; it does not silently
   create new rows.
3. Add a custom context menu on a selected day/date range with an accessible,
   visible **Edit selected windows** action. The same action is available as a
   normal button so the workflow does not depend on right-click or a pointer.
4. The bulk editor shows the selected date range and matching row count and
   lets Max independently choose which fields to change:
   - GBP/hour, including an explicit clear-price option for “price on request”;
   - exact internal location;
   - rough public location;
   - booking type, such as Studio session or Project review meeting.
5. An optional exact-location filter can restrict the bulk change when selected
   dates contain multiple locations. Only `Available` and `Unavailable` rows
   can be changed. `Requested` and `Booked` rows are shown as locked and are
   excluded from mutations.
6. The existing publish form gains rough public location and booking type so
   newly-created ranges are immediately safe and understandable on the public
   site. It continues to require an internal location for reservation matching.

### Availability data model

Keep existing columns in place and append these columns to the `Availability`
sheet so existing data is not shifted:

- `Public location` — intentionally coarse text shown to visitors;
- `Booking type` — the public category for the window;
- `Booking key` — an opaque per-window token used to reserve a specific row
  without exposing the exact internal location.

The existing `Location`, `Price`, `Payment URL`, `Lead row`, and status remain
private fields. On first read/write after deployment, missing headers are added
and existing rows receive a booking key. Existing rows with no public location
or booking type remain usable but display a neutral “Location to be confirmed”
or “Booking details to be confirmed” label until Max fills those fields.

### Public response and rendering

The anonymous JSONP response will include only future `Available`, `Requested`,
and `Booked` windows, with this safe shape:

```text
date
  ranges[]
    start
    end
    status: available | requested | booked
    publicLocation
    bookingType
    bookingToken
```

It will never include `price`, `paymentUrl`, `Location`, `leadRow`, names,
emails, or any other lead data. `Unavailable` rows remain excluded.

On the public site:

- `Available` ranges remain selectable for a booking request.
- `Requested` and `Booked` ranges are visible only as non-selectable busy
  windows, with duration, rough public location, and booking type.
- No price or payment language is rendered in the public booking UI.
- The hidden form value sends `bookingToken`, not the internal location. The
  Apps Script reservation checks that token, date, time, and availability status
  atomically before creating the lead.
- If the feed contains no public metadata, the UI uses neutral confirmation
  copy rather than falling back to the exact private location.

## Backend behavior

- Add a private `updateAvailabilitySelection` Apps Script function that accepts
  row numbers and a changes object, validates the signed-in admin, filters out
  requested/booked rows, and updates all selected rows under a script lock.
- Validate prices with the existing GBP normalization rules. A checked
  clear-price operation stores an empty value; an unchecked price field is left
  untouched.
- Validate booking type and public location as bounded text cells and protect
  them from formula injection with the existing safe-cell handling.
- Generate booking keys for new and legacy rows. Reservation accepts the token
  as the authoritative selector and rejects stale, mismatched, or non-Available
  requests.
- Keep the private dashboard response rich enough for Max to see exact
  location, price, payment URL, lead row, and status. The public response must
  use a separate projection and must not reuse that private object.

## Error and state handling

- Bulk edits report how many rows were changed and how many locked rows were
  skipped; they never claim that a locked row was changed.
- Overlapping windows and stale booking tokens continue to fail atomically with
  an actionable message.
- A failed public feed leaves booking unavailable and directs visitors to email
  Max; it must not invent dates or prices.
- Right-click menus close on Escape, outside click, or selection change, and
  remain usable with keyboard focus.

## Testing and QA

1. Add regression tests for the safe public projection: no price, payment URL,
   exact location, lead row, or personal lead fields can appear in the public
   response; available/requested/booked statuses and safe metadata survive.
2. Add tests for selection-range calculation, locked-row filtering, change-mask
   semantics, price clearing, and booking-token matching.
3. Keep existing frontend tests, lint, typecheck, production build, and Apps
   Script syntax validation passing.
4. Validate the public live flow at desktop and mobile sizes: open Booking /
   studio session, select a date, confirm available windows are selectable,
   confirm busy windows contain no currency or personal details, and inspect
   console health.
5. Validate the private dashboard source structurally and, once Max deploys
   the Apps Script files, have Max exercise Shift-click, right-click/keyboard
   edit, locked booked rows, and the public booking feed.

## Deployment and migration

- Commit the source changes and deploy the GitHub Pages frontend through the
  existing workflow.
- Max must replace both `Code.gs` and `Admin.html` in his Apps Script project,
  save, and publish a new version for both deployments: public access remains
  `Execute as: Me / Anyone`; the dashboard remains `Execute as: Me / Only
  myself`.
- Verify the public endpoint after the Apps Script deployment. Do not claim the
  new private editor is live until the new dashboard version is opened while
  signed in as Max and the bulk edit is exercised.

## Non-goals

- No public price display or payment collection is added.
- No names, emails, lead IDs, exact private locations, or customer messages are
  exposed publicly.
- No drag-and-drop timeline or automatic creation of availability rows is
  included in this iteration.
- No changes are made to DNS, WordPress, Gmail, or the separate lead-reply
  workflow beyond the booking fields required for this contract.

## Acceptance criteria

1. Max can select one or more dates and apply a chosen price, exact location,
   rough public location, or booking type to existing unused rows without
   changing requested/booked history.
2. Max can perform the same action via a keyboard-visible control when a
   context-menu gesture is unavailable.
3. The public API contains no price, payment URL, exact location, lead row, or
   personal details and includes safe status/duration/location/type metadata.
4. The public form can still reserve an Available row reliably using the opaque
   booking token and cannot reserve Requested or Booked rows.
5. Existing rows migrate without column shifts, and rows lacking optional
   public metadata remain safe and usable.
6. Automated and rendered verification pass before the frontend deployment is
   reported as successful.
