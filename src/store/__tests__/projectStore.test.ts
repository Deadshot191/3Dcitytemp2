/**
 * Unit tests for projectStore (Zustand state management)
 * Tests project CRUD operations and API interactions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '../projectStore';
import { supabase } from '../../lib/supabase';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock data
const mockProjects = [
  {
    id: '1',
    name: 'City Planning A',
    description: 'Test city',
    model_type: 'planning' as const,
    sectors: ['government', 'healthcare'],
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Corporate Campus B',
    description: 'Test campus',
    model_type: 'corporate' as const,
    sectors: ['admin', 'research'],
    created_at: '2025-01-02T00:00:00Z',
  },
];

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useProjectStore.setState({ projects: [], loading: false });
    vi.clearAllMocks();
  });

  describe('fetchProjects', () => {
    it('should fetch projects and update state', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProjects,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await useProjectStore.getState().fetchProjects();

      expect(useProjectStore.getState().projects).toEqual(mockProjects);
      expect(useProjectStore.getState().loading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockImplementation(() => {
            // Check loading state is true during fetch
            expect(useProjectStore.getState().loading).toBe(true);
            return Promise.resolve({ data: mockProjects, error: null });
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await useProjectStore.getState().fetchProjects();

      expect(useProjectStore.getState().loading).toBe(false);
    });

    it('should handle fetch error gracefully', async () => {
      const mockError = { message: 'Database error', code: '500' };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(useProjectStore.getState().fetchProjects()).rejects.toEqual(
        mockError
      );
      expect(useProjectStore.getState().loading).toBe(false);
    });
  });

  describe('createProject', () => {
    it('should create project and add to state', async () => {
      const newProject = {
        name: 'New City',
        description: 'Brand new city',
        model_type: 'planning' as const,
        sectors: ['government', 'education'],
      };

      const createdProject = {
        ...newProject,
        id: '3',
        created_at: '2025-01-03T00:00:00Z',
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdProject,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const projectId = await useProjectStore.getState().createProject(newProject);

      expect(projectId).toBe('3');
      expect(useProjectStore.getState().projects).toContainEqual(createdProject);
    });

    it('should throw error when creation fails', async () => {
      const newProject = {
        name: 'Failed Project',
        description: 'This will fail',
        model_type: 'planning' as const,
        sectors: ['government'],
      };

      const mockError = { message: 'Creation failed' };
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(
        useProjectStore.getState().createProject(newProject)
      ).rejects.toEqual(mockError);
    });
  });

  describe('updateProject', () => {
    it('should update project in state', async () => {
      // Set initial projects
      useProjectStore.setState({ projects: mockProjects });

      const updates = {
        name: 'Updated City Name',
        description: 'Updated description',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await useProjectStore.getState().updateProject('1', updates);

      const updatedProject = useProjectStore
        .getState()
        .projects.find((p) => p.id === '1');

      expect(updatedProject?.name).toBe('Updated City Name');
      expect(updatedProject?.description).toBe('Updated description');
    });

    it('should throw error when update fails', async () => {
      useProjectStore.setState({ projects: mockProjects });

      const mockError = { message: 'Update failed' };
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(
        useProjectStore.getState().updateProject('1', { name: 'Fail' })
      ).rejects.toEqual(mockError);
    });
  });

  describe('deleteProject', () => {
    it('should delete project from state', async () => {
      // Set initial projects
      useProjectStore.setState({ projects: mockProjects });

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await useProjectStore.getState().deleteProject('1');

      const projects = useProjectStore.getState().projects;
      expect(projects.length).toBe(1);
      expect(projects.find((p) => p.id === '1')).toBeUndefined();
    });

    it('should throw error when deletion fails', async () => {
      useProjectStore.setState({ projects: mockProjects });

      const mockError = { message: 'Deletion failed' };
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(
        useProjectStore.getState().deleteProject('1')
      ).rejects.toEqual(mockError);

      // Project should still be in state after failed deletion
      expect(useProjectStore.getState().projects).toHaveLength(2);
    });
  });
});
