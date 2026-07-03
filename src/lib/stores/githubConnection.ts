// ============================================
// githubConnection.ts - GitHub OAuth Store
// 
// Zweck: Verwaltet GitHub-Verbindung für Module Builder
// Verwendet von: GitHubButton, Module Git Push/Pull
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// --------------------------------------------
// Types
// --------------------------------------------

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
  html_url: string;
}

interface GitHubConnectionState {
  // Verbindungs-Status
  isConnected: boolean;
  // Aktueller User (wenn verbunden)
  user: GitHubUser | null;
  // Access Token (für API-Calls)
  token: string | null;
  // Token-Typ (meist "bearer")
  tokenType: string | null;
  // Lade-Status
  isLoading: boolean;
  // Fehler
  error: string | null;
}

interface GitHubConnectionActions {
  // Mit GitHub verbinden (OAuth Flow)
  connect: () => void;
  // Verbindung trennen
  disconnect: () => void;
  // Token setzen (nach OAuth Callback)
  setToken: (token: string, tokenType?: string) => void;
  // User-Daten laden
  fetchUser: () => Promise<void>;
  // Status zurücksetzen
  reset: () => void;
}

// --------------------------------------------
// Initial State
// --------------------------------------------

const initialState: GitHubConnectionState = {
  isConnected: false,
  user: null,
  token: null,
  tokenType: null,
  isLoading: false,
  error: null,
};

// --------------------------------------------
// Store
// --------------------------------------------

export const useGitHubConnection = create<GitHubConnectionState & GitHubConnectionActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // ========================================
      // Connect - OAuth Flow starten
      // ========================================
      
      connect: () => {
        // TODO: Implementiere OAuth Flow
        // Für jetzt: Öffne GitHub OAuth URL
        const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
        
        if (!clientId) {
          set({ error: 'GitHub Client ID nicht konfiguriert' });
          console.warn('[GitHubConnection] NEXT_PUBLIC_GITHUB_CLIENT_ID nicht gesetzt');
          return;
        }
        
        const redirectUri = `${window.location.origin}/api/auth/github/callback`;
        const scope = 'repo user:email';
        
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scope);
        authUrl.searchParams.set('state', crypto.randomUUID());
        
        window.location.href = authUrl.toString();
      },
      
      // ========================================
      // Disconnect
      // ========================================
      
      disconnect: () => {
        set(initialState);
      },
      
      // ========================================
      // Token setzen (nach OAuth)
      // ========================================
      
      setToken: (token, tokenType = 'bearer') => {
        set({
          token,
          tokenType,
          isConnected: true,
          error: null,
        });
        
        // User-Daten laden
        get().fetchUser();
      },
      
      // ========================================
      // User-Daten laden
      // ========================================
      
      fetchUser: async () => {
        const { token } = get();
        
        if (!token) {
          set({ error: 'Kein Token vorhanden' });
          return;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status}`);
          }
          
          const user = await response.json() as GitHubUser;
          
          set({
            user,
            isConnected: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('[GitHubConnection] Fehler beim Laden der User-Daten:', error);
          set({
            error: (error as Error).message,
            isLoading: false,
            isConnected: false,
            token: null,
          });
        }
      },
      
      // ========================================
      // Reset
      // ========================================
      
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'lifeos-github-connection',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Nur Token und User persistieren
        token: state.token,
        tokenType: state.tokenType,
        user: state.user,
        isConnected: state.isConnected,
      }),
    }
  )
);

// --------------------------------------------
// Selectors
// --------------------------------------------

export const useGitHubUser = () => 
  useGitHubConnection((state) => state.user);

export const useIsGitHubConnected = () => 
  useGitHubConnection((state) => state.isConnected);

