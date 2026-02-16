import type { Polar } from '@polar-sh/sdk'
import { RFCDate } from '@polar-sh/sdk/types/rfcdate.js'
import type { Command } from 'commander'
import { resolveFormat } from '../output/index'
import { type ExecuteOptions, executeOperation } from '../resources/handler'
import type { FlagDef, OperationDef, ResourceDef } from '../resources/types'
import {
	classifySDKError,
	formatError,
	formatErrorCompact
} from '../utils/errors'

function flagNameToCLI(name: string): string {
	// Convert camelCase sdkField to --kebab-case CLI flag
	// e.g. "isRecurring" -> "--is-recurring"
	// e.g. "customerId" -> "--customer-id"
	return name.replace(/([A-Z])/g, '-$1').toLowerCase()
}

function addFlagsToCommand(cmd: Command, flags: FlagDef[]): void {
	for (const flag of flags) {
		const cliFlag = flagNameToCLI(flag.name)
		const flagStr =
			flag.type === 'boolean' ? `--${cliFlag}` : `--${cliFlag} <value>`

		if (flag.required) {
			cmd.requiredOption(flagStr, flag.description)
		} else {
			cmd.option(flagStr, flag.description)
		}
	}
}

function extractFlags(
	opts: Record<string, any>,
	flags?: FlagDef[]
): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	if (!flags) return result

	for (const flag of flags) {
		// Commander converts --kebab-case to camelCase in opts
		// Try the flag name directly (which is the sdkField)
		const value = opts[flag.sdkField] ?? opts[flag.name]
		if (value !== undefined) {
			// Parse value based on type
			if (flag.type === 'number' && typeof value === 'string') {
				result[flag.sdkField] = parseInt(value, 10)
			} else if (flag.type === 'boolean' && typeof value === 'string') {
				result[flag.sdkField] = value === 'true'
			} else if (flag.type === 'json' && typeof value === 'string') {
				try {
					result[flag.sdkField] = JSON.parse(value)
				} catch {
					result[flag.sdkField] = value
				}
			} else if (flag.type === 'string[]' && typeof value === 'string') {
				result[flag.sdkField] = value.split(',').map(s => s.trim())
			} else if (flag.type === 'date' && typeof value === 'string') {
				result[flag.sdkField] = new Date(value)
			} else if (flag.type === 'rfcdate' && typeof value === 'string') {
				result[flag.sdkField] = new RFCDate(value)
			} else {
				result[flag.sdkField] = value
			}
		}
	}

	return result
}

export function registerResource(
	program: Command,
	resource: ResourceDef,
	getClient: () => Promise<Polar>,
	getGlobalOpts: () => Record<string, any>
): void {
	// Handle portal sub-commands - they go under "portal" parent
	const isPortal = resource.cliName.startsWith('portal-')

	let parentCmd: Command
	if (isPortal) {
		// Find or create the "portal" parent command
		let portalCmd = program.commands.find(c => c.name() === 'portal')
		if (!portalCmd) {
			portalCmd = program
				.command('portal')
				.description(
					'Customer portal operations (subscriptions, orders, benefits)'
				)
		}
		parentCmd = portalCmd
	} else {
		parentCmd = program
	}

	const cmdName = isPortal
		? resource.cliName.replace('portal-', '')
		: resource.cliName
	const resourceCmd = parentCmd
		.command(cmdName)
		.description(resource.description)

	if (resource.examples?.length) {
		resourceCmd.addHelpText(
			'after',
			`\nExamples:\n${resource.examples.map(e => `  $ ${e}`).join('\n')}`
		)
	}

	for (const operation of resource.operations) {
		registerOperation(
			resourceCmd,
			resource,
			operation,
			getClient,
			getGlobalOpts
		)
	}
}

