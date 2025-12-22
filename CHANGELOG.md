# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased] - 1.6.0

### Added
- Permissions: Prepare for improved host permission handling and localhost testing.
- UX: Initial UI improvements and accessibility tweaks for wallet onboarding flows.

### Changed
- Extension: Bumped published extension version to 1.6.0 (was 1.5.0).
- Build: Align build manifest version with source manifest.
- Dependencies: Minor dependency updates (see package.json for pinned versions).

### Fixed
- Background: Fix intermittent background worker restart on browser update.
- Security: Harden content security policy for extension pages to reduce injection surface.

### Deprecated
- N/A

### Removed
- N/A

## [1.5.0] - 2025-08-04
- Published public release: initial TrashPack Wallet Extension listing (version 1.5.0).

### Permissions & Justifications

This release trims permanent host permissions to only the production RPC endpoints the wallet needs, and moves developer/localhost hosts into optional permissions that are requested at runtime. Below are short, store-ready justifications you can paste into the Chrome Web Store listing when asked "Why does your extension need these permissions?":

- Host permissions (permanent):
	- `https://rpc.gorbchain.xyz/*` — Access to Gorbchain RPC to query account balances, transaction history, and submit transactions on behalf of the user when they choose to send funds.
	- `https://api.devnet.solana.com/*` — Read-only and transaction submission access for Solana devnet used by users who connect to the devnet network in the wallet.
	- `https://devnet.gorbchain.xyz/*` — Read and write access for Gorbchain devnet network variants used by users testing on devnet.
	- `https://mainnet.helius-rpc.com/*` — Required to fetch mainnet Solana data (balances, transaction statuses) and to submit signed transactions to the network.
	- `https://solana-mainnet.g.alchemy.com/*` — Alternative mainnet RPC endpoint used for reliability and to support some provider integrations.

	Justification (short): "Needed to query blockchain data (balances, transaction history) and to submit signed transactions when you initiate a send or sign operation. We only access the RPCs for networks you explicitly select in the wallet."

- Optional host permissions (requested at runtime):
	- `http://localhost:5173/*`, `http://localhost:3000/*`, `http://127.0.0.1/*`, `http://[::1]/*`

	Justification (short): "Developer-only: requested only when you explicitly enable Developer Mode or when the wallet detects a local dApp. Allows the wallet to connect to local dApp instances (e.g., for testing) without permanently granting access to all users."

- Other manifest permissions and why we need them:
	- `storage` — "To securely store encrypted wallet state, user preferences, connected sites, and other local settings required for the extension to function offline." (Data scope: extension-only storage.)
	- `background` (service worker) — "Required to run background tasks such as responding to connection requests from dApps, handling sign requests, and maintaining the connection state while the popup is closed." (No external network access by itself.)
	- `tabs` and `activeTab` — "Used to identify the origin (URL) of a dApp requesting a connection or signing operation so we can show a clear prompt to the user and limit permissions to that origin." (We only read the active tab's origin; we don't collect tab history.)
	- `scripting` — "Used to inject a lightweight content script for dApp <-> extension communication when a page requests a wallet connection." (Only injected into pages that request a connection and only after the user approves.)
	- `alarms` — "Used to schedule timeouts and background checks (for example, to expire pending connection requests after a set duration)."
	- `web_accessible_resources` (assets/injected.js) — "Allows the extension to expose minimal helper assets (injected script) required to facilitate secure communication between web pages and the extension; injected scripts do not access user private keys." 

	Justification (short): "These permissions enable the core wallet features: receiving connection requests, asking the user to approve or reject them, signing transactions or messages on consent, and persisting user preferences and connected sites. We only use them when the user interacts with a dApp or uses the wallet UI."

Suggested store guidance for reviewers (short):

"TrashPack is a client-side cryptocurrency wallet extension. It needs access to blockchain RPC endpoints to read balances and submit transactions when the user initiates those actions. Localhost permissions are optional and only requested for developer testing. The extension never uploads private keys or seed phrases; all signing happens locally and keys remain encrypted in the extension's storage."

---



---

Notes for release preparation:
- Verify extension assets and icons in `icons/` are up-to-date.
- Confirm `manifest.json` and `build/manifest.json` versions reflect the release version.
- Run a build and test the extension in Chrome (load unpacked) before publishing.
- Update the Chrome Web Store listing changelog to match these messages.
