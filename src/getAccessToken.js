//@flow
import { validateToken, isDefined, isBlank } from "./helpers"
import type { Config } from "./types"

/**
 * A helper method that creates a promise which performs a flow similar
 * to the middleware. This is useful if you want to replicate the behavior
 * in a different middleware stack (such as the ApolloClient's networkInterface).
 *
 * @param {Config} config The middleware configuration.
 * @return {Function}     An async function that returns an accessible access token.
 */
const getAccessToken = (config: Config) => async (store: any) => {
  const { currentAccessToken, handleRefreshAccessToken, currentRefreshToken } = config
  const token: string = currentAccessToken(store)
  if (isBlank(token) || !validateToken(token)) {
    if (handleRefreshAccessToken && currentRefreshToken) {
      try {
        await handleRefreshAccessToken(currentRefreshToken(store), store)
        return currentAccessToken(store)
      } catch(error) {
        config.handleAuthenticationError(error, store)
      }
    } else {
      config.handleAuthenticationError(
        new Error("Access token is no longer valid"),
        store
      )
    }
  } else {
    return token
  }
}

export default getAccessToken