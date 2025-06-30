import { create } from 'zustand';
import secureStorage from '../util/secureStorage';

export const useAuthStore = create((set, get) => ({
  // State
  isAuthenticated: false,
  isLoading: false,

  // Actions
  initAuth: async () => {
    try {
      // Check secure storage for authentication state
      const isAuth = await secureStorage.getData('isAuthenticated');
      set({ isAuthenticated: !!isAuth });
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      set({ isAuthenticated: false });
    }
  },

  login: async () => {
    set({ isLoading: true });
    try {
      // Simple authentication - just set as authenticated
      set({
        isAuthenticated: true,
        isLoading: false
      });

      // Store authentication state in secure storage
      await secureStorage.setData('isAuthenticated', true);

      // Note: Connection request handling is now done by AuthHandler component
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({
      isAuthenticated: false,
      isLoading: false
    });

    try {
      // Clear all secure data on logout
      await secureStorage.clearSecureData();
    } catch (err) {
      console.error('Error clearing data during logout:', err);
    }
  },
}));
