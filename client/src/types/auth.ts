export interface User {
  pk: number
  email: string
  first_name: string
  last_name: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthUrlResponse {
  authorization_url: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export type OAuthProvider = 'microsoft' | 'google'
