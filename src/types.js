// @flow

export type Headers = { [string]: string }

export type Config = {
  apiPayloadSymbol: Symbol,
  currentAccessToken: (state: ?any) => string,
  handleAuthenticationError: (error: any, store: ?any) => void,
  currentRefreshToken: ?(state: ?any) => string,
  handleRefreshAccessToken: ?(
    refreshToken: string,
    store: ?any
  ) => Promise<string>
}
