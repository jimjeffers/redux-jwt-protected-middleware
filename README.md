Redux JWT Protected Middleware
==============================

This middlware injects a JWT access token onto part of a qualifying action's payload. If the current access token exists but is not valid, you will be able to refresh the user's current access token prior to the action getting passed on to your API middleware.

Why Use this Library?
---------------------
It's trivial to update a refresh token with many networking libraries. However, many of
them do not handle deadlocks. For example many of the APIs we write prevent replay attacks
on refresh tokens. What if you're client kicks off two simultaneous requests? It's not 
uncommon to encounter a race condition where one request kicks off a refresh process and
automatically invalidates the other. 

This library gets around this by using a generator to create a deadlock and queues all 
processes awaiting the access token. This way if multiple requests are made only one 
refresh request will occur and all requests will continue upon success. This library also 
will utilize your cached token automatically and only refresh your token via an async 
operation as needed.


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

```ts
// protectedMiddleware.ts
import { IConfig, middleware as protectedMiddleware } from "redux-jwt-protected-middleware"
import { getCookie } from "react-simple-cookie-store"
import { ACCESS_TOKEN, REFRESH_TOKEN, refreshTokens } from "../Auth"

const config: IConfig = {
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

Then when defining your redux store:

```ts
// store.ts
import { createStore, combineReducers, applyMiddleware, compose } from "redux"
import protectedMiddleware from "./protectedMiddleware"

// ...

const middlewares = applyMiddleware(
  protectedMiddleware,
  /// ... other middlewares
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

```ts
// fetchToken.ts
import { getAccessToken, IConfid } from "redux-jwt-protected-middleware"
const config: IConfig = { ... }

export const fetchToken = getAccessToken(config)
```

Then when defining your Apollo Client you can use the same middleware:

```ts
// client.ts
import { ApolloClient } from 'apollo-client'
import { setContext } from "apollo-link-context"
import { HttpLink } from 'apollo-link-http'
import { fetchValidatedToken } from './session'
import store from './store'

const httpLink = new HttpLink({
  uri: `${process.env.REACT_APP_API_URL}/graphql`,
})

const setAuthorizationLink = setContext((_, previousContext) => ({
  headers: { Authorization: previousContext.token ? `Bearer ${previousContext.token}` : null }
}))

const asyncAuthLink = setContext(
  () =>
    new Promise(async (success) => {
      const token = await fetchValidatedToken(store)
      success({ token })
    })
)

export const client = new ApolloClient({
  link: asyncAuthLink.concat(setAuthorizationLink).concat(httpLink),
})
```
