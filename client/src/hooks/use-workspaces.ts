import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Workspace, WorkspaceMember } from "@/types/workspace"

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<Workspace[]>("/workspaces/"),
  })
}

export function useWorkspace(slug: string) {
  return useQuery({
    queryKey: ["workspaces", slug],
    queryFn: () => api.get<Workspace>(`/workspaces/${slug}/`),
    enabled: !!slug,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<Workspace>("/workspaces/", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
  })
}

export function useUpdateWorkspace(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      api.patch<Workspace>(`/workspaces/${slug}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      queryClient.invalidateQueries({ queryKey: ["workspaces", slug] })
    },
  })
}

export function useDeleteWorkspace(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/workspaces/${slug}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
  })
}

export function useWorkspaceMembers(slug: string) {
  return useQuery({
    queryKey: ["workspaces", slug, "members"],
    queryFn: () => api.get<WorkspaceMember[]>(`/workspaces/${slug}/members/`),
    enabled: !!slug,
  })
}

export function useAddMember(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; role?: string }) =>
      api.post<WorkspaceMember>(`/workspaces/${slug}/members/`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["workspaces", slug, "members"] }),
  })
}

export function useRemoveMember(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/workspaces/${slug}/members/${memberId}/`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["workspaces", slug, "members"] }),
  })
}

export function useChangeMemberRole(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { memberId: string; role: string }) =>
      api.patch<WorkspaceMember>(
        `/workspaces/${slug}/members/${data.memberId}/`,
        { role: data.role }
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["workspaces", slug, "members"] }),
  })
}
