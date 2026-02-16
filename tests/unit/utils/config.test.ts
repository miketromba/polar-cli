import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Config, DEFAULT_CONFIG } from '../../../src/config'

let tempDir: string

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), 'polar-cli-test-'))
})

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true })
})

describe('Config', () => {
	test('returns defaults when no config file exists', () => {
		const config = new Config(tempDir)
		expect(config.get('server')).toBe(DEFAULT_CONFIG.server)
		expect(config.get('defaultLimit')).toBe(DEFAULT_CONFIG.defaultLimit)
		expect(config.get('output')).toBe(DEFAULT_CONFIG.output)
	})

	test('set and get a value', async () => {
		const config = new Config(tempDir)
		await config.set('server', 'sandbox')
		expect(config.get('server')).toBe('sandbox')
	})

	test('persists values to disk', async () => {
		const config1 = new Config(tempDir)
		await config1.set('organizationId', 'org_123')

		// New instance reads from disk
		const config2 = new Config(tempDir)
		await config2.load()
		expect(config2.get('organizationId')).toBe('org_123')
	})

	test('list returns all config values', async () => {
		const config = new Config(tempDir)
		await config.set('server', 'sandbox')
		const all = config.list()
		expect(all).toHaveProperty('server', 'sandbox')
		expect(all).toHaveProperty('defaultLimit')
	})

	test('reset returns to defaults', async () => {
		const config = new Config(tempDir)
		await config.set('server', 'sandbox')
		await config.set('defaultLimit', 50)
		await config.reset()
		expect(config.get('server')).toBe(DEFAULT_CONFIG.server)
		expect(config.get('defaultLimit')).toBe(DEFAULT_CONFIG.defaultLimit)
	})

	test('rejects invalid config keys', async () => {
		const config = new Config(tempDir)
		expect(() => config.set('invalidKey' as any, 'value')).toThrow()
	})

	test('validates server value', async () => {
		const config = new Config(tempDir)
		expect(() => config.set('server', 'invalid' as any)).toThrow()
	})
})

describe('DEFAULT_CONFIG', () => {
	test('has expected default values', () => {
		expect(DEFAULT_CONFIG.server).toBe('production')
		expect(DEFAULT_CONFIG.output).toBe('table')
		expect(DEFAULT_CONFIG.defaultLimit).toBe(25)
		expect(DEFAULT_CONFIG.noColor).toBe(false)
	})
})
