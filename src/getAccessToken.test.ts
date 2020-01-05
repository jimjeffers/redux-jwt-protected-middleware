import * as jwt from "jsonwebtoken"
import getAccessToken from "./getAccessToken"
import { IConfig } from "./types"

export const makeToken = (expSeconds: number): string =>
  jwt.sign(
    { foo: "bar", exp: new Date().getTime() / 1000 + expSeconds },
    "shhhhh"
  )

const delay = (amount: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(() => resolve(), amount)
  })

interface IMockStore {
  accessToken: string | null
  refreshToken: string | null
}

const mockStore: IMockStore = {
  accessToken: makeToken(12),
  refreshToken: makeToken(300)
}

const refreshTokens = async (): Promise<IMockStore> => {
  await delay(1000)
  mockStore.accessToken = makeToken(12)
  mockStore.refreshToken = makeToken(300)
  return mockStore
}

describe("getAccessToken", () => {
  const config: IConfig = {
    currentAccessToken: () => mockStore.accessToken || "",
    currentRefreshToken: () => mockStore.refreshToken || "",
    handleAuthenticationError: (error: any) => {
      expect(error.message).toBe("Could not authenticate.")
    },
    handleRefreshAccessToken: () =>
      new Promise(async (resolve, reject) => {
        const json = await refreshTokens()
        if (json.accessToken === "") {
          reject(Error("Could not refresh authentication token."))
        } else {
          resolve(json.accessToken || "")
        }
      }),
    maxDelay: 100
  }

  describe("with valid settings", () => {
    const fetchToken = getAccessToken(config)
    test("it should return the same result for multiple calls", async () => {
      expect.assertions(2)
      const token1 = await fetchToken(mockStore)
      const token2 = await fetchToken(mockStore)
      const token3 = await fetchToken(mockStore)
      expect(token1).toBe(token2)
      expect(token2).toBe(token3)
    })

    test("it should return the same results despite race conditions", async () => {
      expect.assertions(3)
      const results = await Promise.all(
        [50, 100, 150, 300].map(async i => {
          await delay(i)
          const result = await fetchToken(mockStore)
          return result
        })
      )
      expect(results[0]).toBe(results[1])
      expect(results[1]).toBe(results[2])
      expect(results[2]).toBe(results[3])
    })

    test("it should return the same results until the token requires refreshing", async () => {
      expect.assertions(2)
      const results = await Promise.all(
        [50, 100, 1750, 2000].map(async i => {
          await delay(i)
          const result = await fetchToken(mockStore)
          return result
        })
      )
      expect(results[0]).toBe(results[1])
      expect(results[2]).toBe(results[3])
    })
  })

  describe("with out proper configuration or credentials", () => {
    test("it should not return an error if the refresh token is blank when the access token is valid", async () => {
      expect.assertions(1)
      const fetchToken = getAccessToken({
        ...config,
        currentRefreshToken: () => "",
        handleAuthenticationError: (error: any) => {
          expect(error.message).toBe("No refresh token is present.")
        }
      })
      const token = await fetchToken(mockStore)
      expect(token).toEqual(config.currentAccessToken())
    })

    test("it should return an error if the refresh token is blank", async () => {
      expect.assertions(1)
      const fetchToken = getAccessToken({
        ...config,
        currentAccessToken: () => "",
        currentRefreshToken: () => "",
        handleAuthenticationError: (error: any) => {
          expect(error.message).toBe("No refresh token is present.")
        }
      })
      await fetchToken(mockStore)
    })

    test("it should return an error if the refresh token handler is not defined", async () => {
      expect.assertions(1)
      const fetchToken = getAccessToken({
        currentAccessToken: () => "",
        currentRefreshToken: () => "anystring",
        handleAuthenticationError: (error: any) => {
          expect(error.message).toBe(
            "Access token cannot be refreshed due to lack of configuration."
          )
        }
      })
      await fetchToken(mockStore)
    })
  })
})

test("ok", () => expect(1).toBeTruthy())
