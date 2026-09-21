# Availability Bulk Editing and Public Privacy Specification

## Outcome

Give Max a safe calendar workflow for managing availability across dates,
locations, prices, booking types, and travel while making the anonymous public
booking feed privacy-safe. The private dashboard remains the source of
control; the public site receives enough information to choose a window,
understand how busy Max is, and see a provisional estimate that Max can
confirm or change before payment.

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
7. Add a private travel-rule editor for exact internal location pairs. Each
   rule stores travel minutes and a one-way travel fee. A transition between
   the same exact location is always zero minutes and zero fee; a different
   location uses the configured pair rule.

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

Add a private `Travel rules` sheet with these columns:

- `From location`;
- `To location`;
- `Minutes`;
- `Fee`;
- `Updated at`.

Travel rules are private operational data. They are never included in the
public response. A missing cross-location rule makes the candidate window
require confirmation in the private dashboard rather than inventing a travel
time or fee.

### Public response and rendering

The anonymous JSONP response will include future `Available`, `Requested`, and
`Booked` windows plus safe synthetic travel-buffer ranges, with this shape:

```text
date
  ranges[]
    start
    end
    status: available | requested | booked | travel
    publicLocation
    bookingType
    bookingToken                 # available only
    estimatedHourlyPrice       # available only
    estimatedTravelFee          # available only
    estimatedTotal              # available only, for this window duration
```

For `Requested`, `Booked`, and synthetic `Travel / transit` ranges, all
estimate and booking-token fields are omitted. It will never include
`paymentUrl`, exact `Location`, `leadRow`, names, emails, or any other lead
data. `Unavailable` rows remain excluded.

On the public site:

- `Available` ranges remain selectable for a booking request.
- `Requested` and `Booked` ranges are visible only as non-selectable busy
  windows, with duration, rough public location, and booking type.
- `Available` ranges can show a clearly-labelled estimate consisting of the
  hourly price, any required travel fee, and the estimated total for the
  selected duration. The UI must say that Max confirms the final price and
  travel requirements; submitting the form never charges the visitor.
- An `Available` range with no base price remains bookable as “price to be
  confirmed”; missing price must not hide a valid window or bypass travel
  checks.
- Requested and booked ranges never show their historical estimate or price.
- The hidden form value sends `bookingToken`, not the internal location. The
  Apps Script reservation checks that token, date, time, and availability status
  atomically before creating the lead.
- If the feed contains no public metadata, the UI uses neutral confirmation
  copy rather than falling back to the exact private location.

## Backend behavior

- Add a private `updateAvailabilitySelection` Apps Script function that accepts
  row numbers and a changes object, validates the signed-in admin, filters out
  requested/booked rows, and updates all selected rows under a script lock.
- Add private travel-rule CRUD with the same admin check and script lock. Rules
  use exact internal locations; same-location transitions bypass the table.
- Validate prices with the existing GBP normalization rules. A checked
  clear-price operation stores an empty value; an unchecked price field is left
  untouched.
- Validate booking type and public location as bounded text cells and protect
  them from formula injection with the existing safe-cell handling.
- Generate booking keys for new and legacy rows. Reservation accepts the token
  as the authoritative selector and rejects stale, mismatched, or non-Available
  requests.
- Before publishing a candidate as available, and again inside the booking
  reservation lock, compare it with neighbouring Requested/Booked rows on the
  same date. A different-location transition consumes the configured travel
  minutes and fee; a same-location transition consumes neither. Check both the
  previous-to-candidate and candidate-to-next directions.
- Calculate an available candidate's estimate as its base hourly price plus
  the required travel fee and a duration-based total. When a visitor submits,
  snapshot the estimate and travel fee into the private lead row. The estimate
  remains subject to Max's confirmation and no payment is taken automatically.
- Keep the private dashboard response rich enough for Max to see exact
  location, price, payment URL, lead row, and status. The public response must
  use a separate projection and must not reuse that private object.

## Error and state handling

- Bulk edits report how many rows were changed and how many locked rows were
  skipped; they never claim that a locked row was changed.
- Overlapping windows and stale booking tokens continue to fail atomically with
  an actionable message.
- A candidate that would overlap a required travel buffer is not selectable;
  the public schedule can show the resulting neutral `Travel / transit` busy
  range with `status: travel`, without exposing the destination, fee, or
  another customer's details.
- A failed public feed leaves booking unavailable and directs visitors to email
  Max; it must not invent dates or prices.
- Right-click menus close on Escape, outside click, or selection change, and
  remain usable with keyboard focus.

## Testing and QA

1. Add regression tests for the safe public projection: requested/booked ranges
   contain no estimate, payment URL, exact location, lead row, or personal lead
   fields; available ranges contain only their own provisional estimate plus
   safe status/location/type metadata.
2. Add tests for selection-range calculation, locked-row filtering, change-mask
   semantics, price clearing, booking-token matching, same-location bypass,
   cross-location travel buffers, and estimate calculation.
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
- Max must configure the private travel rules before relying on automatic
  cross-location estimates. Until a pair is configured, the dashboard reports
  that the estimate needs confirmation rather than guessing.
- Verify the public endpoint after the Apps Script deployment. Do not claim the
  new private editor is live until the new dashboard version is opened while
  signed in as Max and the bulk edit is exercised.

## Non-goals

- No public historical price display or payment collection is added. A current
  available window may show a provisional estimate only.
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
3. The public API contains no estimate, payment URL, exact location, lead row,
   or personal details for requested/booked rows; available rows contain only
   their own clearly-labelled provisional estimate and safe
   status/duration/location/type metadata.
4. The public form can still reserve an Available row reliably using the opaque
   booking token, cannot reserve Requested or Booked rows, and rejects windows
   that cannot accommodate required cross-location travel.
5. Existing rows migrate without column shifts, and rows lacking optional
   public metadata remain safe and usable.
6. A provisional estimate is snapshotted privately, is marked subject to Max's
   confirmation, and never triggers payment automatically.
7. Automated and rendered verification pass before the frontend deployment is
   reported as successful.
