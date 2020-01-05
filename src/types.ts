export interface IConfig {
  currentAccessToken: (store?: any) => string
  debug?: boolean
  handleAuthenticationError: (error: any, store?: any) => void
  currentRefreshToken?: (store?: any) => string
  handleRefreshAccessToken?: (
    refreshToken: string,
    store?: any
  ) => Promise<string>
  maxDelay?: number
}

export interface IFetchArguments {
  config: IConfig
  store: any
  attempt: number
}

export interface IFetchResults {
  token: string
  loading: boolean
  error: Error | null
}
