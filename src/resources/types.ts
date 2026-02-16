export type OperationType =
	| 'list'
	| 'get'
	| 'create'
	| 'update'
	| 'delete'
	| 'custom'

export interface FlagDef {
	name: string // CLI flag name, e.g. "is-recurring"
	sdkField: string // SDK parameter name, e.g. "isRecurring"
	description: string
	type: 'string' | 'boolean' | 'number' | 'string[]' | 'json'
	required?: boolean
}

export interface OperationDef {
	type: OperationType
	sdkMethod: string // Method name on SDK namespace
	description: string
	args?: { name: string; description: string; required?: boolean }[]
	flags?: FlagDef[]
	idParam?: string // defaults to "id"
	paginatable?: boolean // defaults to true for "list"
	confirmRequired?: boolean // for delete operations
	examples?: string[] // Example commands shown in --help
}

export interface ResourceDef {
	name: string // singular: "product"
	plural: string // "products"
	cliName: string // CLI command name: "products"
	sdkNamespace: string // property on Polar client: "products"
	description: string // help description
	defaultFields: string[]
	operations: OperationDef[]
	subNamespace?: string // for nested like customerPortal.benefitGrants
	examples?: string[] // Example commands shown in resource --help
}
