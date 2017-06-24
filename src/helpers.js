// @flow
import jwtDecode from "jwt-decode"
import type { Headers } from "./types"

/**
 * A convenience method to test if a passed prop has been defined.
 * @param {*} prop A property to test.
 * @return {boolean} True if the passed prop is defined.
 */
export const isDefined = (prop: any): boolean =>
  typeof prop !== "undefined" && prop !== "undefined"

/**
 * A convenience method to test if a passed property is a blank string.
 * @param {*} prop A property to test.
 * @return {boolean} True if the passed prop is in fact a blank string.
 */
export const isBlank = (prop: any): boolean => !isNotBlank(prop)

/**
 * A convenience method to test if a passed property is a non blank string.
 * @param {*} prop A property to test.
 * @return {boolean} True if the passed prop is in fact a non blank string.
 */
export const isNotBlank = (prop: any): boolean =>
  isDefined(prop) && typeof prop === "string" && prop !== ""

/**
 * Injects a JWT in an object representing http headers as the
 * authorization header.
 * @param {Headers} headers   An object representing the headers for an HTTP request.
 * @param {string} token      A JWT access token to be injected into the supplied headers.
 * @return {Headers}          A copy of the http headers object with the Authorization header set as the JWT.
 */
export const injectToken = (headers: Headers, token: string): Headers =>
  Object.assign({}, headers, { Authorization: `bearer ${token}` })

/**
 * 
 * @param {string} token A JWT to validate.
 * @param {number} leeway A pessimistic amount of seconds to invalidate the token. (defaults to 10)
 */
export const validateToken = (token: string, leeway: ?number): boolean => {
  if (isBlank(token)) {
    return false
  }
  const currentToken = jwtDecode(token)
  const { exp } = currentToken
  const now = new Date().getTime() / 1000
  const secondsRemaining = exp - now
  return secondsRemaining > (leeway || 10)
}
