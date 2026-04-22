import { create } from 'zustand'
import type { Project } from '../types'

interface ProjectStore {
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
}))
