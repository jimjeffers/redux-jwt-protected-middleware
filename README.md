Redux JWT Protected Middleware
==============================

This middlware injects a JWT access token onto part of a qualifying action's payload. If the current access token exists but is not valid, you will be able to refresh the user's current access token prior to the action getting passed on to your API middleware.

Where this lives in your middleware stack:
------------------------------------------

1. redux-jwt-protected-middleware
2. redux-api-middleware, apollo-client, etc..
3. ...
4. redux-thunk

Limitations:
------------

This middleware's job is simply to refresh the access token if needed. It's your job to inject the access token as an authorization header. If the user is not authenticated the middleware will throw an error if it cannot refresh the accesstoken.

Usage:
------

I like to configure the middleware inside of a dedicated module:

```js
// @flow
// protectedMiddleware.js
import { middleware as protectedMiddleware } from "redux-jwt-protected-middleware"
import type { Config } from "redux-jwt-protected-middleware"
import { getCookie } from "react-simple-cookie-store"
import { ACCESS_TOKEN, REFRESH_TOKEN, refreshTokens } from "../Auth"

const config: Config = {
  currentAccessToken: () => getCookie(ACCESS_TOKEN) || "",
  currentRefreshToken: () => getCookie(REFRESH_TOKEN) || "",
  handleRefreshAccessToken: (refreshToken, store) =>
    new Promise(async (resolve, reject) => {
      const json = await refreshTokens(refreshToken)
      if (json.success === false) {
        reject(Error("Could not refresh authentication token."))
      } else {
        resolve(json.data.accessToken)
      }
    }),
  handleAuthenticationError: (error: any, store: any) => {
    console.log("There was an error we should handle it!")
  }
}

export default protectedMiddleware(config)
```

Then when defining my redux store:

```js
// store.js
// @flow
import { createStore, combineReducers, applyMiddleware, compose } from "redux"
import protectedMiddleware from "./protectedMiddleware"

...

const middlewares = applyMiddleware(
  protectedMiddleware,
  ... // other middlewares
)

const store: Function = createStore(
  rootReducer,
  initialState,
  composeEnhancers(middlewares)
)

export { store }
```

Alternatively if you're using a library like the Apollo Client, which utilizes
it's own middleware stack for networking, you can use the async helper function
directly:

```js
// fetchToken.js
// @flow
import { getAccessToken } from "redux-jwt-protected-middleware"
const config: Config = { ... }

const fetchToken = getAccessToken(config)

export default fetchToken
```

Then when defining your Apollo Client you can use the same middleware:

```js
// client.js
import ApolloClient, { createNetworkInterface } from "react-apollo"
import { fetchToken } from "./fetchToken"

const networkInterface = createNetworkInterface({
  uri: "http://localhost:3000"
})

networkInterface.use([
  {
    async applyMiddleware(req, next) {
      if (!req.options.headers) {
        req.options.headers = {} // Create the header object if needed.
      }
      const token = await fetchToken(store)
      req.options.headers.authorization = token ? `Bearer ${token}` : null
      next()
    }
  }
])

const client = new ApolloClient({ networkInterface })

export default client
```
