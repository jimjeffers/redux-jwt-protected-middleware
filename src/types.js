// @flow

export type Config = {
  currentAccessToken: (store: ?any) => string,
  handleAuthenticationError: (error: any, store: ?any) => void,
  currentRefreshToken: ?(store: ?any) => string,
  handleRefreshAccessToken: ?(
    refreshToken: string,
    store: ?any
  ) => Promise<string>
}

export type FetchArguments = {
  config: Config,
  store: any
}

export type FetchResults = {
  token: string,
  loading: boolean,
  error: ?Error
}