function registerOperation(
	resourceCmd: Command,
	resource: ResourceDef,
	operation: OperationDef,
	getClient: () => Promise<Polar>,
	getGlobalOpts: () => Record<string, any>
): void {
	// Determine the subcommand name
	let cmdName: string
	let cmdArgs = ''

	switch (operation.type) {
		case 'list':
			cmdName = 'list'
			break
		case 'get':
			cmdName = 'get'
			cmdArgs = '<id>'
			break
		case 'create':
			cmdName = 'create'
			break
		case 'update':
			cmdName = 'update'
			cmdArgs = '<id>'
			break
		case 'delete':
			cmdName = 'delete'
			cmdArgs = '<id>'
			break
		case 'custom':
			// Derive name from sdkMethod
			cmdName = operation.sdkMethod
				.replace(/([A-Z])/g, '-$1')
				.toLowerCase()
				.replace(/^-/, '')
			// Handle positional args
			if (operation.args) {
				cmdArgs = operation.args
					.map(a => (a.required ? `<${a.name}>` : `[${a.name}]`))
					.join(' ')
			}
			break
	}

	const subCmd = resourceCmd
		.command(`${cmdName}${cmdArgs ? ` ${cmdArgs}` : ''}`)
		.description(operation.description)

	if (operation.examples?.length) {
		subCmd.addHelpText(
			'after',
			`\nExamples:\n${operation.examples.map(e => `  $ ${e}`).join('\n')}`
		)
	}

	// Add operation-specific flags
	if (operation.flags) {
		addFlagsToCommand(subCmd, operation.flags)
	}

	// Add pagination flags for list operations
	if (operation.type === 'list' || operation.paginatable) {
		subCmd.option('-l, --limit <n>', 'Items per page', parseInt)
		subCmd.option('-p, --page <n>', 'Page number', parseInt)
		subCmd.option(
			'--first <n>',
			'Shorthand for --limit N --page 1',
			parseInt
		)
		subCmd.option('--all', 'Fetch all pages')
	}

	// Register the action
	subCmd.action(async (...actionArgs: any[]) => {
		try {
			const client = await getClient()
			const globalOpts = getGlobalOpts()

			// Parse positional args
			const args: Record<string, string> = {}
			// Commander passes positional args before the options object
			// For "get <id>", actionArgs = [id, opts, cmd]
			// For "custom <a> <b>", actionArgs = [a, b, opts, cmd]
			const opts = actionArgs[actionArgs.length - 2] ?? {}
			const allOpts = { ...opts }

			if (
				operation.type === 'get' ||
				operation.type === 'update' ||
				operation.type === 'delete'
			) {
				args.id = actionArgs[0]
			} else if (operation.type === 'custom' && operation.args) {
				for (let i = 0; i < operation.args.length; i++) {
					const argDef = operation.args[i]
					if (argDef) args[argDef.name] = actionArgs[i]
				}
			}

			// Extract flags
			const flags = extractFlags(allOpts, operation.flags)

			// Add global org
			if (globalOpts.org || process.env.POLAR_ORGANIZATION_ID) {
				flags.organizationId =
					globalOpts.org ?? process.env.POLAR_ORGANIZATION_ID
			}

			// Determine output format
			const isTTY = process.stdout.isTTY ?? false
			const format = resolveFormat(
				globalOpts.output,
				process.env.POLAR_OUTPUT,
				isTTY
			)

			// Determine limit
			const limit = allOpts.first ?? allOpts.limit ?? (isTTY ? 25 : 10)
			const page = allOpts.first ? 1 : (allOpts.page ?? 1)

			// Parse fields
			const fields = globalOpts.fields
				?.split(',')
				.map((f: string) => f.trim())

			const execOptions: ExecuteOptions = {
				args,
				flags,
				output: {
					format: format as any,
					fields,
					detail: globalOpts.detail,
					quiet: globalOpts.quiet,
					noColor: globalOpts.noColor ?? !isTTY
				},
				limit,
				page
			}

			// Check confirmation for destructive actions
			if (operation.confirmRequired && !globalOpts.yes) {
				const isTty = process.stdout.isTTY ?? false
				if (!isTty) {
					const cliError = { type: 'ConfirmationRequired' }
					process.stderr.write(
						`${isTty ? formatError(cliError) : formatErrorCompact(cliError)}\n`
					)
					process.exit(1)
				}
			}

			const result = await executeOperation(
				client,
				resource,
				operation,
				execOptions
			)

			if (result.stdout) {
				process.stdout.write(`${result.stdout}\n`)
			}
			if (result.stderr) {
				process.stderr.write(`${result.stderr}\n`)
			}
			process.exit(result.exitCode)
		} catch (err: any) {
			const cliError = classifySDKError(err, resource.name)
			const isTTY = process.stdout.isTTY ?? false
			process.stderr.write(
				`${isTTY ? formatError(cliError) : formatErrorCompact(cliError)}\n`
			)
			process.exit(cliError.code === 2 ? 2 : 1)
		}
	})
}

export function registerAllResources(
	program: Command,
	resources: ResourceDef[],
	getClient: () => Promise<Polar>,
	getGlobalOpts: () => Record<string, any>
): void {
	for (const resource of resources) {
		registerResource(program, resource, getClient, getGlobalOpts)
	}
}
