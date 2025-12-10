import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import profileService from '../lib/profileService.js';

export const useProfileStore = create(
  persist(
    (set, get) => ({
      // Profile state
      profile: null,
      username: null,
      isLoading: false,
      isChecking: false,
      isClaiming: false,
      isUpdating: false,
      error: null,
      usernameAvailable: null,
      lastCheckedUsername: null,

      // Actions
      setProfile: (profile) => {
        set({
          profile,
          username: profile?.username || null,
        });
      },

      clearProfile: () => {
        set({
          profile: null,
          username: null,
          error: null,
          usernameAvailable: null,
          lastCheckedUsername: null,
        });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Fetch profile for a wallet address
      fetchProfile: async (walletAddress) => {
        if (!walletAddress) return null;

        set({ isLoading: true, error: null });

        try {
          const profile = await profileService.getProfileByWallet(walletAddress);
          set({
            profile,
            username: profile?.username || null,
            isLoading: false,
          });
          return profile;
        } catch (error) {
          set({
            error: error.message,
            isLoading: false,
          });
          return null;
        }
      },

      // Check username availability with debouncing handled in component
      checkAvailability: async (username) => {
        if (!username || username.length < 3) {
          set({ usernameAvailable: null, lastCheckedUsername: null, isChecking: false });
          return null;
        }

        set({ isChecking: true, error: null });

        try {
          const available = await profileService.checkUsernameAvailability(username);
          set({
            usernameAvailable: available,
            lastCheckedUsername: username.toLowerCase(),
            isChecking: false,
          });
          return available;
        } catch (error) {
          set({
            error: error.message,
            isChecking: false,
            usernameAvailable: null,
          });
          return null;
        }
      },

      // Claim a new username
      claimUsername: async (keypair, username, bio = '', avatar = '', twitter = '', discord = '', website = '') => {
        set({ isClaiming: true, error: null });

        try {
          const result = await profileService.createProfile(
            keypair,
            username,
            bio,
            avatar,
            twitter,
            discord,
            website
          );

          // Fetch the newly created profile
          const profile = await profileService.getProfileByUsername(result.username);

          set({
            profile,
            username: result.username,
            isClaiming: false,
            usernameAvailable: null,
            lastCheckedUsername: null,
          });

          return result;
        } catch (error) {
          set({
            error: error.message,
            isClaiming: false,
          });
          throw error;
        }
      },

      // Update existing profile
      updateProfile: async (keypair, bio = '', avatar = '', twitter = '', discord = '', website = '') => {
        set({ isUpdating: true, error: null });

        try {
          const result = await profileService.updateProfile(
            keypair,
            bio,
            avatar,
            twitter,
            discord,
            website
          );

          // Fetch the updated profile
          const { username } = get();
          if (username) {
            const profile = await profileService.getProfileByUsername(username);
            set({
              profile,
              isUpdating: false,
            });
          } else {
            set({ isUpdating: false });
          }

          return result;
        } catch (error) {
          set({
            error: error.message,
            isUpdating: false,
          });
          throw error;
        }
      },

      // Get profile by username (for viewing other profiles)
      getProfileByUsername: async (username) => {
        try {
          return await profileService.getProfileByUsername(username);
        } catch (error) {
          console.error('Error fetching profile:', error);
          return null;
        }
      },

      // Reset availability check
      resetAvailabilityCheck: () => {
        set({
          usernameAvailable: null,
          lastCheckedUsername: null,
          isChecking: false,
        });
      },

      // Clear cache
      clearCache: (walletAddress) => {
        profileService.clearCache(walletAddress);
      },
    }),
    {
      name: 'trashpack-profile',
      partialize: (state) => ({
        // Only persist minimal data, fetch fresh on load
        username: state.username,
        profile: state.profile,
      }),
    }
  )
);
