# TrashPack Wallet - Secure Solana Extension & Web App

A secure Chrome extension and web application for Solana cryptocurrency management with enterprise-grade encryption and mnemonic phrase backup.

## Features

- 🔐 Mnemonic-based wallet creation and restoration
- 💰 Solana blockchain support with multiple networks
- 🌐 Web page integration via content scripts
- 📱 Clean and modern popup interface
- 🔄 Real-time balance updates
- 💾 Local wallet storage with backup/restore functionality

## 🛡️ Security Features

- **🔐 Enterprise Encryption**: AES-GCM-256 with PBKDF2 key derivation
- **🏦 Secure Storage**: Chrome extension isolation + encrypted IndexedDB fallback
- **🔑 Password Protection**: User-defined passwords with session management
- **📱 Universal**: Works as Chrome extension AND standalone web app
- **🔄 Migration**: Automatic upgrade from legacy storage with security prompts

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Chrome browser (for extension)

### Installation

```bash
git clone <repository-url>
cd solana-wallet-extension
npm install
```

## 🔧 Build & Development

### Development Mode
```bash
# Web app development (hot reload)
npm run dev

# Chrome extension development
npm run dev:extension
```

### Production Builds
```bash
# Web app production build
npm run build

# Chrome extension production build
npm run build:extension
```

### Chrome Extension Setup

1. **Build the extension:**
   ```bash
   npm run build:extension
   ```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build` folder

3. **Development workflow:**
   ```bash
   npm run dev:extension
   # Make changes → Auto rebuild → Reload extension in Chrome
   ```

### Testing Wallet Connectors

Use the included test page to verify wallet integration:

```bash
# Start development server
npm run dev

# Open test page in browser
http://localhost:5173/test-wallet.html
```

**Test scenarios:**
- Wallet connection/disconnection
- Address retrieval
- Transaction signing
- Event handling
- Cross-origin communication

**Testing with extension:**
1. Load extension in Chrome (see above)
2. Open `test-wallet.html` in any tab
3. Test wallet API integration

## 📁 Project Structure

```
solana-wallet-extension/
├── src/
│   ├── App.jsx                    # Main React app
│   ├── popup.jsx                  # Extension popup entry
│   ├── background.js              # Extension service worker
│   ├── content.js                 # Extension content script
│   ├── injected.js                # Wallet API injection
│   ├── components/                # React components
│   │   ├── PasswordPrompt.jsx     # Secure unlock
│   │   ├── MigrationPrompt.jsx    # Security upgrades
│   │   └── PasswordSetup.jsx      # New wallet security
│   ├── store/                     # State management
│   ├── util/
│   │   ├── secureStorage.js       # Universal secure storage
│   │   ├── migration.js           # Legacy data migration
│   │   └── encryption.js          # Legacy (deprecated)
│   └── pages/                     # App pages
├── test-wallet.html               # Connector testing page
├── manifest.json                  # Extension manifest
├── popup.html                     # Extension popup
└── build/                         # Production builds
```

## 🌐 Environment Support

| Environment | Storage Backend | Security Level | Build Command |
|-------------|----------------|----------------|---------------|
| Chrome Extension | `chrome.storage.local` | **Highest** | `npm run build:extension` |
| Web App (IndexedDB) | Encrypted IndexedDB | **High** | `npm run build` |
| Web App (Fallback) | Encrypted localStorage | **Medium** | `npm run build` |

## 🔌 Wallet API Integration

The extension injects `window.trashpack` for dApp integration:

```javascript
// Check wallet availability
if (window.trashpack) {
  // Connect wallet
  const { publicKey } = await window.trashpack.connect();

  // Sign transaction
  const signed = await window.trashpack.signTransaction(transaction);

  // Sign message
  const signedMessage = await window.trashpack.signMessage("Hello World");

  // Sign and send transaction
  const { signature } = await window.trashpack.signAndSendTransaction(transaction);

  // Listen for events
  window.trashpack.on('connect', (publicKey) => {
    console.log('Wallet connected:', publicKey);
  });

  window.trashpack.on('disconnect', () => {
    console.log('Wallet disconnected');
  });
}
```

**Test the API with `test-wallet.html`:**
- Connection flows
- Transaction signing
- Event handling
- Error scenarios

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Development (web app)
npm run dev

# Development (extension)
npm run dev:extension

# Production build (web app)
npm run build

# Production build (extension)
npm run build:extension

# Test connector integration
npm run dev
# Then open: http://localhost:5173/test-wallet.html
```

## 📦 Chrome Web Store Deployment

1. **Build for production:**
   ```bash
   npm run build:extension
   ```

2. **Package extension:**
   ```bash
   cd build
   zip -r ../trashpack-wallet-extension.zip .
   ```

3. **Upload to Chrome Web Store:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Upload `trashpack-wallet-extension.zip`
   - Complete store listing
   - Submit for review

## 🧪 Testing Guide

### Manual Testing
1. **Extension**: Load in Chrome → Test popup functionality
2. **Web App**: `npm run dev` → Test at `localhost:5173`
3. **Connectors**: Open `test-wallet.html` → Test API integration
4. **Security**: Test password setup, migration, unlock flows

### Automated Testing
```bash
# Run tests (when available)
npm test

# Build verification
npm run build && npm run build:extension
```

## 🔒 Security Architecture

- **Encryption**: AES-GCM-256 with PBKDF2 (100K iterations)
- **Storage**: Isolated Chrome storage + encrypted fallbacks
- **Passwords**: User-defined, session-based, never stored
- **Migration**: Automatic upgrade from insecure legacy storage

See `SECURITY_IMPROVEMENTS.md` for detailed security documentation.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Submit pull request

## 📄 License

This project is part of the TrashPack Wallet ecosystem.
