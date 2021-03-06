import getAccessToken from "./getAccessToken"
import { PROTECTED } from "./symbols"
import { IConfig } from "./types"

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
 * @param config The middleware configuration.
 * @return The API middleware function
 */
const middleware = (config: IConfig) => (store: any) => (next: any) => async (
  action: any
) => {
  const isProtected: boolean = action[PROTECTED]
  const fetchToken = getAccessToken(config)
  if (!isProtected) {
    return next(action)
  } else {
    await fetchToken(store)
    return next(action)
  }
}

export default middleware
