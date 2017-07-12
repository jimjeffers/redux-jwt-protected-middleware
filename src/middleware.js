import { PROTECTED } from "./symbols"
import { validateToken, isDefined, isBlank } from "./helpers"
import type { Config } from "./types"

/**
 * This is a standard redux middleware that checks for a qualifying action
 * by identifying if the action contains the [PROTECTED] symbol. If so it will
 * do two things:
 *
 * 1. Block the pending action until a valid access token is obtained.
 * 2. Throw an error if a token cannot be obtained.
 * 
 * It's up to the developer to determine how they'd like to store or use the
 * token in conjunction with other middleware. For example the token could be
 * injected into the networking layer of an apollo client or simply a custom API 
 * middleware.
 *
 * @param {Config} config The middleware configuration.
 * @return {Function}     The API middleware function
 */
const middleware = (config: Config) => (store: any) => (next: any) => (
  action: any
) => {
  const state: any = store.getState()
  const token: string = config.currentAccessToken(state)
  const isProtected: boolean = action[PROTECTED]

  if (!isProtected) {
    return next(action)
  } else if (isBlank(token) || !validateToken(token)) {
    const { handleRefreshAccessToken, currentRefreshToken } = config
    if (handleRefreshAccessToken && currentRefreshToken) {
      return handleRefreshAccessToken(currentRefreshToken(state), store)
        .then(_ => {
          return next(action)
        })
        .catch((error: Error): void => {
          config.handleAuthenticationError(error, store)
        })
    } else {
      config.handleAuthenticationError(
        new Error("Access token is no longer valid"),
        store
      )
    }
  } else {
    return next(action)
  }
}