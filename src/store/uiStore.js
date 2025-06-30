import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // State
  error: '',
  isHelpModalOpen: false,

  // Actions
  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: '' });
  },

  setHelpModalOpen: (isOpen) => {
    set({ isHelpModalOpen: isOpen });
  }
}));
