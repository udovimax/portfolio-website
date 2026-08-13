# Max-owned enquiry sheet

The website keeps FormSubmit as its email delivery path and can also make a
best-effort copy of each enquiry to a Google Sheet. The Sheet and Apps Script
must be owned by Max so he controls the lead data and the deployment.

## Max’s one-time setup

1. While signed into Max’s Google account, create a new Google Sheet named
   `Max Portfolio Enquiries`.
2. Open `Extensions → Apps Script`.
3. Replace the starter code with [`Code.gs`](./Code.gs) and save it. Do not run
   `doPost` manually; the first real enquiry will authorize the web app against
   the spreadsheet.
4. Choose `Deploy → New deployment`, select `Web app`, set **Execute as: Me**,
   set **Who has access: Anyone**, and deploy.
5. Copy the Web app URL. It normally ends in `/exec`.
6. Paste that URL into `app/public/content/socials.json` as
   `googleSheetsEndpoint`, commit it, and push `main`.

The first successful enquiry creates a `Leads` tab with these columns:

`Received at`, `Name`, `Email`, `Interest`, `Message`, `Subject`, `Status`

The `Interest` field is supplied by the home-page funnel and currently has
three routes: production/engineering, artist/music collaboration, and
research/photography. Max can change the status from `New` to `Contacted`,
`Booked`, or another internal label directly in the Sheet.

## Ownership and safety

- Do not paste the Web app URL into source code outside `socials.json`.
- Do not put a Google API key or service-account credential in the website.
- Keep the Apps Script deployment owned by Max’s account.
- If the Sheet is unavailable, the form still submits to FormSubmit and the
  drawer still shows its normal in-place confirmation.
