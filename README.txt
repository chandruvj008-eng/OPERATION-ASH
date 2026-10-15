FoundIt — Lost & Found
================================

Files
- index.html  : page structure
- styles.css  : responsive styling
- script.js   : demo data, search/filtering, report modal, backend integration
- step-actions.js : click and keyboard actions for the three How it works cards

Run
1. Keep all three files in the same folder.
2. Run `node server.js` in this folder and open http://127.0.0.1:3000.
3. Keep the terminal running while using the page.
You can also double-click Start FoundIt.bat to start the server and open the site. Do not open index.html directly; that skips the backend.

Backend
- The local Node.js backend is connected at /api/items.
- Demo examples are fictional; new reports are saved on disk by the backend.
- New reports are saved by the local Node.js backend in items.json and persist across refreshes/restarts.
- Registered phone numbers and optional contact details are stored in items.json but omitted from the public item list. Keep that file private.
- Reports can include one optional photo (up to 5 MB); the photo is saved with the report and appears on its report card.
- Basic matching checks the opposite report type for shared item-name/description words and category. A likely match is shown in a notification when a report is created. This is a simple local keyword heuristic, not a trained AI model, and it does not send alerts across devices.
- Seven-day match watches are saved in this browser and check the backend every 15 seconds for likely found reports. Click “Enable match alerts” once to allow desktop notifications. The browser page and Node server must stay running; the local server cannot receive reports from other people's devices.
- Do not enter real personal or sensitive data.
- Do not put real personal data into a public deployment without adding authentication and a secure database.

The backend uses Node's built-in modules; no package installation is needed. It listens only on this computer (127.0.0.1), has no user accounts, and is intended for local demos. Do not expose it to the internet or a shared network. For multi-user notifications, deploy an authenticated backend and add user accounts and notification delivery.

- Lost reports ask for the owner's registered phone number; found reports ask for the recipient's registered phone number. The backend compares numbers and item details before marking matching reports returned. Numbers are saved in items.json and are never sent in the public item-list response. This is not secure identity verification.
- Found reports can include an optional public pickup location, shown on the report card. Use a public meeting spot rather than a private home address.

- Categories include mobile phones, chargers, gold chains, rings, ID cards, and water bottles.
