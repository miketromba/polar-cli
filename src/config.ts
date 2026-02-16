/**
 * CLI configuration management.
 *
 * Stored at ~/.polar/config.json. See SPEC.md §3.2.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface ConfigValues {
	organizationId?: string
	server: 'production' | 'sandbox'
	output: string
	defaultLimit: number
	noColor: boolean
}

export const DEFAULT_CONFIG: ConfigValues = {
	server: 'production',
	output: 'table',
	defaultLimit: 25,
	noColor: false
}

const VALID_KEYS = new Set<keyof ConfigValues>([
	'organizationId',
	'server',
	'output',
	'defaultLimit',
	'noColor'
])

const VALID_SERVERS = new Set(['production', 'sandbox'])

export class Config {
	private configPath: string
	private values: ConfigValues

	constructor(baseDir?: string) {
		const dir = baseDir ?? join(process.env.HOME ?? '~', '.polar')
		this.configPath = join(dir, 'config.json')
		this.values = { ...DEFAULT_CONFIG }
		this.loadSync()
	}

	private loadSync(): void {
		try {
			if (existsSync(this.configPath)) {
				const raw = readFileSync(this.configPath, 'utf-8')
				const parsed = JSON.parse(raw)
				this.values = { ...DEFAULT_CONFIG, ...parsed }
			}
		} catch {
			// Use defaults if file is invalid
		}
	}

	async load(): Promise<void> {
		this.loadSync()
	}

	get<K extends keyof ConfigValues>(key: K): ConfigValues[K] {
		return this.values[key]
	}

	set<K extends keyof ConfigValues>(key: K, value: ConfigValues[K]): void {
		if (!VALID_KEYS.has(key)) {
			throw new Error(`Invalid config key: ${String(key)}`)
		}

		if (key === 'server' && !VALID_SERVERS.has(value as string)) {
			throw new Error(
				`Invalid server value: ${value}. Must be 'production' or 'sandbox'.`
			)
		}

		this.values[key] = value
		this.save()
	}

	list(): ConfigValues {
		return { ...this.values }
	}

	async reset(): Promise<void> {
		this.values = { ...DEFAULT_CONFIG }
		this.save()
	}

	private save(): void {
		const dir = join(this.configPath, '..')
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true })
		}
		writeFileSync(
			this.configPath,
			`${JSON.stringify(this.values, null, 2)}\n`
		)
	}
}
