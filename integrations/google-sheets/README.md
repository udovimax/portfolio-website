# Max-owned enquiry sheet and private dashboard

The website keeps FormSubmit as its fallback enquiry delivery path and also
records each enquiry in Max's Google Sheet. The Apps Script sends the customer
an acknowledgement from Max's Gmail account, so the customer has a real email
thread they can mark as safe. The Sheet and Apps Script must be owned by Max so
he controls the lead data, replies, booking slots, and deployments.

## Max’s one-time setup

1. While signed into Max’s Google account, create a new Google Sheet named
   `Max Portfolio Enquiries`.
2. Open `Extensions → Apps Script`.
3. Replace the starter code with [`Code.gs`](./Code.gs), add the [`Admin.html`](./Admin.html)
   file to the Apps Script project, and save both files. Do not run `doPost`
   manually; the first real enquiry will authorize the public web app against
   the spreadsheet.
4. Keep the public web-app deployment set to **Execute as: Me** and **Who has
   access: Anyone**. This is the endpoint used by the public contact form and
   anonymous page-view counter.
5. Copy the public web-app URL. It normally ends in `/exec`.
6. Paste that URL into `app/public/content/socials.json` as
   `googleSheetsEndpoint`, commit it, and push `main`.

## Booking availability

The site shows booking date/time fields only when a visitor chooses `Booking /
studio session`. Max controls the published slots in an `Availability` tab in
the same Sheet. The script creates the tab automatically. The easiest way to
publish availability is the **Booking availability** calendar at the top of the
private dashboard. Choose a month, click a day, then inspect that day’s windows
underneath the calendar. Shift-click selects an inclusive date range; the
visible **Edit selected windows** button and the day context menu open the same
bulk editor. `Requested` and `Booked` rows are shown but locked, while
`Unavailable` rows remain private history. The **Publish a new window** form
can create one window or repeat the same window across a date range. Max can
mark an unused window unavailable and later use **Restore** to reopen it.

The Sheet remains the source of truth and can also be edited manually when
needed, using:

`Date` = `2026-09-05`, `Time` = `14:00`, `End time` = `16:00`, `Status` = `Available`, `Location` = `Kingston University studio`, `Price` = `20`, `Payment URL` = `https://paypal.me/maksosshelbe`, `Public location` = `Kingston`, `Booking type` = `Studio session`

The existing `Availability` columns stay in place. The script appends `Public
location`, `Booking type`, and an opaque `Booking key`; older rows receive a
key automatically on the next read. `Location`, `Price`, `Payment URL`, `Lead
row`, and the key are private fields. A missing public label uses neutral
fallback text and never copies the exact internal location.

The public availability response includes future `Available`, `Requested`,
`Booked`, and neutral `Travel / transit` ranges. `Unavailable` rows remain
private. Busy and travel ranges expose only their duration, rough public
location, and booking type; they never expose `price`, `paymentUrl`, exact
`location`, `leadRow`, names, email addresses, or messages. Available ranges
carry only their own opaque `bookingToken` and, when a price is configured,
clearly-labelled provisional hourly, travel-fee, and duration-total estimates.
An available row with no price remains bookable as “price to be confirmed”.

The visitor chooses a date, then an available start/end window and, when
needed, a rough public location or booking type. The form submits
`bookingToken`, never the internal `Location`, as the reservation identity.
The Apps Script lock rechecks the token, date/time, status, and travel fit
before creating a lead. When a visitor submits a booking request, the script
locks and changes that row to `Requested`, which prevents another visitor from
selecting it. In the private dashboard, changing the enquiry status to
`Booked` or `Complete` keeps it unavailable. Changing it to `Declined` releases
the slot back to `Available`.

New dashboard windows require an exact internal location, a rough public
location, and a booking type. Price and payment URL are optional: leave price
blank when Max needs to quote after reviewing the enquiry, and leave payment
URL blank until the correct payment destination is confirmed. The booking
record snapshots the location, price, payment URL, public metadata, travel fee,
and provisional total from the reserved row, so later edits do not change the
historical enquiry. The customer confirmation states that the amount is an
estimate subject to Max’s confirmation, that no payment was taken, and that
the stored payment URL is not exposed before confirmation.

Travel rules are stored privately in a `Travel rules` tab with columns `From
location`, `To location`, `Minutes`, `Fee`, and `Updated at`. A transition
between the same exact internal location is automatically zero minutes and
zero fee. A different-location transition needs its configured one-way rule;
without one, the candidate stays confirmation-required and is not offered as
an automatically bookable public window. When a configured travel buffer sits
between busy windows, the public feed shows only a neutral `Travel / transit`
range and never shows the fee or destination.

