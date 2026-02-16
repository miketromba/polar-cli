import { describe, expect, test } from 'bun:test'

async function run(
	args: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	try {
		const proc = Bun.spawn(
			['bun', 'run', 'bin/polar.ts', ...args.split(' ').filter(Boolean)],
			{
				cwd: `${import.meta.dir}/../..`,
				stdout: 'pipe',
				stderr: 'pipe',
				env: {
					...process.env,
					TERM: 'dumb',
					NO_COLOR: '1'
				}
			}
		)
		const stdout = await new Response(proc.stdout).text()
		const stderr = await new Response(proc.stderr).text()
		const exitCode = await proc.exited
		return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode }
	} catch (e: any) {
		return { stdout: '', stderr: e.message, exitCode: 1 }
	}
}

// ─── Root CLI ────────────────────────────────────────────────────────

describe('CLI root', () => {
	test('shows help with --help', async () => {
		const { stdout, exitCode } = await run('--help')
		expect(exitCode).toBe(0)
		expect(stdout).toContain('Unofficial CLI for Polar')
		expect(stdout).toContain('Commands:')
	})

	test('shows version with --version', async () => {
		const { stdout, exitCode } = await run('--version')
		expect(exitCode).toBe(0)
		expect(stdout).toMatch(/\d+\.\d+\.\d+/)
	})

	test('exits with code 2 for unknown command', async () => {
		const { exitCode } = await run('nonexistent')
		expect(exitCode).toBe(2)
	})
})

// ─── All top-level commands appear in help ───────────────────────────

describe('command discoverability', () => {
	const expectedCommands = [
		'orgs',
		'products',
		'subscriptions',
		'orders',
		'customers',
		'checkouts',
		'checkout-links',
		'benefits',
		'benefit-grants',
		'license-keys',
		'discounts',
		'custom-fields',
		'files',
		'refunds',
		'disputes',
		'payments',
		'meters',
		'customer-meters',
		'events',
		'event-types',
		'metrics',
		'members',
		'customer-seats',
		'customer-sessions',
		'member-sessions',
		'webhooks',
		'oauth2',
		'oauth2-clients',
		'org-tokens',
		'portal',
		'config',
		'auth'
	]

	test('all expected commands appear in root --help', async () => {
		const { stdout } = await run('--help')
		for (const cmd of expectedCommands) {
			expect(stdout, `Missing command: ${cmd}`).toContain(cmd)
		}
	})
})

// ─── Resource subcommands have help ──────────────────────────────────

describe('resource help menus', () => {
	const resourcesWithSubcommands = [
		{ cmd: 'products', expected: ['list', 'get', 'create', 'update'] },
		{
			cmd: 'customers',
			expected: ['list', 'get', 'create', 'update', 'delete', 'export']
		},
		{
			cmd: 'subscriptions',
			expected: ['list', 'get', 'create', 'update', 'revoke', 'export']
		},
		{
			cmd: 'orders',
			expected: ['list', 'get', 'update', 'invoice', 'export']
		},
		{ cmd: 'checkouts', expected: ['list', 'get', 'create', 'update'] },
		{
			cmd: 'benefits',
			expected: ['list', 'get', 'create', 'update', 'delete', 'grants']
		},
		{
			cmd: 'license-keys',
			expected: [
				'list',
				'get',
				'update',
				'validate',
				'activate',
				'deactivate'
			]
		},
		{
			cmd: 'discounts',
			expected: ['list', 'get', 'create', 'update', 'delete']
		},
		{
			cmd: 'webhooks',
			expected: ['list', 'get', 'create', 'update', 'delete']
		},
		{
			cmd: 'meters',
			expected: ['list', 'get', 'create', 'update', 'quantities']
		},
		{ cmd: 'events', expected: ['list', 'get', 'ingest'] },
		{ cmd: 'members', expected: ['list', 'create', 'update', 'delete'] }
	]

	for (const { cmd, expected } of resourcesWithSubcommands) {
		test(`${cmd} has expected subcommands`, async () => {
			const { stdout, exitCode } = await run(`${cmd} --help`)
			expect(exitCode).toBe(0)
			for (const sub of expected) {
				expect(stdout, `${cmd} missing subcommand: ${sub}`).toContain(
					sub
				)
			}
		})
	}
})

