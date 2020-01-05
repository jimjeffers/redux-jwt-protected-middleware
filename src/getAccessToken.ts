import { isBlank, validateToken } from "./helpers"
import { IConfig, IFetchArguments, IFetchResults } from "./types"

/**
 * The crux of the middleware. This generator runs in an infinite loop
 * and obtains our middleware configuration and store via the params passed
 * to the next() iterator function. It will update it's internal state and
 * yield a blank ("") string if it is currently fetching a new token.
 * Note: This is not thread safe and intended only for use in the browser.
 */
function* fetchToken(): IterableIterator<IFetchResults | null> {
  let loading: boolean = false
  let token: string = ""
  let error: Error | null = null

  while (true) {
    const args: IFetchArguments = (yield null) as any
    if (args) {
      const { config, store, attempt } = args
      const {
        currentAccessToken,
        currentRefreshToken,
        debug,
        handleRefreshAccessToken,
      } = config
      token = currentAccessToken(store)

      /**
       * Prevent an infinite loop that could occur when the
       * generator encounters an error for a prior token. If
       * the generator no longer needs a new token, we can
       * assume the error was generated for a prior token.
       */
      const needsToken = isBlank(token) || !validateToken(token)
      if (!needsToken) {
        error = null
      }

      /**
       * Prevent any race conditions by tracking the current
       * internal state in the generator -- if a request is
       * currently loading, an error is present, or if the
       * incoming request for a token is from a subsequent
       * attempt via another asynchronous API call.
       */
      const canFetch = !loading && (attempt < 1 || !error)

      /**
       * Ensure we actually have a refresh token in order to
       * perform the refresh request.
       */
      const hasRefreshToken = currentRefreshToken
        ? typeof currentRefreshToken(store) === "string" && !isBlank(currentRefreshToken(store))
        : false

      if (canFetch && needsToken) {
        if (!hasRefreshToken) {
          if (debug) {
            // tslint:disable-next-line no-console
            console.log(`Middleware could not refresh token.`)
          }
          loading = false
          error = new Error(
            "No refresh token is present."
          )
        } else if (handleRefreshAccessToken && currentRefreshToken) {
          if (debug) {
            // tslint:disable-next-line no-console
            console.log(`Middleware attempting to refresh token: ${currentRefreshToken}`)
          }
          const refreshToken = currentRefreshToken(store)
          token = ""
          error = null
          loading = hasRefreshToken
          handleRefreshAccessToken(refreshToken, store)
            .then(
              (): void => {
                token = currentAccessToken(store)
                loading = false
              }
            )
            .catch((refreshError: Error) => {
              error = refreshError
              loading = false
            })
        } else {
          if (debug) {
            // tslint:disable-next-line no-console
            console.log(`Middleware lacks configuration.`)
          }
          error = new Error(
            "Access token cannot be refreshed due to lack of configuration."
          )
          loading = false
        }
      }
      if (debug) {
        // tslint:disable-next-line no-console
        console.log(`Middleware yielded: ${JSON.stringify({
          error,
          loading,
          token
        })}`)
      }
      yield {
        error,
        loading,
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
function getToken(args: IFetchArguments): Promise<IFetchResults | null> {
  const { config } = args
  return new Promise(resolve => {
    const result = gen.next(args as any).value
    if (result && result.loading === false) {
      resolve(result)
    } else {
      const delay = Math.max(Math.ceil(Math.random() * 3 * 1000), 500)
      if (config.debug) {
        // tslint:disable-next-line no-console
        console.log(`Middleware waiting for result. Retrying in ${delay}ms`)
      }
      setTimeout(() => resolve(gen.next(args as any).value), delay)
    }
  })
}

/**
 * Recursively polls for a token using recursion and async function
 * calls.
 * @param {FetchArguments} args The optional redux store and middleware configuration.
 * @returns {string} A token value once a value has been obtained.
 */
const checkForToken = async (
  args: IFetchArguments
): Promise<IFetchResults | null | undefined> => {
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
 * @param {IConfig} config The middleware configuration.
 * @return {Function}     An async function that returns an accessible access token.
 */
const getAccessToken = (config: IConfig) => async (
  store: any
): Promise<string | null | undefined> => {
  try {
    const result = await checkForToken({ config, store, attempt: 0 })
    if (result && result.error) {
      throw new Error(result.error.message)
    }
    return result ? result.token : null
  } catch (error) {
    config.handleAuthenticationError(error, store)
    return null
  }
}

export default getAccessToken
