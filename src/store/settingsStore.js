import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auto-lock timeout options in milliseconds
export const AUTO_LOCK_OPTIONS = [
  { label: '5 minutes', value: 5 * 60 * 1000 },
  { label: '15 minutes', value: 15 * 60 * 1000 },
  { label: '30 minutes', value: 30 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: 'Never', value: 0 },
];

// Currency options
export const CURRENCY_OPTIONS = [
  { label: 'USD', symbol: '$', value: 'usd' },
  { label: 'EUR', symbol: '€', value: 'eur' },
  { label: 'GBP', symbol: '£', value: 'gbp' },
  { label: 'JPY', symbol: '¥', value: 'jpy' },
  { label: 'INR', symbol: '₹', value: 'inr' },
];

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Auto-lock settings
      autoLockTimeout: 30 * 60 * 1000, // Default 30 minutes

      // Currency settings
      displayCurrency: 'usd',

      // Connected dApps
      connectedDApps: [], // Array of { origin, name, connectedAt, favicon }

      // Notification preferences
      notifications: {
        transactions: true,
        priceAlerts: false,
        securityAlerts: true,
        promotions: false,
      },

      // Actions
      setAutoLockTimeout: (timeout) => {
        set({ autoLockTimeout: timeout });
      },

      setDisplayCurrency: (currency) => {
        set({ displayCurrency: currency });
      },

      // Connected dApps management
      addConnectedDApp: (dApp) => {
        const { connectedDApps } = get();
        const exists = connectedDApps.find(d => d.origin === dApp.origin);
        if (!exists) {
          set({ connectedDApps: [...connectedDApps, { ...dApp, connectedAt: Date.now() }] });
        }
      },

      removeConnectedDApp: (origin) => {
        const { connectedDApps } = get();
        set({ connectedDApps: connectedDApps.filter(d => d.origin !== origin) });
      },

      clearAllConnectedDApps: () => {
        set({ connectedDApps: [] });
      },

      // Notification preferences
      setNotificationPreference: (key, value) => {
        const { notifications } = get();
        set({ notifications: { ...notifications, [key]: value } });
      },

      toggleNotification: (key) => {
        const { notifications } = get();
        set({ notifications: { ...notifications, [key]: !notifications[key] } });
      },

      // Reset all settings to defaults
      resetSettings: () => {
        set({
          autoLockTimeout: 30 * 60 * 1000,
          displayCurrency: 'usd',
          notifications: {
            transactions: true,
            priceAlerts: false,
            securityAlerts: true,
            promotions: false,
          },
        });
      },
    }),
    {
      name: 'trashpack-settings',
      partialize: (state) => ({
        autoLockTimeout: state.autoLockTimeout,
        displayCurrency: state.displayCurrency,
        connectedDApps: state.connectedDApps,
        notifications: state.notifications,
      }),
    }
  )
);
