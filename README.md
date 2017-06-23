Redux JWT Protected Middleware
==============================

This middlware injects a JWT access token onto part of a qualifying action's payload. If the current access token exists but is not valid, you will be able to refresh the user's current access token prior to the action getting passed on to your API middleware.

Where this lives in your middleware stack:
------------------------------------------

# redux-jwt-protected-middleware
# redux-api-middleware
# ...
# redux-thunk

Limitations:
------------

This middleware's job is simply to refresh the access token if needed and inject the access token as an authorization header. If the user is not authenticated the JWT is not passed and any API middleware you're using will need to respond to the authorization error.