/**
 * Unit tests for authStore (Zustand state management)
 * Tests authentication state changes and session management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';
import { supabase } from '../../lib/supabase';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({ session: null });
    vi.clearAllMocks();
  });

  describe('setSession', () => {
    it('should update session state', () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        user: {
          id: '123',
          email: 'test@example.com',
        },
      } as any;

      useAuthStore.getState().setSession(mockSession);

      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('should set session to null', () => {
      const mockSession = {
        access_token: 'test-token',
        user: { id: '123', email: 'test@example.com' },
      } as any;

      // First set a session
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().session).toEqual(mockSession);

      // Then clear it
      useAuthStore.getState().setSession(null);
      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp and set session on success', async () => {
      const mockSession = {
        access_token: 'new-user-token',
        user: { id: 'new-123', email: 'newuser@example.com' },
      } as any;

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      } as any);

      await useAuthStore.getState().signUp('newuser@example.com', 'password123');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('should throw error when signUp fails', async () => {
      const mockError = { message: 'Email already exists' };

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      } as any);

      await expect(
        useAuthStore.getState().signUp('existing@example.com', 'password123')
      ).rejects.toEqual(mockError);

      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should call supabase signIn and set session on success', async () => {
      const mockSession = {
        access_token: 'login-token',
        user: { id: '456', email: 'user@example.com' },
      } as any;

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      } as any);

      await useAuthStore.getState().signIn('user@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('should throw error when signIn fails with wrong password', async () => {
      const mockError = { message: 'Invalid credentials' };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      } as any);

      await expect(
        useAuthStore.getState().signIn('user@example.com', 'wrongpassword')
      ).rejects.toEqual(mockError);

      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut and clear session', async () => {
      // Set a session first
      const mockSession = {
        access_token: 'token',
        user: { id: '789', email: 'logout@example.com' },
      } as any;
      useAuthStore.getState().setSession(mockSession);

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      } as any);

      await useAuthStore.getState().signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().session).toBeNull();
    });

    it('should throw error when signOut fails', async () => {
      const mockError = { message: 'Network error' };

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: mockError,
      } as any);

      await expect(useAuthStore.getState().signOut()).rejects.toEqual(mockError);
    });
  });
});
