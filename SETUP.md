# Family Wishlist setup
1. Create a private Google Sheet. Open Extensions → Apps Script and paste backend/Code.gs.
2. Run setup once and authorize it. In Project Settings → Script properties, add FAMILY_CODE with a memorable, hard-to-guess passphrase (at least four random words). Never commit it.
3. Deploy → New deployment → Web app. Execute as Me; Who has access: Anyone. Copy the /exec URL.
4. Set window.WISHLIST_API in config.js to the URL. It is not a secret.
5. GitHub Settings → Pages → Deploy from a branch → main → / (root).
6. Test in a signed-out browser: wrong code must fail; correct code must load; add a test member, update an Amazon link, confirm, refresh on another device. Delete test rows directly in the private sheet.
All API requests are POST with a text/plain JSON body to avoid preflight. Verify cross-origin response in the deployed browser. No private data belongs in GitHub. The shared code grants all members equal access. Remember on this device stores the code locally; avoid on shared devices. Failed attempts are globally throttled, which can temporarily block family members too. No data is cached as the source of truth.
