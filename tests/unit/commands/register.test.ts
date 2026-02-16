import { describe, expect, test } from 'bun:test'
import { Command } from 'commander'
import {
	registerAllResources,
	registerResource
} from '../../../src/commands/register'
import { getResource, RESOURCES } from '../../../src/resources/registry'

function createProgram(): Command {
	const program = new Command().name('polar')
	program.exitOverride() // Don't actually exit in tests
	return program
}

const mockGetClient = async () => ({}) as any
const mockGetGlobalOpts = () => ({})

describe('registerResource', () => {
	test('registers a resource with its operations as subcommands', () => {
		const program = createProgram()
		const resource = getResource('products')!
		registerResource(program, resource, mockGetClient, mockGetGlobalOpts)

		const productsCmd = program.commands.find(c => c.name() === 'products')
		expect(productsCmd).toBeDefined()

		const subCmdNames = productsCmd?.commands.map(c => c.name())
		expect(subCmdNames).toContain('list')
		expect(subCmdNames).toContain('get')
		expect(subCmdNames).toContain('create')
		expect(subCmdNames).toContain('update')
	})

	test('registers portal resources under portal parent', () => {
		const program = createProgram()
		const resource = getResource('portal-subscriptions')!
		registerResource(program, resource, mockGetClient, mockGetGlobalOpts)

		const portalCmd = program.commands.find(c => c.name() === 'portal')
		expect(portalCmd).toBeDefined()

		const subCmd = portalCmd?.commands.find(
			c => c.name() === 'subscriptions'
		)
		expect(subCmd).toBeDefined()
	})
})

describe('registerAllResources', () => {
	test('registers all resources from registry', () => {
		const program = createProgram()
		registerAllResources(
			program,
			RESOURCES,
			mockGetClient,
			mockGetGlobalOpts
		)

		const cmdNames = program.commands.map(c => c.name())
		expect(cmdNames).toContain('products')
		expect(cmdNames).toContain('customers')
		expect(cmdNames).toContain('subscriptions')
		expect(cmdNames).toContain('orders')
		expect(cmdNames).toContain('checkouts')
		expect(cmdNames).toContain('benefits')
		expect(cmdNames).toContain('webhooks')
		expect(cmdNames).toContain('portal')
		expect(cmdNames).toContain('meters')
		expect(cmdNames).toContain('events')
		expect(cmdNames).toContain('members')
		expect(cmdNames).toContain('orgs')
		expect(cmdNames).toContain('org-tokens')
		expect(cmdNames).toContain('oauth2')
	})

	test('portal has sub-commands', () => {
		const program = createProgram()
		registerAllResources(
			program,
			RESOURCES,
			mockGetClient,
			mockGetGlobalOpts
		)

		const portalCmd = program.commands.find(c => c.name() === 'portal')
		expect(portalCmd).toBeDefined()

		const portalSubNames = portalCmd?.commands.map(c => c.name())
		expect(portalSubNames).toContain('subscriptions')
		expect(portalSubNames).toContain('orders')
		expect(portalSubNames).toContain('benefit-grants')
	})
})
