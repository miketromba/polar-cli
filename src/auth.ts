/**
 * Auth credential management.
 *
 * Stored at ~/.polar/credentials.json. See SPEC.md §3.1.
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync
} from 'node:fs'
import { join } from 'node:path'

interface Credentials {
	accessToken: string
	server: 'production' | 'sandbox'
}

interface AuthStatus {
	authenticated: boolean
	tokenPrefix?: string
	server: string
}

export class Auth {
	private credPath: string

	constructor(baseDir?: string) {
		const dir = baseDir ?? join(process.env.HOME ?? '~', '.polar')
		this.credPath = join(dir, 'credentials.json')
	}

	async login(
		token: string,
		server: 'production' | 'sandbox' = 'production'
	): Promise<void> {
		const dir = join(this.credPath, '..')
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true })
		}
		const creds: Credentials = { accessToken: token, server }
		writeFileSync(this.credPath, `${JSON.stringify(creds, null, 2)}\n`)
	}

	async logout(): Promise<void> {
		if (existsSync(this.credPath)) {
			unlinkSync(this.credPath)
		}
	}

	async isAuthenticated(): Promise<boolean> {
		return (await this.getToken()) !== null
	}

	async getToken(envOverride?: string): Promise<string | null> {
		if (envOverride) {
			return envOverride
		}
		try {
			if (existsSync(this.credPath)) {
				const raw = readFileSync(this.credPath, 'utf-8')
				const creds: Credentials = JSON.parse(raw)
				return creds.accessToken ?? null
			}
		} catch {
			// Corrupted file
		}
		return null
	}

	async status(): Promise<AuthStatus> {
		try {
			if (existsSync(this.credPath)) {
				const raw = readFileSync(this.credPath, 'utf-8')
				const creds: Credentials = JSON.parse(raw)
				const token = creds.accessToken
				const prefix =
					token.length > 20
						? `${token.slice(0, 14)}...${token.slice(-3)}`
						: token
				return {
					authenticated: true,
					tokenPrefix: prefix,
					server: creds.server ?? 'production'
				}
			}
		} catch {
			// Fall through
		}
		return { authenticated: false, server: 'production' }
	}
}
