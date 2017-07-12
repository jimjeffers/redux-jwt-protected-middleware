// @flow

import { PROTECTED } from "./symbols"
import type { Config } from "./types"
import middleware from "./middleware"
import getAccessToken from "./getAccessToken"

export { middleware, PROTECTED, getAccessToken }
export type { Config }