The calendar is a dashboard view over the same `Availability` sheet; it is not
a second source of truth. Clicking **Mark unavailable** changes an unused
`Available` row to `Unavailable` without deleting it. Clicking **Restore**
changes that unused row back to `Available`. This preserves the audit history
and makes it clear why an old slot is no longer visible to visitors.

Do not publish overlapping windows for the same day. The dashboard checks for
overlaps before adding a date or date range and reports which day conflicts.
Older availability rows without an `End time` are treated as one-hour windows
so existing bookings continue to work.

The editor does not invent studio names, prices, travel rules, or payment
links. Max must enter the confirmed venue and commercial terms when publishing
each window. Kingston University publicly describes its music facilities and
venue-hire contact route, but does not publish a general external hourly music
studio rate on the pages reviewed; do not publish `£20/hour` until Max confirms
that rate and the university permits the arrangement.

The form also validates email addresses in the browser and again in Apps
Script. A booking submission without a currently published slot is rejected by
the Apps Script endpoint, even if someone bypasses the website UI.

### Public availability health check

The public web-app deployment must serve `doGet` from the current `Code.gs`
version. A direct request with `action=availability`, a future `from` date, and
a JSONP `callback` should return JavaScript containing `{ ok: true, slots: [] }`
or the current safe public ranges. If it instead returns `Script function not
found: doGet`, the source file is newer than the live Apps Script deployment:
save the files, create a new version, and update the public deployment while
signed in to Max's account. Do not work around this by inventing public slots
in the website bundle. Inspect the response before reporting it as live: busy
ranges must contain no payment URL, exact location, price, or lead data.

## Max-only dashboard

Create a second deployment from the same Apps Script project:

1. Choose `Deploy → New deployment`, select `Web app`.
2. Set **Execute as: Me**.
3. Set **Who has access: Only myself**.
4. Deploy and open the new `/exec` URL while signed in to
   `maxudovichenko.prod@gmail.com`.
5. Bookmark that private URL. It provides the enquiries dashboard and must not
   be changed to public access.

Before using the Reply button, Max must grant Gmail permission once:

1. In the Apps Script editor, select `authorizeGmail` from the function menu.
2. Click **Run**.
3. Review the Google permission screen and choose Max's account.
4. Click **Allow**.

This same permission is used by the public endpoint to send each customer a
confirmation email containing their enquiry type and, for bookings, their
requested date and time. After replacing `Code.gs`, Max must run
`authorizeGmail` again if Google asks for permission, then update both the
public and private web-app deployments to the new version.

The function only checks that Max is signed in and requests Gmail access; it
does not send an email. This is required so later replies come from his account
rather than from a third-party service. If the dashboard shows a Gmail
permission error, repeat these steps and then refresh the private dashboard.

The dashboard lets Max:

- see new, total, replied, and booked enquiry counts;
- filter the lead list by status in the workflow he controls;
- update status, priority, notes, and follow-up date;
- write and send a reply from his Gmail account;
- see anonymous page-view totals for the last 30 days by page.

The dashboard is hosted by Apps Script rather than the public GitHub Pages
bundle. The public site may link to it later, but the private deployment and
Google account check are the actual security boundary.

The first successful enquiry creates or extends a `Leads` tab with these columns:

`Received at`, `Name`, `Email`, `Interest`, `Message`, `Subject`, `Status`,
`Priority`, `Notes`, `Follow-up`, `Last replied at`, `Booking date`,
`Booking time`, `Confirmation sent`, `Project URL`, `Booking end time`,
`Booking location`, `Booking price`, `Payment URL`, `Booking travel fee`,
`Booking estimate total`, `Booking type`, `Booking public location`

The `Interest` field is supplied by the contact form. Artist/music
collaboration enquiries require a `Project URL`; general, booking, and
production enquiries may include one optionally. Booking enquiries also store
the requested start and end time. Existing `Leads` tabs are extended with the
new workflow columns automatically when the script receives a request or the
dashboard opens.

The site creates an `Analytics` tab automatically. It stores only timestamp,
page ID, and path; it does not use cookies or collect names, email addresses,
IP addresses, or full referrers.

## Ownership and safety

- Do not paste the Web app URL into source code outside `socials.json`.
- Do not put a Google API key or service-account credential in the website.
- Keep the Apps Script deployment owned by Max’s account.
- Keep the dashboard deployment set to **Only myself**; a hidden link is not a
  security measure.
- The dashboard checks the signed-in Google account against
  `maxudovichenko.prod@gmail.com` before returning data or sending mail.
- If the Sheet is unavailable, the form still submits to FormSubmit, but the
  booking availability and customer confirmation features cannot operate.
- Do not publish arbitrary availability rows without checking Max's real
  schedule; the sheet is the source of truth for bookable times.
