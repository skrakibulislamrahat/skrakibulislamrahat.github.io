# Private desk

Static, password-encrypted work ledger at /desk/, linked by the small ◈ beside
the portfolio copyright. GitHub Pages hosts the interface. A separate **private**
repository stores only vault.json, an encrypted ledger.

## First connection

1. In the sk rakib account shown in the app, create shift-ledger-data, select
   **Private**, and initialize it with a README.
2. Create a fine-grained GitHub personal access token. Restrict it to that one
   repository and grant repository **Contents: read and write**.
3. Open the dashboard, paste the token, choose a password of at least 12
   characters, and check **Create a new vault**. Save the password in a password
   manager; there is no password reset.
4. On another device, use the same repository and password with a token that
   can access the repository. Leave the create-vault box unchecked.

The app only accepts private repositories owned by that account. Keep the data
repository private. The public portfolio repository must never contain a token,
password, or work records. A public route or hidden button is not access control.

## Daily workflow

- Clock in; log item counts and the total day's sales; press **Save entry**.
- Clock out and enter unpaid break minutes.
- Use **Edit hours & details** for missed shifts, wrong dates, notes, counts,
  or the pay rate for that day. Times use the current device's time zone.
- Select completed days in **Unpaid**. Create a report to copy, download as CSV,
  or print/save as PDF, then mark those selected days paid when paid.
- Reopen a paid report to make a correction. The original snapshot remains
  marked reopened. Only that report's original days are selected for repayment.
- Settings changes apply to new days; old days retain their own rates.
- Download encrypted backups regularly. Restore requires the backup password
  and explicit confirmation and replaces the current ledger.

No reports are automatically sent to anyone. Paid history is retained. All pay
figures are gross before any deductions.

## Calculation rules

- Hourly default: $10. Count completed whole minutes per shift, deduct unpaid
  breaks, round hourly pay to the nearest cent for each day.
- Phone repair: $0.50; case: $1; other item: $0.50; device sale: $3;
  laptop/console repair: $5, counted separately from phone repairs.
- Highest daily sales bonus only: strictly over $500 → $5; over $1,000 → $10;
  over $1,500 → $20. Exact thresholds do not activate the next tier.
- An overnight shift belongs to its recorded work date.
- Running shifts show a live estimate but cannot be marked paid.

## Storage and security

Web Crypto encrypts records with AES-256-GCM using a 12-byte random IV on every
save. PBKDF2-SHA256 with 600,000 iterations derives a key from the password and
a random 16-byte salt. Authenticated context separates connection credentials
from ledger data. The token is kept in memory while unlocked and, if requested,
stored encrypted in localStorage. No plaintext ledger is saved locally.

Opening and saving require an internet connection. Every write first verifies
that the repository is private, then sends the expected file SHA. A concurrent
change fails instead of being overwritten: refresh and reapply the intended
edit. On a network timeout a write may have reached GitHub; refresh to check.
Saves are serialized. No offline queue or automatic merge is implemented.

The desk clears decrypted state on lock and auto-locks after 15 inactive
minutes. Unsubmitted form edits are not saved. A saved running shift survives
locking. Clear the browser's site data to remove a remembered connection.
Tokens expire according to the expiry chosen in GitHub; reconnect with a renewed
token using **Change connection**. Neither credentials nor financial records
are included in public code, URLs, or commit messages.

The static app has no third-party scripts or analytics. Its Content Security
Policy allows network connections only to the GitHub API. Anyone controlling
the public site code or an unlocked device can compromise the app; normal
account and device security still matters. GitHub retains encrypted commit
history. Deleting or restoring entries does not erase older encrypted versions.
The app stops writes before the contents-API file-size limit is reached.

## Checks

Run with Node 22+:

    node --test desk/tests.mjs
    node --check desk/app.mjs

Tests cover bonus boundaries, time/break accounting, overnight shifts, rate
snapshots, selection on reopening payments, CSV formula escaping, encryption
round trips, wrong passwords, tampering, public-repository refusal, and
optimistic-concurrency conflicts.

Reference:
[GitHub Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
and [fine-grained tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
