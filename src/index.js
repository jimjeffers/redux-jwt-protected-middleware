// @flow

import { PROTECTED } from "./symbols"
import { validateToken, isDefined, isBlank } from "./helpers"

type Headers = { [string]: string }
type RefreshError = { error: string }
type Config = {
  currentAccessToken: (state: ?any) => string,
  currentRefreshToken: (state: ?any) => string,
  handleRefreshAccessToken: (
    refreshToken: string,
    store: ?any
  ) => Promise<Response>,
  handleAccessTokenJSON: (
    json: Promise<Object>,
    store: ?any
  ) => Promise<string>,
  handleAccessTokenUpdated: (accessToken: string, store: ?any) => void,
  handleAuthenticationError: (error: any, store: ?any) => void,
  apiPayloadSymbol: Symbol
}

/**
 * A default error to pass if the access token could not be refreshed.
 */
const REFRESH_ERROR: RefreshError = {
  error: "[API] Auth token could not refresh"
}

/**
 * Injects a JWT in an object representing http headers as the
 * authorization header.
 * @param {Object} headers  An object representing the headers for an HTTP request.
 * @param {String} token    A JWT access token to be injected into the supplied headers.
 * @return {Object}         A copy of the http headers object with the Authorization header set as the JWT.
 */
const injectToken = (headers: Headers, token: string): Headers =>
  Object.assign({}, headers, { Authorization: `bearer ${token}` })

/**
 * This is a standard redux middleware that checks for a qualifying action
 * by identifying if the action contains the [PROTECTED] symbol. If so it will
 * do two things:
 *
 * 1. Refresh the JWT if the accessToken if the user's session has expired.
 * 2. Inject the current or refreshed access token into the HTTP headers for
 *    the request.
 *
 * @param {Object} store The current redux store.
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
  } else if (isBlank(token) || validateToken(token)) {
    return config
      .handleRefreshAccessToken(config.currentRefreshToken(state), store)
      .then(res => {
        if (!res.ok) {
          throw REFRESH_ERROR
        }
        return res.json()
      })
      .then(json => config.handleAccessTokenJSON(json, store))
      .then(accessToken => {
        apiPayload.headers = injectToken(apiPayload.headers, accessToken)
        config.handleAccessTokenUpdated(accessToken, store)
        return next(action)
      })
      .catch((error: any): void => {
        config.handleAuthenticationError(error, store)
      })
  } else {
    apiPayload.headers = injectToken(apiPayload.headers, token)
    return next(action)
  }
}

export { middleware, PROTECTED }
export type { Config }
