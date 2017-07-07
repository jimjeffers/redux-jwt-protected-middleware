// @flow

export type Config = {
  currentAccessToken: (state: ?any) => string,
  handleAuthenticationError: (error: any, store: ?any) => void,
  currentRefreshToken: ?(state: ?any) => string,
  handleRefreshAccessToken: ?(
    refreshToken: string,
    store: ?any
  ) => Promise<string>
}
