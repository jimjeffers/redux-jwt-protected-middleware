// @flow

import { PROTECTED } from "./symbols"
import { validateToken, isDefined, isBlank, injectToken } from "./helpers"
import type { Config } from "./types"

/**
 * This is a standard redux middleware that checks for a qualifying action
 * by identifying if the action contains the [PROTECTED] symbol. If so it will
 * do two things:
 *
 * 1. Refresh the JWT if the accessToken if the user's session has expired.
 * 2. Inject the current or refreshed access token into the HTTP headers for
 *    the request.
 *
 * @param {Config} config The middleware configuration.
 * @return {Function}    The API middleware function
 */
const middleware = (config: Config) => (store: any) => (next: any) => (
  action: any
) => {
  const state: any = store.getState()
  const token: string = config.currentAccessToken(state)
  const isProtected: boolean = action[PROTECTED]
  const apiPayload: { [string]: any } = action[config.apiPayloadSymbol]

  if (!isDefined(apiPayload) || !isProtected) {
    return next(action)
  } else if (isBlank(token) || !validateToken(token)) {
    const { handleRefreshAccessToken, currentRefreshToken } = config
    if (handleRefreshAccessToken && currentRefreshToken) {
      return handleRefreshAccessToken(currentRefreshToken(state), store)
        .then(accessToken => {
          apiPayload.headers = injectToken(apiPayload.headers, accessToken)
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
    apiPayload.headers = injectToken(apiPayload.headers, token)
    return next(action)
  }
}

export { middleware, PROTECTED }
export type { Config }
