import { describe, expect, it } from 'vitest'
import { authHref, safeNextPath } from './redirects.js'
import { fieldErrorsFromApi, validateConfirmation, validateDisplayName, validateEmail, validateNewPassword } from './validation.js'

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/templates')).toBe('/templates')
    expect(safeNextPath('/editor/garden-vows?draft=abc')).toBe('/editor/garden-vows?draft=abc')
  })

  it('refuses anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'templates', '', null, undefined, '/x\u0000y']) {
      expect(safeNextPath(bad)).toBe('/dashboard')
    }
  })

  it('never redirects back into an auth screen', () => {
    for (const loop of ['/login', '/signup?next=/x', '/reset-password?token=abc', '/verify-email', '/forgot-password']) {
      expect(safeNextPath(loop)).toBe('/dashboard')
    }
  })

  it('builds login/signup links with an encoded next path', () => {
    expect(authHref('login', '/editor/garden-vows?draft=1')).toBe('/login?next=%2Feditor%2Fgarden-vows%3Fdraft%3D1')
    expect(authHref('signup', 'https://evil.example')).toBe('/signup')
    expect(authHref('login', '/login')).toBe('/login')
  })
})

describe('validation mirrors the API rules', () => {
  it('checks email, password, name and confirmation', () => {
    expect(validateEmail('')).toMatch(/Enter your email/)
    expect(validateEmail('ana@example')).toMatch(/valid email/)
    expect(validateEmail(' ana@example.com ')).toBeNull()
    expect(validateNewPassword('short')).toMatch(/at least 10/)
    expect(validateNewPassword('x'.repeat(257))).toMatch(/at most 256/)
    expect(validateNewPassword('long enough pass')).toBeNull()
    expect(validateDisplayName('  ')).toMatch(/Enter your name/)
    expect(validateDisplayName('Ana\u0007')).toMatch(/letters/)
    expect(validateDisplayName('x'.repeat(61))).toMatch(/at most 60/)
    expect(validateConfirmation('a', 'b')).toMatch(/don’t match/)
  })

  it('maps API validation details to friendly field messages', () => {
    const error = { details: [{ path: 'email', message: '"email" must be a valid email' }, { path: 'status' }] }
    expect(fieldErrorsFromApi(error, { email: 'Enter a valid email address.' })).toEqual({ email: 'Enter a valid email address.', status: 'Please check this field.' })
  })
})
