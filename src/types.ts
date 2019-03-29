export interface IConfig {
  currentAccessToken: (store?: any) => string
  handleAuthenticationError: (error: any, store?: any) => void
  currentRefreshToken?: (store?: any) => string
  handleRefreshAccessToken?: (
    refreshToken: string,
    store?: any
  ) => Promise<string>
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
