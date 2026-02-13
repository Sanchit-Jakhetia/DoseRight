import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API_BASE = (import.meta as any).env?.VITE_API_URL
  ?? (import.meta as any).env?.VITE_API_BASE_URL
  ?? 'http://localhost:8080'

// Helper to get auth headers
const getAuthHeaders = (token?: string) => {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Query keys - centralized for consistency
export const queryKeys = {
  medicines: ['medicines'] as const,
  schedule: ['schedule'] as const,
  adherence: ['adherence'] as const,
  summary: ['summary'] as const,
  profile: ['profile'] as const,
  history: ['history'] as const,
  doctorOverview: ['doctor', 'overview'] as const,
  caretakerOverview: ['caretaker', 'overview'] as const,
  adminOverview: ['admin', 'overview'] as const,
  all: ['all'] as const,
}

// Stale times (how long data is considered fresh)
const STALE_TIME = {
  short: 30 * 1000,       // 30 seconds - for frequently changing data
  medium: 2 * 60 * 1000,  // 2 minutes - for most data
  long: 5 * 60 * 1000,    // 5 minutes - for rarely changing data
}

// =============== PATIENT DATA HOOKS ===============

export function useMedicines(token?: string) {
  return useQuery({
    queryKey: queryKeys.medicines,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/medicines`, {
        headers: getAuthHeaders(token),
      })
      return Array.isArray(data) ? data : []
    },
    enabled: !!token,
    staleTime: STALE_TIME.medium,
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

export function useSchedule(token?: string) {
  return useQuery({
    queryKey: queryKeys.schedule,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/schedule`, {
        headers: getAuthHeaders(token),
      })
      return Array.isArray(data) ? data : []
    },
    enabled: !!token,
    staleTime: STALE_TIME.short, // Schedule changes frequently
    gcTime: 5 * 60 * 1000,
  })
}

export function useAdherence(token?: string) {
  return useQuery({
    queryKey: queryKeys.adherence,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/adherence`, {
        headers: getAuthHeaders(token),
      })
      return data ?? null
    },
    enabled: !!token,
    staleTime: STALE_TIME.medium,
  })
}

export function useSummary(token?: string) {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/summary`, {
        headers: getAuthHeaders(token),
      })
      return data ?? null
    },
    enabled: !!token,
    staleTime: STALE_TIME.medium,
  })
}

export function useProfile(token?: string) {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/profile`, {
        headers: getAuthHeaders(token),
      })
      return data ?? null
    },
    enabled: !!token,
    staleTime: STALE_TIME.long, // Profile rarely changes
  })
}

export function useHistory(token?: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/history`, {
        headers: getAuthHeaders(token),
      })
      return data
    },
    enabled: !!token && enabled,
    staleTime: STALE_TIME.short,
  })
}

// =============== DOCTOR DATA HOOKS ===============

export function useDoctorOverview(token?: string) {
  return useQuery({
    queryKey: queryKeys.doctorOverview,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/doctor/overview`, {
        headers: getAuthHeaders(token),
      })
      return data
    },
    enabled: !!token,
    staleTime: STALE_TIME.medium,
  })
}

// =============== CARETAKER DATA HOOKS ===============

export function useCaretakerOverview(token?: string) {
  return useQuery({
    queryKey: queryKeys.caretakerOverview,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/caretaker/overview`, {
        headers: getAuthHeaders(token),
      })
      return data
    },
    enabled: !!token,
    staleTime: STALE_TIME.medium,
  })
}

// =============== ADMIN DATA HOOKS ===============

export function useAdminOverview(token?: string) {
  return useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/admin/overview`, {
        headers: getAuthHeaders(token),
      })
      return data
    },
    enabled: !!token,
    staleTime: STALE_TIME.medium,
  })
}

// =============== MUTATIONS (actions that modify data) ===============

export function useMarkDose(token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ doseId, action }: { doseId: string; action: 'taken' | 'missed' }) => {
      const endpoint = action === 'taken'
        ? `${API_BASE}/api/dashboard/doses/${doseId}/mark-taken`
        : `${API_BASE}/api/dashboard/doses/${doseId}/mark-missed`
      return axios.patch(endpoint, {}, { headers: getAuthHeaders(token) })
    },
    onSuccess: () => {
      // Invalidate queries that might have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      queryClient.invalidateQueries({ queryKey: queryKeys.adherence })
      queryClient.invalidateQueries({ queryKey: queryKeys.summary })
    },
  })
}

export function useAddMedicine(token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (medicineData: any) => {
      return axios.post(`${API_BASE}/api/dashboard/medicines`, medicineData, {
        headers: getAuthHeaders(token),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medicines })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
    },
  })
}

export function useUpdateMedicine(token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return axios.patch(`${API_BASE}/api/dashboard/medicines/${id}`, data, {
        headers: getAuthHeaders(token),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medicines })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
    },
  })
}

export function useRefillMedicine(token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ medicationId, amount }: { medicationId: string; amount: number }) => {
      return axios.patch(`${API_BASE}/api/dashboard/medications/${medicationId}/refill`,
        { amount },
        { headers: getAuthHeaders(token) }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medicines })
      queryClient.invalidateQueries({ queryKey: queryKeys.summary })
    },
  })
}

export function useUpdateProfile(token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profileData: any) => {
      return axios.patch(`${API_BASE}/api/dashboard/profile`, profileData, {
        headers: getAuthHeaders(token),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

// =============== PREFETCH HELPERS ===============

export function usePrefetchDashboard(token?: string) {
  const queryClient = useQueryClient()

  return () => {
    if (!token) return

    // Prefetch all dashboard data in parallel
    queryClient.prefetchQuery({
      queryKey: queryKeys.medicines,
      queryFn: () => axios.get(`${API_BASE}/api/dashboard/medicines`, {
        headers: getAuthHeaders(token),
      }).then(r => Array.isArray(r.data) ? r.data : []),
      staleTime: STALE_TIME.medium,
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.schedule,
      queryFn: () => axios.get(`${API_BASE}/api/dashboard/schedule`, {
        headers: getAuthHeaders(token),
      }).then(r => Array.isArray(r.data) ? r.data : []),
      staleTime: STALE_TIME.short,
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.adherence,
      queryFn: () => axios.get(`${API_BASE}/api/dashboard/adherence`, {
        headers: getAuthHeaders(token),
      }).then(r => r.data ?? null),
      staleTime: STALE_TIME.medium,
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.summary,
      queryFn: () => axios.get(`${API_BASE}/api/dashboard/summary`, {
        headers: getAuthHeaders(token),
      }).then(r => r.data ?? null),
      staleTime: STALE_TIME.medium,
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.profile,
      queryFn: () => axios.get(`${API_BASE}/api/dashboard/profile`, {
        headers: getAuthHeaders(token),
      }).then(r => r.data ?? null),
      staleTime: STALE_TIME.long,
    })
  }
}

// =============== UTILITY HOOKS ===============

// Hook to invalidate all cached data (useful on logout)
export function useInvalidateAll() {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.clear()
  }
}

// Hook to refetch all patient data
export function useRefreshDashboard() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.medicines })
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
    queryClient.invalidateQueries({ queryKey: queryKeys.adherence })
    queryClient.invalidateQueries({ queryKey: queryKeys.summary })
    queryClient.invalidateQueries({ queryKey: queryKeys.profile })
  }
}
