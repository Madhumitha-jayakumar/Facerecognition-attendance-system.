import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set) => ({
            isAuthenticated: false,
            facultyName: null,

            login: (name) => {
                set({
                    isAuthenticated: true,
                    facultyName: name || 'Faculty Member'
                });
            },

            logout: () => {
                set({
                    isAuthenticated: false,
                    facultyName: null
                });
            }
        }),
        {
            name: 'auth-storage',
        }
    )
);

export default useAuthStore;