// ─── Portal subcommands ──────────────────────────────────────────────

describe('portal subcommands', () => {
	const expectedPortalSubs = [
		'benefit-grants',
		'customer',
		'subscriptions',
		'orders',
		'license-keys',
		'downloadables',
		'members',
		'seats',
		'meters',
		'session',
		'org',
		'wallets'
	]

	test('portal has all expected sub-resources', async () => {
		const { stdout, exitCode } = await run('portal --help')
		expect(exitCode).toBe(0)
		for (const sub of expectedPortalSubs) {
			expect(stdout, `Portal missing: ${sub}`).toContain(sub)
		}
	})
})

// ─── Auth required for API commands ──────────────────────────────────

describe('auth enforcement', () => {
	test('products list requires auth', async () => {
		const { exitCode, stderr } = await run('products list')
		expect(exitCode).toBe(1)
		expect(stderr).toContain('Unauthorized')
	})

	test('customers list requires auth', async () => {
		const { exitCode, stderr } = await run('customers list')
		expect(exitCode).toBe(1)
		expect(stderr).toContain('Unauthorized')
	})
})

// ─── Config commands work without auth ───────────────────────────────

describe('config commands', () => {
	test('config list works without auth', async () => {
		const { exitCode, stdout } = await run('config list')
		expect(exitCode).toBe(0)
		expect(stdout).toContain('server=')
		expect(stdout).toContain('defaultLimit=')
	})
})

// ─── Auth commands ───────────────────────────────────────────────────

describe('auth commands', () => {
	test('auth status shows not authenticated', async () => {
		const { exitCode, stdout } = await run('auth status')
		expect(exitCode).toBe(0)
		expect(stdout).toContain('Not authenticated')
	})

	test('auth login requires --token', async () => {
		const { exitCode } = await run('auth login')
		expect(exitCode).toBe(2)
	})
})

// ─── List commands show filter flags ─────────────────────────────────

describe('list command flags', () => {
	test('products list has filter flags', async () => {
		const { stdout } = await run('products list --help')
		expect(stdout).toContain('--is-recurring')
		expect(stdout).toContain('--is-archived')
		expect(stdout).toContain('--query')
		expect(stdout).toContain('--sorting')
		expect(stdout).toContain('--limit')
		expect(stdout).toContain('--page')
		expect(stdout).toContain('--first')
	})

	test('subscriptions list has correct flags (no --status)', async () => {
		const { stdout } = await run('subscriptions list --help')
		expect(stdout).toContain('--active')
		expect(stdout).toContain('--cancel-at-period-end')
		expect(stdout).toContain('--customer-id')
		expect(stdout).toContain('--external-customer-id')
		expect(stdout).not.toContain('--status')
	})

	test('payments list has --customer-email not --customer-id', async () => {
		const { stdout } = await run('payments list --help')
		expect(stdout).toContain('--customer-email')
	})

	test('events list has timestamp filters', async () => {
		const { stdout } = await run('events list --help')
		expect(stdout).toContain('--start-timestamp')
		expect(stdout).toContain('--end-timestamp')
		expect(stdout).toContain('--meter-id')
	})
})

// ─── Create commands show required flags ─────────────────────────────

describe('create command flags', () => {
	test('checkouts create has all flags from SPEC', async () => {
		const { stdout } = await run('checkouts create --help')
		expect(stdout).toContain('--products')
		expect(stdout).toContain('--discount-id')
		expect(stdout).toContain('--allow-discount-codes')
		expect(stdout).toContain('--success-url')
		expect(stdout).toContain('--currency')
		expect(stdout).toContain('--seats')
		expect(stdout).toContain('--metadata')
	})

	test('discounts create has all flags', async () => {
		const { stdout } = await run('discounts create --help')
		expect(stdout).toContain('--name')
		expect(stdout).toContain('--type')
		expect(stdout).toContain('--amount')
		expect(stdout).toContain('--duration')
		expect(stdout).toContain('--max-redemptions')
		expect(stdout).toContain('--starts-at')
		expect(stdout).toContain('--ends-at')
	})
})
