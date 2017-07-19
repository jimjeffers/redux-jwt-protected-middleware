//@flow
import { validateToken, isDefined, isBlank } from "./helpers"
import type { Config, FetchArguments, FetchResults } from "./types"

/**
 * The crux of the middleware. This generator runs in an infinite loop
 * and obtains our middleware configuration and store via the params passed
 * to the next() iterator function. It will update it's internal state and
 * yeild a blank ("") string if it is currently fetching a new token.
 */
function* fetchToken(): Generator<?FetchResults, void, ?FetchArguments> {
  var loading: boolean = false
  var token: string = ""
  var error: ?Error = null
  while (true) {
    const args = yield null
    if (args) {
      const { config, store, attempt } = args
      const {
        currentAccessToken,
        handleRefreshAccessToken,
        currentRefreshToken
      } = config
      token = currentAccessToken(store)
      const canFetch = !loading && (attempt < 1 || !error)
      const needsToken = isBlank(token) || !validateToken(token)
      if (canFetch && needsToken) {
        if (handleRefreshAccessToken && currentRefreshToken) {
          token = ""
          error = null
          loading = true
          const refreshToken = currentRefreshToken(store)
          handleRefreshAccessToken(refreshToken, store)
            .then((_): void => {
              token = currentAccessToken(store)
              loading = false
            })
            .catch((refreshError: Error) => {
              error = refreshError
              loading = false
            })
        } else {
          error = new Error(
            "Access token cannot be refreshed due to lack of configuration."
          )
          loading = false
        }
      }
      yield {
        loading,
        error,
        token
      }
    }
  }
}

/**
 * A local instance of our generator function which we'll poll for
 * an available token.
 */
const gen = fetchToken()
gen.next() // Ensure the generator is now yielding.

/**
 * Recursively polls for a token using recursion and async function
 * calls.
 * @param {FetchArguments} args The optional redux store and middleware configuration.
 * @returns {string} A token value once a value has been obtained.
 */
function getToken(args: FetchArguments): Promise<?FetchResults> {
  return new Promise((resolve, reject) => {
    const result = gen.next(args).value
    if (result && result.loading == false) {
      resolve(result)
    } else {
      setTimeout(() => resolve(gen.next(args).value), 100)
    }
  })
}

/**
 * Recursively polls for a token using recursion and async function
 * calls.
 * @param {FetchArguments} args The optional redux store and middleware configuration.
 * @returns {string} A token value once a value has been obtained.
 */
const checkForToken = async function(
  args: FetchArguments
): FetchResults | Promise<?FetchResults> {
  const result = await getToken(args)
  const { attempt, ...rest } = args
  const incrementedArgs = { ...rest, attempt: attempt + 1 }
  return result && !result.loading ? result : checkForToken(incrementedArgs)
}

/**
 * A helper method that creates a promise which performs a flow similar
 * to the middleware. This is useful if you want to replicate the behavior
 * in a different middleware stack (such as the ApolloClient's networkInterface).
 *
 * @param {Config} config The middleware configuration.
 * @return {Function}     An async function that returns an accessible access token.
 */
const getAccessToken = (config: Config) => async (
  store: any
): Promise<?string> => {
  try {
    const result = await checkForToken({ config, store, attempt: 0 })
    if (result && result.error) {
      throw new Error(result.error)
    }
    return result ? result.token : null
  } catch (error) {
    config.handleAuthenticationError(error, store)
    return null
  }
}

export default getAccessToken
