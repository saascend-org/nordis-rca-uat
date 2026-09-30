# Nordis RCA acceptance guide

Step-by-step user acceptance tests for the Nordis Revenue Cloud build (NTFULL sandbox), from quote to renewal, for Sales and Ops & Admin testers. Testers mark each test Accept or Reject and add notes.

Live page: https://saascend-org.github.io/nordis-rca-uat/

## Where results go

`index.html` posts each verdict to a Google Apps Script web app bound to a Google Sheet (`apps-script/Code.gs`). There is one row per tester per test, and a newer verdict replaces the older one. The page reads the Sheet back every 45 seconds so testers can see each other's results.

If `RESULTS_ENDPOINT` in `index.html` is empty or the Sheet can't be reached, verdicts are kept in the tester's browser and sent once the connection is back.

## Connecting the Sheet

1. Create a Google Sheet, then go to **Extensions > Apps Script** and paste in `apps-script/Code.gs`.
2. **Deploy > New deployment > Web app**. Set *Execute as* to **Me** and *Who has access* to **Anyone**.
3. Copy the `/exec` URL into `RESULTS_ENDPOINT` near the top of the script in `index.html`, then commit.

The endpoint doesn't require sign-in, because testers are outside SaaScend's Google Workspace. It only accepts known test IDs and short text fields. Values that start with `=`, `+`, `-` or `@` are stored as plain text so they can't run as formulas.
