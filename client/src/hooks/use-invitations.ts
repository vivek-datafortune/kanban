import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { WorkspaceInvitation } from "@/types/workspace"

export function useInvitations(slug: string) {
  return useQuery({
    queryKey: ["workspaces", slug, "invitations"],
    queryFn: () =>
      api.get<WorkspaceInvitation[]>(`/workspaces/${slug}/invitations/`),
    enabled: !!slug,
  })
}

export function useCreateInvitation(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; role?: string }) =>
      api.post<WorkspaceInvitation>(
        `/workspaces/${slug}/invitations/`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspaces", slug, "invitations"],
      })
    },
  })
}

export function useResendInvitation(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<WorkspaceInvitation>(
        `/workspaces/${slug}/invitations/${id}/resend/`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspaces", slug, "invitations"],
      })
    },
  })
}

export function useRevokeInvitation(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<WorkspaceInvitation>(
        `/workspaces/${slug}/invitations/${id}/revoke/`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspaces", slug, "invitations"],
      })
    },
  })
}

export function useDeleteInvitation(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${slug}/invitations/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspaces", slug, "invitations"],
      })
    },
  })
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      api.post<{ detail: string; workspace_slug?: string }>(
        "/invitations/accept/",
        { token }
      ),
  })
}
