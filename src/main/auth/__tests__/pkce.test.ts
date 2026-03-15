import { describe, it, expect } from 'vitest'
import { randomCodeVerifier, codeChallenge, randomState } from '../pkce.js'

describe('pkce', () => {
  describe('randomCodeVerifier', () => {
    it('43자 URL-safe Base64 문자열을 반환한다', () => {
      const verifier = randomCodeVerifier()
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(verifier.length).toBe(43)
    })

    it('호출할 때마다 다른 값을 반환한다', () => {
      const a = randomCodeVerifier()
      const b = randomCodeVerifier()
      expect(a).not.toBe(b)
    })
  })

  describe('codeChallenge', () => {
    it('verifier를 SHA-256 해시하여 Base64url로 인코딩한다', () => {
      const verifier = 'test-verifier-12345'
      const challenge = codeChallenge(verifier)
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(challenge.length).toBeGreaterThan(0)
    })

    it('동일 입력에 대해 동일 결과를 반환한다', () => {
      const verifier = randomCodeVerifier()
      expect(codeChallenge(verifier)).toBe(codeChallenge(verifier))
    })

    it('다른 입력에 대해 다른 결과를 반환한다', () => {
      const a = codeChallenge('verifier-a')
      const b = codeChallenge('verifier-b')
      expect(a).not.toBe(b)
    })
  })

  describe('randomState', () => {
    it('64자 hex 문자열을 반환한다', () => {
      const state = randomState()
      expect(state).toMatch(/^[0-9a-f]+$/)
      expect(state.length).toBe(64)
    })

    it('호출할 때마다 다른 값을 반환한다', () => {
      const a = randomState()
      const b = randomState()
      expect(a).not.toBe(b)
    })
  })
})
