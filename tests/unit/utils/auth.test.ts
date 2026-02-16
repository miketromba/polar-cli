import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Auth } from '../../../src/auth'

let tempDir: string

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), 'polar-cli-auth-test-'))
})

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true })
})

describe('Auth', () => {
	test('isAuthenticated returns false when no credentials stored', async () => {
		const auth = new Auth(tempDir)
		expect(await auth.isAuthenticated()).toBe(false)
	})

	test('login stores token', async () => {
		const auth = new Auth(tempDir)
		await auth.login('polar_pat_test_token_123')
		expect(await auth.isAuthenticated()).toBe(true)
	})

	test('getToken returns stored token', async () => {
		const auth = new Auth(tempDir)
		await auth.login('polar_pat_test_token_123')
		expect(await auth.getToken()).toBe('polar_pat_test_token_123')
	})

	test('logout removes credentials', async () => {
		const auth = new Auth(tempDir)
		await auth.login('polar_pat_test_token_123')
		await auth.logout()
		expect(await auth.isAuthenticated()).toBe(false)
		expect(await auth.getToken()).toBeNull()
	})

	test('getToken prefers env var over stored token', async () => {
		const auth = new Auth(tempDir)
		await auth.login('polar_pat_stored')
		const token = await auth.getToken('polar_pat_env_override')
		expect(token).toBe('polar_pat_env_override')
	})

	test('status returns token prefix and server', async () => {
		const auth = new Auth(tempDir)
		await auth.login('polar_pat_very_long_token_abc123def456')
		const status = await auth.status()
		expect(status.authenticated).toBe(true)
		expect(status.tokenPrefix).toBe('polar_pat_very...456')
		expect(status.server).toBe('production')
	})

	test('status with server override', async () => {
		const auth = new Auth(tempDir)
		await auth.login('polar_pat_token', 'sandbox')
		const status = await auth.status()
		expect(status.server).toBe('sandbox')
	})

	test('persists across instances', async () => {
		const auth1 = new Auth(tempDir)
		await auth1.login('polar_pat_persist_test')

		const auth2 = new Auth(tempDir)
		expect(await auth2.getToken()).toBe('polar_pat_persist_test')
	})
})
