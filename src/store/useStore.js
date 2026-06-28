import { create } from 'zustand';

export const useStore = create((set) => ({
    selectedOrg: null,
    selectedUser: null,
    selectedSession: null,
    selectedTask: null,
    selectedStep: null, // <--- NEW: Tracks the clicked trace log

    setSelectedOrg: (orgId) => set({
        selectedOrg: orgId,
        selectedUser: null,
        selectedSession: null,
        selectedTask: null,
        selectedStep: null
    }),

    setSelectedUser: (userId) => set({
        selectedUser: userId,
        selectedSession: null,
        selectedTask: null,
        selectedStep: null
    }),

    setSelectedSession: (sessionId) => set({
        selectedSession: sessionId,
        selectedTask: null,
        selectedStep: null
    }),

    setSelectedTask: (taskId) => set({
        selectedTask: taskId,
        selectedStep: null
    }),

    setSelectedStep: (stepData) => set({
        selectedStep: stepData
    }),

    // Reset the panel
    closeTraceExplorer: () => set({
        selectedStep: null
    }),

    resetDashboard: () => set({
        selectedOrg: null,
        selectedUser: null,
        selectedSession: null,
        selectedTask: null,
        selectedStep: null
    }),
}));