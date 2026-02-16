#!/usr/bin/env bun

import { Command } from 'commander'
import pkg from '../package.json'
import { Auth } from '../src/auth'
import { createClient } from '../src/client'
import { registerAllResources } from '../src/commands/register'
import { Config } from '../src/config'
import { RESOURCES } from '../src/resources/registry'
import { formatError, formatErrorCompact } from '../src/utils/errors'

const VERSION = pkg.version

const program = new Command()
	.name('polar')
	.description(
		'Unofficial CLI for Polar (polar.sh) — manage your resources from the command line'
	)
	.version(VERSION)
	.addHelpText(
		'after',
		`
Getting started:
  $ polar auth login --token <your-access-token>
  $ polar products list
  $ polar customers list --limit 5

Use "polar <command> --help" for more information about a command.`
	)

// Global options
program
	.option(
		'-o, --output <format>',
		'Output format: table|compact|json|jsonl|csv|tsv|id|count'
	)
	.option('-f, --fields <list>', 'Comma-separated field list')
	.option('-e, --expand <rels>', 'Expand relations')
	.option('-d, --detail', 'Full detail view')
	.option('-s, --server <name>', 'Server: production|sandbox')
	.option('--org <id>', 'Organization ID override')
	.option('--no-color', 'Disable color')
	.option('--verbose', 'Debug output to stderr')
	.option('-q, --quiet', 'Data only, no hints')
	.option('-y, --yes', 'Skip confirmation prompts')

// Config commands (no auth needed)
const configCmd = program
	.command('config')
	.description('CLI configuration management')
	.addHelpText(
		'after',
		`
Examples:
  $ polar config list
  $ polar config get server
  $ polar config set server sandbox
  $ polar config reset`
	)

configCmd
	.command('list')
	.description('List all config values')
	.action(() => {
		const config = new Config()
		const values = config.list()
		for (const [key, value] of Object.entries(values)) {
			process.stdout.write(`${key}=${JSON.stringify(value)}\n`)
		}
	})

configCmd
	.command('get <key>')
	.description('Get a config value')
	.action((key: string) => {
		const config = new Config()
		process.stdout.write(`${JSON.stringify(config.get(key as any))}\n`)
	})

configCmd
	.command('set <key> <value>')
	.description('Set a config value')
	.action(async (key: string, value: string) => {
		const config = new Config()
		let parsed: any = value
		if (value === 'true') parsed = true
		else if (value === 'false') parsed = false
		else if (/^\d+$/.test(value)) parsed = parseInt(value, 10)
		await config.set(key as any, parsed)
		process.stdout.write(`Set ${key}=${JSON.stringify(parsed)}\n`)
	})

configCmd
	.command('reset')
	.description('Reset to defaults')
	.action(async () => {
		const config = new Config()
		await config.reset()
		process.stdout.write('Config reset to defaults.\n')
	})

// Auth commands (no auth needed for these either)
const authCmd = program
	.command('auth')
	.description('Authenticate with Polar')
	.addHelpText(
		'after',
		`
Examples:
  $ polar auth login --token polar_at_xxx
  $ polar auth status
  $ polar auth logout

Get your access token at https://polar.sh/settings`
	)

authCmd
	.command('login')
	.description('Login with access token')
	.option('--token <token>', 'Access token')
	.action(async (opts: any) => {
		const auth = new Auth()
		if (!opts.token) {
			process.stderr.write(
				'Error: Missing required --token flag.\n' +
					'  Usage: polar auth login --token <your-access-token>\n' +
					'  Get your token at https://polar.sh/settings\n'
			)
			process.exit(2)
		}
		await auth.login(opts.token)
		process.stdout.write('Authenticated successfully.\n')
	})

authCmd
	.command('logout')
	.description('Remove stored credentials')
	.action(async () => {
		const auth = new Auth()
		await auth.logout()
		process.stdout.write('Logged out.\n')
	})

authCmd
	.command('status')
	.description('Show current auth state')
	.action(async () => {
		const auth = new Auth()
		const status = await auth.status()
		if (status.authenticated) {
			process.stdout.write(
				`Authenticated: ${status.tokenPrefix} (server: ${status.server})\n`
			)
		} else {
			process.stdout.write("Not authenticated. Run 'polar auth login'.\n")
		}
	})

// Create client getter (lazy, requires auth)
function getClientFactory() {
	const config = new Config()
	const auth = new Auth()

	return async (): Promise<any> => {
		const token = process.env.POLAR_ACCESS_TOKEN ?? (await auth.getToken())
		if (!token) {
			const isTTY = process.stdout.isTTY ?? false
			const err = {
				type: 'Unauthorized',
				code: 401,
				message: 'No access token found'
			}
			process.stderr.write(
				`${isTTY ? formatError(err) : formatErrorCompact(err)}\n`
			)
			process.exit(1)
		}
		const globalOpts = program.opts()
		const server = (globalOpts.server ??
			process.env.POLAR_SERVER ??
			config.get('server')) as 'production' | 'sandbox'
		return createClient({ accessToken: token, server })
	}
}

// Register ALL resources from registry
registerAllResources(program, RESOURCES, getClientFactory(), () =>
	program.opts()
)

// Handle unknown commands
program.showSuggestionAfterError(true)

// Configure error output
program.configureOutput({
	writeErr: str => process.stderr.write(str),
	writeOut: str => process.stdout.write(str)
})

program.exitOverride(err => {
	if (err.code === 'commander.unknownCommand') {
		process.exit(2)
	}
	if (
		err.code === 'commander.helpDisplayed' ||
		err.code === 'commander.version'
	) {
		process.exit(0)
	}
})

// Run
program.parseAsync(process.argv).catch(err => {
	if (err.code === 'commander.unknownCommand') {
		process.exit(2)
	}
	process.stderr.write(`${err.message}\n`)
	process.exit(1)
})
