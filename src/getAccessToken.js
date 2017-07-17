//@flow
import { validateToken, isDefined, isBlank } from "./helpers"
import type { Config, FetchArguments } from "./types"

/**
 * The crux of the middleware. This generator runs in an infinite loop
 * and obtains our middleware configuration and store via the params passed
 * to the next() iterator function. It will update it's internal state and
 * yeild a blank ("") string if it is currently fetching a new token.
 */
function* fetchToken(): Generator<string, void, ?FetchArguments> {
  var isFetching: boolean = false
  var token: string = ""
  while (true) {
    const args = yield ""
    if (args) {
      const { config, store } = args
      const {
        currentAccessToken,
        handleRefreshAccessToken,
        currentRefreshToken
      } = config
      token = currentAccessToken(store)
      if (!isFetching && (isBlank(token) || !validateToken(token))) {
        if (handleRefreshAccessToken && currentRefreshToken) {
          isFetching = true
          try {
            const refreshToken = currentRefreshToken(store)
            handleRefreshAccessToken(refreshToken, store)
            token = currentAccessToken(store)
          } catch (error) {
            config.handleAuthenticationError(error, store)
          }
          isFetching = false
        } else {
          config.handleAuthenticationError(
            new Error(
              "Access token cannot be refreshed due to lack of configuration."
            ),
            store
          )
        }
      }
      yield isFetching ? "" : token
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
function getToken(args: FetchArguments): Promise<?string> {
  return new Promise((resolve, reject) => {
    const token = gen.next(args).value
    if (token !== "") {
      resolve(token)
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
): string | Promise<?string> {
  const token = await getToken(args)
  return !isBlank(token) ? token : checkForToken(args)
}

/**
 * A helper method that creates a promise which performs a flow similar
 * to the middleware. This is useful if you want to replicate the behavior
 * in a different middleware stack (such as the ApolloClient's networkInterface).
 *
 * @param {Config} config The middleware configuration.
 * @return {Function}     An async function that returns an accessible access token.
 */
const getAccessToken = (config: Config) => async (store: any) => {
  return await checkForToken({ config, store })
}

export default getAccessToken
