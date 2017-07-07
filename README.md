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

<<<<<<< HEAD
I like to configure the middleware inside of a dedicated module:

=======
>>>>>>> adf0143a5d356b226a8c3705822144f4f77083c6
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
<<<<<<< HEAD

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
=======
>>>>>>> adf0143a5d356b226a8c3705822144f4f77083c6
