# Max-owned enquiry sheet and private dashboard

The website keeps FormSubmit as its email delivery path and can also make a
best-effort copy of each enquiry to a Google Sheet. The Sheet and Apps Script
must be owned by Max so he controls the lead data, replies, and deployments.

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

## Max-only dashboard

Create a second deployment from the same Apps Script project:

1. Choose `Deploy → New deployment`, select `Web app`.
2. Set **Execute as: Me**.
3. Set **Who has access: Only myself**.
4. Deploy and open the new `/exec` URL while signed in to
   `maxudovichenko.prod@gmail.com`.
5. Bookmark that private URL. It provides the enquiries dashboard and must not
   be changed to public access.

The first time Max sends a reply from the dashboard, Google will ask him to
authorise Gmail access for the script. This is required so replies come from
his account rather than from a third-party service.

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
`Priority`, `Notes`, `Follow-up`, `Last replied at`

The `Interest` field is supplied by the home-page funnel and currently has
three routes: production/engineering, artist/music collaboration, and
research/photography. Existing seven-column `Leads` tabs are upgraded with the
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
- If the Sheet is unavailable, the form still submits to FormSubmit and the
  drawer still shows its normal in-place confirmation.
