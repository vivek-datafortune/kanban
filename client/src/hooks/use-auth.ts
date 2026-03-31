import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCookies } from "react-cookie"
import { useStore } from "@/store/app.store"
import { api } from "@/lib/api"
import type { AuthUrlResponse, LoginResponse, OAuthProvider, User } from "@/types/auth"

//  Get OAuth authorization URL 
export function useAuthUrl(provider: OAuthProvider) {
  return useQuery({
    queryKey: ["auth-url", provider],
    queryFn: () => api.get<AuthUrlResponse>(`/auth/${provider}/url/`),
    staleTime: 1000 * 60 * 5,
  })
}

//  Exchange authorization code for JWT 
export function useSocialLogin() {
  const { setUser } = useStore()
  const [, setCookie] = useCookies(["access", "refresh"])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ provider, code }: { provider: OAuthProvider; code: string }) =>
      api.post<LoginResponse>(`/auth/${provider}/`, { code }),
    onSuccess: (data) => {
      setCookie("access", data.access, { path: "/", maxAge: 3600, sameSite: "lax" })
      setCookie("refresh", data.refresh, { path: "/", maxAge: 604800, sameSite: "lax" })
      setUser(data.user)
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
  })
}

//  Fetch current user profile 
export function useCurrentUser() {
  const { setUser } = useStore()
  const [cookies] = useCookies(["access"])

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const user = await api.get<User>("/users/me/")
      setUser(user)
      return user
    },
    enabled: !!cookies.access,
    retry: false,
  })
}

//  Logout 
export function useLogout() {
  const { logout: clearStore } = useStore()
  const [, , removeCookie] = useCookies(["access", "refresh"])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post("/auth/logout/"),
    onSettled: () => {
      removeCookie("access", { path: "/" })
      removeCookie("refresh", { path: "/" })
      clearStore()
      queryClient.clear()
    },
  })
}

