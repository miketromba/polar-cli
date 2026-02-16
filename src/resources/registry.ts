import type { FlagDef, ResourceDef } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flag(
	name: string,
	sdkField: string,
	type: FlagDef['type'],
	description: string,
	required?: boolean
): FlagDef {
	return {
		name,
		sdkField,
		type,
		description,
		...(required ? { required } : {})
	}
}

/** Convert camelCase to kebab-case for CLI flag names */
function kebab(s: string): string {
	return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Shorthand: derive CLI flag name from SDK field automatically */
function f(
	sdkField: string,
	type: FlagDef['type'],
	description: string,
	required?: boolean
): FlagDef {
	return flag(kebab(sdkField), sdkField, type, description, required)
}

// Common reusable flags
const sortingFlag = f(
	'sorting',
	'string[]',
	'Sort fields (e.g. created_at, -created_at)'
)
const metadataFlag = f('metadata', 'json', 'Filter by metadata (JSON object)')
const metadataInputFlag = f('metadata', 'json', 'Metadata (JSON object)')

// ---------------------------------------------------------------------------
// 1. Organizations
// ---------------------------------------------------------------------------

const organizations: ResourceDef = {
	name: 'organization',
	plural: 'organizations',
	cliName: 'orgs',
	sdkNamespace: 'organizations',
	description: 'Manage organizations',
	defaultFields: ['id', 'name', 'slug', 'status'],
	examples: [
		'polar orgs list',
		'polar orgs list --slug my-org',
		'polar orgs create --name "My Organization"',
		'polar orgs get <id>'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List organizations',
			paginatable: true,
			flags: [f('slug', 'string', 'Filter by slug'), sortingFlag]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get an organization'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create an organization',
			flags: [
				f('name', 'string', 'Organization name', true),
				f('slug', 'string', 'Organization slug')
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update an organization',
			flags: [
				f('name', 'string', 'Organization name'),
				f('slug', 'string', 'Organization slug'),
				f('avatarUrl', 'string', 'Avatar URL')
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 2. Products
// ---------------------------------------------------------------------------

const products: ResourceDef = {
	name: 'product',
	plural: 'products',
	cliName: 'products',
	sdkNamespace: 'products',
	description: 'Manage products (list, create, update, archive)',
	defaultFields: [
		'id',
		'name',
		'isRecurring',
		'isArchived',
		'prices',
		'benefits'
	],
	examples: [
		'polar products list',
		'polar products list --query "Pro" --limit 5',
		'polar products list --is-recurring --output json',
		'polar products create --name "Pro Plan" --prices \'[{"amount":2999,"currency":"usd","recurringInterval":"month"}]\'',
		'polar products get <id>',
		'polar products update <id> --name "Enterprise Plan"',
		'polar products update <id> --is-archived'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List products',
			paginatable: true,
			flags: [
				f('id', 'string[]', 'Filter by product IDs'),
				f('query', 'string', 'Search query'),
				f('isArchived', 'boolean', 'Filter by archived status'),
				f('isRecurring', 'boolean', 'Filter by recurring status'),
				f('benefitId', 'string', 'Filter by benefit ID'),
				f('visibility', 'string', 'Filter by visibility'),
				metadataFlag,
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a product'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a product',
			flags: [
				f('name', 'string', 'Product name', true),
				f('description', 'string', 'Product description'),
				f('prices', 'json', 'Prices (JSON array)'),
				f(
					'recurringInterval',
					'string',
					'Recurring interval (month, year)'
				),
				f(
					'recurringIntervalCount',
					'number',
					'Number of recurring intervals'
				),
				f('trialInterval', 'string', 'Trial interval'),
				f('trialIntervalCount', 'number', 'Number of trial intervals'),
				f('visibility', 'string', 'Product visibility'),
				f('medias', 'string[]', 'Media file IDs'),
				f(
					'attachedCustomFields',
					'json',
					'Attached custom fields (JSON)'
				),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a product',
			flags: [
				f('name', 'string', 'Product name'),
				f('description', 'string', 'Product description'),
				f('isArchived', 'boolean', 'Archive the product'),
				f('prices', 'json', 'Prices (JSON array)'),
				f(
					'recurringInterval',
					'string',
					'Recurring interval (month, year)'
				),
				f(
					'recurringIntervalCount',
					'number',
					'Number of recurring intervals'
				),
				f('trialInterval', 'string', 'Trial interval'),
				f('trialIntervalCount', 'number', 'Number of trial intervals'),
				f('visibility', 'string', 'Product visibility'),
				f('medias', 'string[]', 'Media file IDs'),
				f(
					'attachedCustomFields',
					'json',
					'Attached custom fields (JSON)'
				),
				metadataInputFlag
			]
		},
		{
			type: 'custom',
			sdkMethod: 'updateBenefits',
			description: 'Update product benefits',
			args: [{ name: 'id', description: 'Product ID', required: true }],
			flags: [f('benefits', 'string[]', 'Benefit IDs to attach', true)]
		}
	]
}

// ---------------------------------------------------------------------------
// 3. Subscriptions
// ---------------------------------------------------------------------------

const subscriptions: ResourceDef = {
	name: 'subscription',
	plural: 'subscriptions',
	cliName: 'subscriptions',
	sdkNamespace: 'subscriptions',
	description: 'Manage subscriptions (list, get, create, revoke)',
	defaultFields: [
		'id',
		'status',
		'customer',
		'product',
		'currentPeriodEnd',
		'amount',
		'currency'
	],
	examples: [
		'polar subscriptions list',
		'polar subscriptions list --active --limit 20',
		'polar subscriptions list --customer-id <id>',
		'polar subscriptions list --product-id <id> --output json',
		'polar subscriptions create --customer-id <id> --product-id <id>',
		'polar subscriptions get <id>',
		'polar subscriptions update <id> --cancel-at-period-end',
		'polar subscriptions revoke <id>'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List subscriptions',
			paginatable: true,
			flags: [
				f('productId', 'string', 'Filter by product ID'),
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				f('active', 'boolean', 'Filter by active status'),
				f(
					'cancelAtPeriodEnd',
					'boolean',
					'Filter by cancel-at-period-end'
				),
				f('discountId', 'string', 'Filter by discount ID'),
				metadataFlag,
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a subscription'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a subscription',
			flags: [
				f('customerId', 'string', 'Customer ID', true),
				f('productId', 'string', 'Product ID', true),
				f('externalCustomerId', 'string', 'External customer ID'),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a subscription',
			flags: [
				f('productId', 'string', 'Product ID'),
				f('prorationBehavior', 'string', 'Proration behavior'),
				f('cancelAtPeriodEnd', 'boolean', 'Cancel at period end'),
				f('discountId', 'string', 'Discount ID'),
				f('seats', 'number', 'Number of seats'),
				metadataInputFlag
			]
		},
		{
			type: 'custom',
			sdkMethod: 'revoke',
			description: 'Revoke a subscription',
			args: [
				{ name: 'id', description: 'Subscription ID', required: true }
			]
		},
		{
			type: 'custom',
			sdkMethod: 'export',
			description: 'Export subscriptions'
		}
	]
}

// ---------------------------------------------------------------------------
// 4. Orders
// ---------------------------------------------------------------------------

const orders: ResourceDef = {
	name: 'order',
	plural: 'orders',
	cliName: 'orders',
	sdkNamespace: 'orders',
	description: 'Manage orders (list, get, invoices, export)',
	defaultFields: [
		'id',
		'status',
		'product',
		'customer',
		'totalAmount',
		'currency',
		'createdAt'
	],
	examples: [
		'polar orders list',
		'polar orders list --product-id <id> --limit 50',
		'polar orders list --customer-id <id> --output json',
		'polar orders get <id>',
		'polar orders get <id> --detail',
		'polar orders invoice <id>',
		'polar orders export'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List orders',
			paginatable: true,
			flags: [
				f('productId', 'string', 'Filter by product ID'),
				f(
					'productBillingType',
					'string',
					'Filter by product billing type'
				),
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				f('discountId', 'string', 'Filter by discount ID'),
				f('checkoutId', 'string', 'Filter by checkout ID'),
				metadataFlag,
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get an order'
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update an order',
			flags: [
				f('billingName', 'string', 'Billing name'),
				f('billingAddress', 'json', 'Billing address (JSON)')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'invoice',
			description: 'Get order invoice',
			args: [{ name: 'id', description: 'Order ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'generateInvoice',
			description: 'Generate order invoice',
			args: [{ name: 'id', description: 'Order ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'export',
			description: 'Export orders'
		}
	]
}

// ---------------------------------------------------------------------------
// 5. Customers
// ---------------------------------------------------------------------------

const customers: ResourceDef = {
	name: 'customer',
	plural: 'customers',
	cliName: 'customers',
	sdkNamespace: 'customers',
	description: 'Manage customers (list, create, update, delete)',
	defaultFields: ['id', 'email', 'name', 'type', 'createdAt'],
	examples: [
		'polar customers list',
		'polar customers list --email user@example.com',
		'polar customers list --query "jane" --limit 10',
		'polar customers create --email user@example.com --name "Jane Doe"',
		'polar customers get <id>',
		'polar customers update <id> --name "Jane Smith"',
		'polar customers delete <id> --yes',
		'polar customers get-state <id>',
		'polar customers export --output json'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List customers',
			paginatable: true,
			flags: [
				f('email', 'string', 'Filter by email'),
				f('query', 'string', 'Search query'),
				metadataFlag,
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a customer'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a customer',
			flags: [
				f('email', 'string', 'Customer email', true),
				f('name', 'string', 'Customer name'),
				f('type', 'string', 'Customer type'),
				f('externalId', 'string', 'External ID'),
				f('billingAddress', 'json', 'Billing address (JSON)'),
				f('taxId', 'json', 'Tax ID (JSON)'),
				f('locale', 'string', 'Customer locale'),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a customer',
			flags: [
				f('email', 'string', 'Customer email'),
				f('name', 'string', 'Customer name'),
				f('type', 'string', 'Customer type'),
				f('externalId', 'string', 'External ID'),
				f('billingAddress', 'json', 'Billing address (JSON)'),
				f('taxId', 'json', 'Tax ID (JSON)'),
				f('locale', 'string', 'Customer locale'),
				metadataInputFlag
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete a customer',
			confirmRequired: true
		},
		{
			type: 'custom',
			sdkMethod: 'getExternal',
			description: 'Get customer by external ID',
			args: [
				{
					name: 'externalId',
					description: 'External ID',
					required: true
				}
			]
		},
		{
			type: 'custom',
			sdkMethod: 'deleteExternal',
			description: 'Delete customer by external ID',
			args: [
				{
					name: 'externalId',
					description: 'External ID',
					required: true
				}
			]
		},
		{
			type: 'custom',
			sdkMethod: 'updateExternal',
			description: 'Update customer by external ID',
			args: [
				{
					name: 'externalId',
					description: 'External ID',
					required: true
				}
			],
			flags: [
				f('email', 'string', 'Customer email'),
				f('name', 'string', 'Customer name'),
				f('billingAddress', 'json', 'Billing address (JSON)'),
				f('taxId', 'json', 'Tax ID (JSON)'),
				f('locale', 'string', 'Customer locale'),
				metadataInputFlag
			]
		},
		{
			type: 'custom',
			sdkMethod: 'getState',
			description: 'Get customer state',
			args: [{ name: 'id', description: 'Customer ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'getStateExternal',
			description: 'Get customer state by external ID',
			args: [
				{
					name: 'externalId',
					description: 'External ID',
					required: true
				}
			]
		},
		{
			type: 'custom',
			sdkMethod: 'export',
			description: 'Export customers'
		}
	]
}

// ---------------------------------------------------------------------------
// 6. Checkouts
// ---------------------------------------------------------------------------

const checkouts: ResourceDef = {
	name: 'checkout',
	plural: 'checkouts',
	cliName: 'checkouts',
	sdkNamespace: 'checkouts',
	description: 'Manage checkout sessions',
	defaultFields: [
		'id',
		'status',
		'products',
		'totalAmount',
		'currency',
		'url'
	],
	examples: [
		'polar checkouts list',
		'polar checkouts list --status open',
		'polar checkouts create --products <product-id>',
		'polar checkouts create --products <product-id> --customer-email user@example.com',
		'polar checkouts get <id>'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List checkouts',
			paginatable: true,
			flags: [
				f('productId', 'string', 'Filter by product ID'),
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				f('status', 'string', 'Filter by status'),
				f('query', 'string', 'Search query'),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a checkout session'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a checkout session',
			flags: [
				f('products', 'string[]', 'Product IDs', true),
				f('customerId', 'string', 'Customer ID'),
				f('externalCustomerId', 'string', 'External customer ID'),
				f('customerEmail', 'string', 'Customer email'),
				f('customerName', 'string', 'Customer name'),
				f('customerBillingName', 'string', 'Customer billing name'),
				f(
					'customerBillingAddress',
					'json',
					'Customer billing address (JSON)'
				),
				f('customerTaxId', 'json', 'Customer tax ID (JSON)'),
				f('customerIpAddress', 'string', 'Customer IP address'),
				f('customerMetadata', 'json', 'Customer metadata (JSON)'),
				f('isBusinessCustomer', 'boolean', 'Business customer flag'),
				f('discountId', 'string', 'Discount ID'),
				f('allowDiscountCodes', 'boolean', 'Allow discount codes'),
				f(
					'requireBillingAddress',
					'boolean',
					'Require billing address'
				),
				f('amount', 'number', 'Custom amount'),
				f('seats', 'number', 'Number of seats'),
				f('currency', 'string', 'Currency code'),
				f('successUrl', 'string', 'Success redirect URL'),
				f('returnUrl', 'string', 'Return URL'),
				f('embedOrigin', 'string', 'Embed origin URL'),
				f('allowTrial', 'boolean', 'Allow trial'),
				f('trialInterval', 'string', 'Trial interval'),
				f('trialIntervalCount', 'number', 'Number of trial intervals'),
				f(
					'subscriptionId',
					'string',
					'Subscription ID for upgrade/downgrade'
				),
				f('customFieldData', 'json', 'Custom field data (JSON)'),
				f('locale', 'string', 'Locale'),
				f('prices', 'json', 'Prices (JSON)'),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a checkout session',
			flags: [
				f('customerEmail', 'string', 'Customer email'),
				f('customerName', 'string', 'Customer name'),
				f('customerBillingName', 'string', 'Customer billing name'),
				f(
					'customerBillingAddress',
					'json',
					'Customer billing address (JSON)'
				),
				f('customerTaxId', 'json', 'Customer tax ID (JSON)'),
				f('discountId', 'string', 'Discount ID'),
				f('allowDiscountCodes', 'boolean', 'Allow discount codes'),
				f('amount', 'number', 'Custom amount'),
				f('seats', 'number', 'Number of seats'),
				f('customFieldData', 'json', 'Custom field data (JSON)'),
				metadataInputFlag
			]
		},
		{
			type: 'custom',
			sdkMethod: 'clientGet',
			description: 'Get checkout by client secret',
			args: [
				{
					name: 'clientSecret',
					description: 'Client secret',
					required: true
				}
			]
		},
		{
			type: 'custom',
			sdkMethod: 'clientUpdate',
			description: 'Update checkout by client secret',
			args: [
				{
					name: 'clientSecret',
					description: 'Client secret',
					required: true
				}
			],
			flags: [
				f('customerEmail', 'string', 'Customer email'),
				f('customerName', 'string', 'Customer name'),
				f('customerBillingName', 'string', 'Customer billing name'),
				f(
					'customerBillingAddress',
					'json',
					'Customer billing address (JSON)'
				),
				f('customerTaxId', 'json', 'Customer tax ID (JSON)'),
				f('discountId', 'string', 'Discount ID'),
				f('amount', 'number', 'Custom amount'),
				f('customFieldData', 'json', 'Custom field data (JSON)')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'clientConfirm',
			description: 'Confirm checkout session',
			args: [
				{
					name: 'clientSecret',
					description: 'Client secret',
					required: true
				}
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 7. Checkout Links
// ---------------------------------------------------------------------------

const checkoutLinks: ResourceDef = {
	name: 'checkoutLink',
	plural: 'checkoutLinks',
	cliName: 'checkout-links',
	sdkNamespace: 'checkoutLinks',
	description: 'Manage reusable checkout links',
	defaultFields: ['id', 'label', 'product', 'url', 'createdAt'],
	examples: [
		'polar checkout-links list',
		'polar checkout-links create --product-id <id> --label "Buy Pro"',
		'polar checkout-links create --product-id <id> --success-url https://example.com/thanks',
		'polar checkout-links get <id>',
		'polar checkout-links delete <id> --yes'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List checkout links',
			paginatable: true,
			flags: [
				f('productId', 'string', 'Filter by product ID'),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a checkout link'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a checkout link',
			flags: [
				f('productId', 'string', 'Product ID', true),
				f('successUrl', 'string', 'Success redirect URL'),
				f('label', 'string', 'Link label'),
				f('allowDiscountCodes', 'boolean', 'Allow discount codes'),
				f('discountId', 'string', 'Discount ID'),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a checkout link',
			flags: [
				f('label', 'string', 'Link label'),
				f('successUrl', 'string', 'Success redirect URL'),
				f('allowDiscountCodes', 'boolean', 'Allow discount codes'),
				f('discountId', 'string', 'Discount ID'),
				metadataInputFlag
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete a checkout link',
			confirmRequired: true
		}
	]
}

// ---------------------------------------------------------------------------
// 8. Benefits
// ---------------------------------------------------------------------------

const benefits: ResourceDef = {
	name: 'benefit',
	plural: 'benefits',
	cliName: 'benefits',
	sdkNamespace: 'benefits',
	description: 'Manage benefits',
	defaultFields: ['id', 'type', 'description', 'organizationId'],
	examples: [
		'polar benefits list',
		'polar benefits list --type-filter license_keys',
		'polar benefits create --type license_keys --description "Pro License"',
		'polar benefits get <id>',
		'polar benefits grants <id>',
		'polar benefits delete <id> --yes'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List benefits',
			paginatable: true,
			flags: [
				f('id', 'string[]', 'Filter by benefit IDs'),
				f('excludeId', 'string[]', 'Exclude benefit IDs'),
				f('typeFilter', 'string', 'Filter by benefit type'),
				f('query', 'string', 'Search query'),
				metadataFlag,
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a benefit'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a benefit',
			flags: [
				f('type', 'string', 'Benefit type', true),
				f('description', 'string', 'Benefit description', true),
				f('properties', 'json', 'Benefit properties (JSON)'),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a benefit',
			flags: [
				f('description', 'string', 'Benefit description'),
				f('properties', 'json', 'Benefit properties (JSON)'),
				metadataInputFlag
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete a benefit',
			confirmRequired: true
		},
		{
			type: 'custom',
			sdkMethod: 'grants',
			description: 'List benefit grants',
			args: [{ name: 'id', description: 'Benefit ID', required: true }],
			flags: [
				f('customerId', 'string', 'Filter by customer ID'),
				f('memberId', 'string', 'Filter by member ID'),
				f('isGranted', 'boolean', 'Filter by granted status'),
				f('isRevoked', 'boolean', 'Filter by revoked status')
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 9. Benefit Grants
// ---------------------------------------------------------------------------

const benefitGrants: ResourceDef = {
	name: 'benefitGrant',
	plural: 'benefitGrants',
	cliName: 'benefit-grants',
	sdkNamespace: 'benefitGrants',
	description: 'View benefit grant history',
	defaultFields: ['id', 'benefitId', 'customerId', 'isGranted', 'isRevoked'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List benefit grants',
			paginatable: true,
			flags: [
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				f('isGranted', 'boolean', 'Filter by granted status'),
				f('isRevoked', 'boolean', 'Filter by revoked status'),
				sortingFlag
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 10. License Keys
// ---------------------------------------------------------------------------

const licenseKeys: ResourceDef = {
	name: 'licenseKey',
	plural: 'licenseKeys',
	cliName: 'license-keys',
	sdkNamespace: 'licenseKeys',
	description: 'Manage and validate license keys',
	defaultFields: [
		'id',
		'displayKey',
		'status',
		'customer',
		'usage',
		'limitActivations'
	],
	examples: [
		'polar license-keys list',
		'polar license-keys list --benefit-id <id>',
		'polar license-keys get <id>',
		'polar license-keys validate --key XXXX-XXXX --organization-id <org-id>',
		'polar license-keys activate --key XXXX-XXXX --organization-id <org-id> --label "Prod Server"',
		'polar license-keys update <id> --limit-activations 5'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List license keys',
			paginatable: true,
			flags: [
				f('benefitId', 'string', 'Filter by benefit ID'),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a license key'
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a license key',
			flags: [
				f('status', 'string', 'License key status'),
				f('limitActivations', 'number', 'Max activations'),
				f('limitUsage', 'number', 'Max usage count'),
				f('expiresAt', 'string', 'Expiration date (ISO 8601)')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'getActivation',
			description: 'Get activation',
			args: [
				{ name: 'id', description: 'License key ID', required: true }
			],
			flags: [f('activationId', 'string', 'Activation ID', true)]
		},
		{
			type: 'custom',
			sdkMethod: 'validate',
			description: 'Validate license key',
			flags: [
				f('key', 'string', 'License key', true),
				f('organizationId', 'string', 'Organization ID', true),
				f('activationId', 'string', 'Activation ID'),
				f('benefitId', 'string', 'Benefit ID'),
				f('customerId', 'string', 'Customer ID'),
				f('incrementUsage', 'number', 'Increment usage count'),
				f('conditions', 'json', 'Validation conditions (JSON)')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'activate',
			description: 'Activate license key',
			flags: [
				f('key', 'string', 'License key', true),
				f('organizationId', 'string', 'Organization ID', true),
				f('label', 'string', 'Activation label', true),
				f('conditions', 'json', 'Activation conditions (JSON)'),
				f('meta', 'json', 'Activation metadata (JSON)')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'deactivate',
			description: 'Deactivate license key',
			flags: [
				f('key', 'string', 'License key', true),
				f('organizationId', 'string', 'Organization ID', true),
				f('activationId', 'string', 'Activation ID', true)
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 11. Discounts
// ---------------------------------------------------------------------------

const discounts: ResourceDef = {
	name: 'discount',
	plural: 'discounts',
	cliName: 'discounts',
	sdkNamespace: 'discounts',
	description: 'Manage discount codes and promotions',
	defaultFields: ['id', 'name', 'type', 'amount', 'duration', 'code'],
	examples: [
		'polar discounts list',
		'polar discounts create --name "20% Off" --type percentage --amount 20 --duration once',
		'polar discounts create --name "$5 Off" --type fixed --amount 500 --duration forever --code SAVE5',
		'polar discounts get <id>',
		'polar discounts update <id> --max-redemptions 100',
		'polar discounts delete <id> --yes'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List discounts',
			paginatable: true,
			flags: [f('query', 'string', 'Search query'), sortingFlag]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a discount'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a discount',
			flags: [
				f('name', 'string', 'Discount name', true),
				f(
					'type',
					'string',
					'Discount type (percentage, fixed, etc.)',
					true
				),
				f('amount', 'number', 'Discount amount', true),
				f(
					'duration',
					'string',
					'Discount duration (once, repeating, forever)',
					true
				),
				f(
					'durationInMonths',
					'number',
					'Duration in months (for repeating)'
				),
				f('currency', 'string', 'Currency code'),
				f('code', 'string', 'Discount code'),
				f('startsAt', 'string', 'Start date (ISO 8601)'),
				f('endsAt', 'string', 'End date (ISO 8601)'),
				f('maxRedemptions', 'number', 'Max redemptions'),
				f('products', 'string[]', 'Product IDs'),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a discount',
			flags: [
				f('name', 'string', 'Discount name'),
				f('code', 'string', 'Discount code'),
				f('startsAt', 'string', 'Start date (ISO 8601)'),
				f('endsAt', 'string', 'End date (ISO 8601)'),
				f('maxRedemptions', 'number', 'Max redemptions'),
				f('products', 'string[]', 'Product IDs'),
				metadataInputFlag
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete a discount',
			confirmRequired: true
		}
	]
}

// ---------------------------------------------------------------------------
// 12. Custom Fields
// ---------------------------------------------------------------------------

const customFields: ResourceDef = {
	name: 'customField',
	plural: 'customFields',
	cliName: 'custom-fields',
	sdkNamespace: 'customFields',
	description: 'Manage custom checkout/order fields',
	defaultFields: ['id', 'type', 'slug', 'name'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List custom fields',
			paginatable: true,
			flags: [f('query', 'string', 'Search query'), sortingFlag]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a custom field'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a custom field',
			flags: [
				f('type', 'string', 'Field type', true),
				f('slug', 'string', 'Field slug', true),
				f('name', 'string', 'Field name', true),
				f('properties', 'json', 'Field properties (JSON)')
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a custom field',
			flags: [
				f('name', 'string', 'Field name'),
				f('properties', 'json', 'Field properties (JSON)')
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete a custom field',
			confirmRequired: true
		}
	]
}

// ---------------------------------------------------------------------------
// 13. Files
// ---------------------------------------------------------------------------

const files: ResourceDef = {
	name: 'file',
	plural: 'files',
	cliName: 'files',
	sdkNamespace: 'files',
	description: 'Manage file uploads',
	defaultFields: ['id', 'name', 'mimeType', 'size', 'createdAt'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List files',
			paginatable: true
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a file upload',
			flags: [
				f('name', 'string', 'File name', true),
				f('mimeType', 'string', 'MIME type', true),
				f('size', 'number', 'File size in bytes', true),
				f(
					'checksumSha256Base64',
					'string',
					'SHA-256 checksum (base64)'
				),
				f('upload', 'string', 'Upload parameters')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'uploaded',
			description: 'Complete file upload',
			args: [{ name: 'id', description: 'File ID', required: true }]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a file',
			flags: [
				f('name', 'string', 'File name'),
				f('version', 'string', 'File version')
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete a file',
			confirmRequired: true
		}
	]
}

// ---------------------------------------------------------------------------
// 14. Refunds
// ---------------------------------------------------------------------------

const refunds: ResourceDef = {
	name: 'refund',
	plural: 'refunds',
	cliName: 'refunds',
	sdkNamespace: 'refunds',
	description: 'Manage refunds',
	defaultFields: ['id', 'status', 'reason', 'amount', 'currency', 'orderId'],
	examples: [
		'polar refunds list',
		'polar refunds list --order-id <id>',
		'polar refunds create --order-id <id> --amount 2999 --reason customer_request'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List refunds',
			paginatable: true,
			flags: [
				f('id', 'string[]', 'Filter by refund IDs'),
				f('orderId', 'string', 'Filter by order ID'),
				f('subscriptionId', 'string', 'Filter by subscription ID'),
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				f('succeeded', 'boolean', 'Filter by success status'),
				sortingFlag
			]
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a refund',
			flags: [
				f('orderId', 'string', 'Order ID', true),
				f('amount', 'number', 'Refund amount', true),
				f('reason', 'string', 'Refund reason', true),
				f('comment', 'string', 'Refund comment'),
				f('revokeBenefits', 'boolean', 'Revoke benefits on refund')
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 15. Disputes
// ---------------------------------------------------------------------------

const disputes: ResourceDef = {
	name: 'dispute',
	plural: 'disputes',
	cliName: 'disputes',
	sdkNamespace: 'disputes',
	description: 'View payment disputes',
	defaultFields: ['id', 'status', 'amount', 'currency', 'orderId'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List disputes',
			paginatable: true,
			flags: [
				f('orderId', 'string', 'Filter by order ID'),
				f('status', 'string', 'Filter by status'),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a dispute'
		}
	]
}

// ---------------------------------------------------------------------------
// 16. Payments
// ---------------------------------------------------------------------------

const payments: ResourceDef = {
	name: 'payment',
	plural: 'payments',
	cliName: 'payments',
	sdkNamespace: 'payments',
	description: 'View payment history',
	defaultFields: ['id', 'status', 'amount', 'currency', 'method'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List payments',
			paginatable: true,
			flags: [
				f('checkoutId', 'string', 'Filter by checkout ID'),
				f('orderId', 'string', 'Filter by order ID'),
				f('status', 'string', 'Filter by status'),
				f('method', 'string', 'Filter by payment method'),
				f('customerEmail', 'string', 'Filter by customer email'),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a payment'
		}
	]
}

// ---------------------------------------------------------------------------
// 17. Meters
// ---------------------------------------------------------------------------

const meters: ResourceDef = {
	name: 'meter',
	plural: 'meters',
	cliName: 'meters',
	sdkNamespace: 'meters',
	description: 'Manage usage meters',
	defaultFields: ['id', 'name', 'aggregation', 'createdAt'],
	examples: [
		'polar meters list',
		'polar meters create --name "API Calls" --filter \'{"name":"api_call"}\' --aggregation \'{"func":"count"}\'',
		'polar meters get <id>',
		'polar meters quantities <id>',
		'polar meters update <id> --name "API Requests"'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List meters',
			paginatable: true,
			flags: [
				f('query', 'string', 'Search query'),
				f('isArchived', 'boolean', 'Filter by archived status'),
				metadataFlag,
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a meter'
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a meter',
			flags: [
				f('name', 'string', 'Meter name', true),
				f('filter', 'json', 'Meter filter (JSON)', true),
				f('aggregation', 'json', 'Aggregation config (JSON)', true),
				metadataInputFlag
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a meter',
			flags: [f('name', 'string', 'Meter name'), metadataInputFlag]
		},
		{
			type: 'custom',
			sdkMethod: 'quantities',
			description: 'Get meter quantities',
			args: [{ name: 'id', description: 'Meter ID', required: true }],
			flags: [f('customerIds', 'string[]', 'Customer IDs to filter')]
		}
	]
}

// ---------------------------------------------------------------------------
// 18. Customer Meters
// ---------------------------------------------------------------------------

const customerMeters: ResourceDef = {
	name: 'customerMeter',
	plural: 'customerMeters',
	cliName: 'customer-meters',
	sdkNamespace: 'customerMeters',
	description: 'View customer meter usage',
	defaultFields: [
		'id',
		'meterId',
		'customerId',
		'consumedUnits',
		'creditedUnits',
		'balance'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List customer meters',
			paginatable: true,
			flags: [
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				f('meterId', 'string', 'Filter by meter ID'),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a customer meter'
		}
	]
}

// ---------------------------------------------------------------------------
// 19. Events
// ---------------------------------------------------------------------------

const events: ResourceDef = {
	name: 'event',
	plural: 'events',
	cliName: 'events',
	sdkNamespace: 'events',
	description: 'Manage and ingest custom events',
	defaultFields: ['id', 'name', 'source', 'customerId', 'timestamp'],
	examples: [
		'polar events list',
		'polar events list --name api_call --customer-id <id>',
		'polar events list --start-timestamp 2025-01-01T00:00:00Z',
		'polar events get <id>',
		'polar events list-names',
		'polar events ingest --events \'[{"name":"api_call","externalCustomerId":"user_123"}]\''
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List events',
			paginatable: true,
			flags: [
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				f('name', 'string', 'Filter by event name'),
				f('source', 'string', 'Filter by event source'),
				f('startTimestamp', 'string', 'Start timestamp (ISO 8601)'),
				f('endTimestamp', 'string', 'End timestamp (ISO 8601)'),
				f('meterId', 'string', 'Filter by meter ID'),
				f('filter', 'json', 'Filter conditions (JSON)'),
				f('query', 'string', 'Search query'),
				f('parentId', 'string', 'Filter by parent event ID'),
				f('depth', 'number', 'Event depth'),
				metadataFlag,
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get an event'
		},
		{
			type: 'custom',
			sdkMethod: 'listNames',
			description: 'List event names',
			flags: [f('query', 'string', 'Search query'), sortingFlag]
		},
		{
			type: 'custom',
			sdkMethod: 'ingest',
			description: 'Ingest events',
			flags: [f('events', 'json', 'Events to ingest (JSON array)', true)]
		}
	]
}

// ---------------------------------------------------------------------------
// 20. Event Types
// ---------------------------------------------------------------------------

const eventTypes: ResourceDef = {
	name: 'eventType',
	plural: 'eventTypes',
	cliName: 'event-types',
	sdkNamespace: 'eventTypes',
	description: 'Manage event type definitions',
	defaultFields: ['id', 'name', 'isArchived'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List event types',
			paginatable: true,
			flags: [f('query', 'string', 'Search query'), sortingFlag]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update an event type',
			flags: [f('isArchived', 'boolean', 'Archive the event type')]
		}
	]
}

// ---------------------------------------------------------------------------
// 21. Metrics
// ---------------------------------------------------------------------------

const metrics: ResourceDef = {
	name: 'metric',
	plural: 'metrics',
	cliName: 'metrics',
	sdkNamespace: 'metrics',
	description: 'Query analytics metrics',
	defaultFields: ['id', 'type', 'value'],
	examples: [
		'polar metrics get --start-date 2025-01-01 --end-date 2025-01-31 --interval month',
		'polar metrics get --start-date 2025-01-01 --end-date 2025-01-07 --interval day --product-id <id>',
		'polar metrics limits'
	],
	operations: [
		{
			type: 'custom',
			sdkMethod: 'get',
			description: 'Get metrics',
			flags: [
				f('startDate', 'string', 'Start date (ISO 8601)', true),
				f('endDate', 'string', 'End date (ISO 8601)', true),
				f('interval', 'string', 'Interval (day, week, month)', true),
				f('productId', 'string', 'Filter by product ID'),
				f('customerId', 'string', 'Filter by customer ID'),
				f('billingType', 'string', 'Filter by billing type'),
				f('timezone', 'string', 'Timezone'),
				f('metrics', 'string[]', 'Metrics to retrieve')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'limits',
			description: 'Get metrics limits'
		}
	]
}

// ---------------------------------------------------------------------------
// 22. Members
// ---------------------------------------------------------------------------

const members: ResourceDef = {
	name: 'member',
	plural: 'members',
	cliName: 'members',
	sdkNamespace: 'members',
	description: 'Manage organization members',
	defaultFields: ['id', 'email', 'name', 'role'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'listMembers',
			description: 'List members',
			paginatable: true,
			flags: [
				f('customerId', 'string', 'Filter by customer ID'),
				f(
					'externalCustomerId',
					'string',
					'Filter by external customer ID'
				),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'getMember',
			description: 'Get a member',
			idParam: 'id'
		},
		{
			type: 'create',
			sdkMethod: 'createMember',
			description: 'Create a member',
			flags: [
				f('email', 'string', 'Member email', true),
				f('role', 'string', 'Member role', true)
			]
		},
		{
			type: 'update',
			sdkMethod: 'updateMember',
			description: 'Update a member',
			flags: [f('role', 'string', 'Member role')]
		},
		{
			type: 'delete',
			sdkMethod: 'deleteMember',
			description: 'Delete a member',
			confirmRequired: true
		}
	]
}

// ---------------------------------------------------------------------------
// 23. Customer Seats
// ---------------------------------------------------------------------------

const customerSeats: ResourceDef = {
	name: 'customerSeat',
	plural: 'customerSeats',
	cliName: 'customer-seats',
	sdkNamespace: 'customerSeats',
	description: 'Manage subscription seats',
	defaultFields: ['id', 'status', 'email', 'customerId', 'subscriptionId'],
	operations: [
		{
			type: 'custom',
			sdkMethod: 'listSeats',
			description: 'List seats',
			args: [
				{
					name: 'subscriptionId',
					description: 'Subscription ID',
					required: true
				}
			]
		},
		{
			type: 'custom',
			sdkMethod: 'assignSeat',
			description: 'Assign seat',
			args: [
				{
					name: 'subscriptionId',
					description: 'Subscription ID',
					required: true
				}
			],
			flags: [f('email', 'string', 'Email to assign seat to', true)]
		},
		{
			type: 'custom',
			sdkMethod: 'revokeSeat',
			description: 'Revoke seat',
			args: [{ name: 'id', description: 'Seat ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'resendInvitation',
			description: 'Resend seat invitation',
			args: [{ name: 'id', description: 'Seat ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'getClaimInfo',
			description: 'Get seat claim info',
			args: [
				{ name: 'token', description: 'Claim token', required: true }
			]
		},
		{
			type: 'custom',
			sdkMethod: 'claimSeat',
			description: 'Claim seat',
			args: [
				{ name: 'token', description: 'Claim token', required: true }
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 24. Customer Sessions
// ---------------------------------------------------------------------------

const customerSessions: ResourceDef = {
	name: 'customerSession',
	plural: 'customerSessions',
	cliName: 'customer-sessions',
	sdkNamespace: 'customerSessions',
	description: 'Create customer portal sessions',
	defaultFields: ['id', 'token', 'expiresAt'],
	operations: [
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a customer session',
			flags: [f('customerId', 'string', 'Customer ID', true)]
		}
	]
}

// ---------------------------------------------------------------------------
// 25. Member Sessions
// ---------------------------------------------------------------------------

const memberSessions: ResourceDef = {
	name: 'memberSession',
	plural: 'memberSessions',
	cliName: 'member-sessions',
	sdkNamespace: 'memberSessions',
	description: 'Create member sessions',
	defaultFields: ['id', 'token', 'expiresAt'],
	operations: [
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create a member session',
			flags: [
				f('memberId', 'string', 'Member ID', true),
				f('customerId', 'string', 'Customer ID')
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 26. Webhooks
// ---------------------------------------------------------------------------

const webhooks: ResourceDef = {
	name: 'webhook',
	plural: 'webhooks',
	cliName: 'webhooks',
	sdkNamespace: 'webhooks',
	description: 'Manage webhook endpoints and deliveries',
	defaultFields: ['id', 'url', 'events', 'enabled'],
	examples: [
		'polar webhooks list',
		'polar webhooks create --url https://example.com/hook --events order.created,subscription.created',
		'polar webhooks get <id>',
		'polar webhooks update <id> --enabled false',
		'polar webhooks reset-webhook-endpoint-secret <id>',
		'polar webhooks list-webhook-deliveries --endpoint-id <id>',
		'polar webhooks delete <id> --yes'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'listWebhookEndpoints',
			description: 'List webhook endpoints',
			paginatable: true,
			flags: [sortingFlag]
		},
		{
			type: 'get',
			sdkMethod: 'getWebhookEndpoint',
			description: 'Get a webhook endpoint',
			idParam: 'id'
		},
		{
			type: 'create',
			sdkMethod: 'createWebhookEndpoint',
			description: 'Create a webhook endpoint',
			flags: [
				f('url', 'string', 'Webhook URL', true),
				f('events', 'string[]', 'Event types to subscribe to', true),
				f('format', 'string', 'Payload format'),
				f('secret', 'string', 'Webhook secret')
			]
		},
		{
			type: 'update',
			sdkMethod: 'updateWebhookEndpoint',
			description: 'Update a webhook endpoint',
			flags: [
				f('url', 'string', 'Webhook URL'),
				f('events', 'string[]', 'Event types to subscribe to'),
				f('format', 'string', 'Payload format'),
				f('enabled', 'boolean', 'Enable or disable webhook')
			]
		},
		{
			type: 'delete',
			sdkMethod: 'deleteWebhookEndpoint',
			description: 'Delete a webhook endpoint',
			confirmRequired: true
		},
		{
			type: 'custom',
			sdkMethod: 'resetWebhookEndpointSecret',
			description: 'Reset webhook secret',
			args: [
				{
					name: 'id',
					description: 'Webhook endpoint ID',
					required: true
				}
			]
		},
		{
			type: 'custom',
			sdkMethod: 'listWebhookDeliveries',
			description: 'List webhook deliveries',
			flags: [f('endpointId', 'string', 'Filter by endpoint ID')]
		},
		{
			type: 'custom',
			sdkMethod: 'redeliverWebhookEvent',
			description: 'Redeliver webhook event',
			args: [
				{ name: 'id', description: 'Webhook event ID', required: true }
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 27. OAuth2
// ---------------------------------------------------------------------------

const oauth2: ResourceDef = {
	name: 'oauth2',
	plural: 'oauth2',
	cliName: 'oauth2',
	sdkNamespace: 'oauth2',
	description: 'OAuth2 client management and token operations',
	defaultFields: ['id'],
	operations: [
		{
			type: 'custom',
			sdkMethod: 'authorize',
			description: 'Start OAuth2 authorization'
		},
		{
			type: 'custom',
			sdkMethod: 'token',
			description: 'Request OAuth2 token',
			flags: [
				f('grantType', 'string', 'Grant type', true),
				f('code', 'string', 'Authorization code'),
				f('redirectUri', 'string', 'Redirect URI'),
				f('codeVerifier', 'string', 'PKCE code verifier')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'revoke',
			description: 'Revoke token',
			flags: [
				f('token', 'string', 'Token to revoke', true),
				f('tokenTypeHint', 'string', 'Token type hint')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'introspect',
			description: 'Introspect token',
			flags: [
				f('token', 'string', 'Token to introspect', true),
				f('tokenTypeHint', 'string', 'Token type hint')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'userinfo',
			description: 'Get user info'
		}
	]
}

// ---------------------------------------------------------------------------
// 28. OAuth2 Clients
// ---------------------------------------------------------------------------

const oauth2Clients: ResourceDef = {
	name: 'oauth2Client',
	plural: 'oauth2Clients',
	cliName: 'oauth2-clients',
	sdkNamespace: 'oauth2',
	subNamespace: 'oauth2.clients',
	description: 'Manage OAuth2 clients',
	defaultFields: ['id', 'clientName', 'redirectUris'],
	operations: [
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create an OAuth2 client',
			flags: [
				f('redirectUris', 'string[]', 'Redirect URIs', true),
				f('clientName', 'string', 'Client name', true),
				f('grantTypes', 'string[]', 'Grant types'),
				f('scope', 'string', 'OAuth2 scope')
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get an OAuth2 client'
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update an OAuth2 client',
			flags: [
				f('clientName', 'string', 'Client name'),
				f('redirectUris', 'string[]', 'Redirect URIs')
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete an OAuth2 client',
			confirmRequired: true
		}
	]
}

// ---------------------------------------------------------------------------
// 29. Organization Access Tokens
// ---------------------------------------------------------------------------

const orgTokens: ResourceDef = {
	name: 'orgToken',
	plural: 'orgTokens',
	cliName: 'org-tokens',
	sdkNamespace: 'organizationAccessTokens',
	description: 'Manage organization access tokens',
	defaultFields: ['id', 'comment', 'scopes', 'expiresAt'],
	examples: [
		'polar org-tokens list',
		'polar org-tokens create --comment "CI/CD Token"',
		'polar org-tokens create --comment "Deploy" --scopes products:read,orders:read',
		'polar org-tokens delete <id> --yes'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List organization access tokens',
			paginatable: true,
			flags: [sortingFlag]
		},
		{
			type: 'create',
			sdkMethod: 'create',
			description: 'Create an organization access token',
			flags: [
				f('comment', 'string', 'Token comment/description', true),
				f('scopes', 'string[]', 'Token scopes'),
				f('expiresAt', 'string', 'Expiration date (ISO 8601)')
			]
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update an organization access token',
			flags: [
				f('comment', 'string', 'Token comment/description'),
				f('scopes', 'string[]', 'Token scopes')
			]
		},
		{
			type: 'delete',
			sdkMethod: 'delete',
			description: 'Delete an organization access token',
			confirmRequired: true
		}
	]
}

// ===========================================================================
// 30. Customer Portal Resources
// ===========================================================================

// ---------------------------------------------------------------------------
// 30a. Portal Benefit Grants
// ---------------------------------------------------------------------------

const portalBenefitGrants: ResourceDef = {
	name: 'portalBenefitGrant',
	plural: 'portalBenefitGrants',
	cliName: 'portal-benefit-grants',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.benefitGrants',
	description: 'Customer portal: benefit grants',
	defaultFields: ['id', 'benefitId', 'type', 'isGranted'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List benefit grants',
			paginatable: true,
			flags: [
				f('typeFilter', 'string', 'Filter by benefit type'),
				f('benefitId', 'string', 'Filter by benefit ID'),
				sortingFlag
			]
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a benefit grant'
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a benefit grant',
			flags: [f('properties', 'json', 'Grant properties (JSON)')]
		}
	]
}

// ---------------------------------------------------------------------------
// 30b. Portal Customer
// ---------------------------------------------------------------------------

const portalCustomer: ResourceDef = {
	name: 'portalCustomer',
	plural: 'portalCustomers',
	cliName: 'portal-customer',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.customers',
	description: 'Customer portal: customer profile',
	defaultFields: ['id', 'email', 'name'],
	operations: [
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get customer profile'
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update customer profile',
			flags: [
				f('name', 'string', 'Customer name'),
				f('email', 'string', 'Customer email'),
				f('billingAddress', 'json', 'Billing address (JSON)')
			]
		},
		{
			type: 'custom',
			sdkMethod: 'listPaymentMethods',
			description: 'List payment methods'
		},
		{
			type: 'custom',
			sdkMethod: 'addPaymentMethod',
			description: 'Add payment method'
		},
		{
			type: 'custom',
			sdkMethod: 'confirmPaymentMethod',
			description: 'Confirm payment method',
			args: [
				{ name: 'id', description: 'Payment method ID', required: true }
			]
		},
		{
			type: 'custom',
			sdkMethod: 'deletePaymentMethod',
			description: 'Delete payment method',
			args: [
				{ name: 'id', description: 'Payment method ID', required: true }
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 30c. Portal Subscriptions
// ---------------------------------------------------------------------------

const portalSubscriptions: ResourceDef = {
	name: 'portalSubscription',
	plural: 'portalSubscriptions',
	cliName: 'portal-subscriptions',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.subscriptions',
	description: 'Customer portal: subscriptions',
	defaultFields: ['id', 'status', 'product', 'currentPeriodEnd'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List subscriptions',
			paginatable: true
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a subscription'
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update a subscription'
		},
		{
			type: 'custom',
			sdkMethod: 'cancel',
			description: 'Cancel a subscription',
			args: [
				{ name: 'id', description: 'Subscription ID', required: true }
			]
		}
	]
}

// ---------------------------------------------------------------------------
// 30d. Portal Orders
// ---------------------------------------------------------------------------

const portalOrders: ResourceDef = {
	name: 'portalOrder',
	plural: 'portalOrders',
	cliName: 'portal-orders',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.orders',
	description: 'Customer portal: orders',
	defaultFields: [
		'id',
		'status',
		'product',
		'totalAmount',
		'currency',
		'createdAt'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List orders',
			paginatable: true
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get an order'
		},
		{
			type: 'update',
			sdkMethod: 'update',
			description: 'Update an order'
		},
		{
			type: 'custom',
			sdkMethod: 'invoice',
			description: 'Get order invoice',
			args: [{ name: 'id', description: 'Order ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'generateInvoice',
			description: 'Generate order invoice',
			args: [{ name: 'id', description: 'Order ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'getPaymentStatus',
			description: 'Get order payment status',
			args: [{ name: 'id', description: 'Order ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'confirmRetryPayment',
			description: 'Confirm retry payment',
			args: [{ name: 'id', description: 'Order ID', required: true }]
		}
	]
}

// ---------------------------------------------------------------------------
// 30e. Portal License Keys
// ---------------------------------------------------------------------------

const portalLicenseKeys: ResourceDef = {
	name: 'portalLicenseKey',
	plural: 'portalLicenseKeys',
	cliName: 'portal-license-keys',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.licenseKeys',
	description: 'Customer portal: license keys',
	defaultFields: ['id', 'displayKey', 'status', 'usage', 'limitActivations'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List license keys',
			paginatable: true
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a license key'
		},
		{
			type: 'custom',
			sdkMethod: 'validate',
			description: 'Validate a license key'
		},
		{
			type: 'custom',
			sdkMethod: 'activate',
			description: 'Activate a license key'
		},
		{
			type: 'custom',
			sdkMethod: 'deactivate',
			description: 'Deactivate a license key'
		}
	]
}

// ---------------------------------------------------------------------------
// 30f. Portal Downloadables
// ---------------------------------------------------------------------------

const portalDownloadables: ResourceDef = {
	name: 'portalDownloadable',
	plural: 'portalDownloadables',
	cliName: 'portal-downloadables',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.downloadables',
	description: 'Customer portal: downloadable files',
	defaultFields: ['id', 'name', 'benefitId'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List downloadable files',
			paginatable: true
		}
	]
}

// ---------------------------------------------------------------------------
// 30g. Portal Members
// ---------------------------------------------------------------------------

const portalMembers: ResourceDef = {
	name: 'portalMember',
	plural: 'portalMembers',
	cliName: 'portal-members',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.members',
	description: 'Customer portal: member management',
	defaultFields: ['id', 'email', 'name', 'role'],
	operations: [
		{
			type: 'custom',
			sdkMethod: 'listMembers',
			description: 'List members'
		},
		{
			type: 'custom',
			sdkMethod: 'addMember',
			description: 'Add a member'
		},
		{
			type: 'custom',
			sdkMethod: 'removeMember',
			description: 'Remove a member',
			args: [{ name: 'id', description: 'Member ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'updateMember',
			description: 'Update a member',
			args: [{ name: 'id', description: 'Member ID', required: true }]
		}
	]
}

// ---------------------------------------------------------------------------
// 30h. Portal Seats
// ---------------------------------------------------------------------------

const portalSeats: ResourceDef = {
	name: 'portalSeat',
	plural: 'portalSeats',
	cliName: 'portal-seats',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.seats',
	description: 'Customer portal: seat management',
	defaultFields: ['id', 'status', 'email', 'subscriptionId'],
	operations: [
		{
			type: 'custom',
			sdkMethod: 'listSeats',
			description: 'List seats'
		},
		{
			type: 'custom',
			sdkMethod: 'assignSeat',
			description: 'Assign a seat'
		},
		{
			type: 'custom',
			sdkMethod: 'revokeSeat',
			description: 'Revoke a seat',
			args: [{ name: 'id', description: 'Seat ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'resendInvitation',
			description: 'Resend seat invitation',
			args: [{ name: 'id', description: 'Seat ID', required: true }]
		},
		{
			type: 'custom',
			sdkMethod: 'listClaimedSubscriptions',
			description: 'List claimed subscriptions'
		}
	]
}

// ---------------------------------------------------------------------------
// 30i. Portal Meters
// ---------------------------------------------------------------------------

const portalMeters: ResourceDef = {
	name: 'portalMeter',
	plural: 'portalMeters',
	cliName: 'portal-meters',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.customerMeters',
	description: 'Customer portal: meter usage',
	defaultFields: [
		'id',
		'meterId',
		'consumedUnits',
		'creditedUnits',
		'balance'
	],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List customer meters',
			paginatable: true
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a customer meter'
		}
	]
}

// ---------------------------------------------------------------------------
// 30j. Portal Session
// ---------------------------------------------------------------------------

const portalSession: ResourceDef = {
	name: 'portalSession',
	plural: 'portalSessions',
	cliName: 'portal-session',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.customerSession',
	description: 'Customer portal: session introspection',
	defaultFields: ['id', 'token', 'expiresAt'],
	operations: [
		{
			type: 'custom',
			sdkMethod: 'introspect',
			description: 'Introspect customer session'
		},
		{
			type: 'custom',
			sdkMethod: 'getAuthenticatedUser',
			description: 'Get authenticated user'
		}
	]
}

// ---------------------------------------------------------------------------
// 30k. Portal Organization
// ---------------------------------------------------------------------------

const portalOrg: ResourceDef = {
	name: 'portalOrganization',
	plural: 'portalOrganizations',
	cliName: 'portal-org',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.organizations',
	description: 'Customer portal: organization info',
	defaultFields: ['id', 'name', 'slug'],
	operations: [
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get organization info'
		}
	]
}

// ---------------------------------------------------------------------------
// 30l. Portal Wallets
// ---------------------------------------------------------------------------

const portalWallets: ResourceDef = {
	name: 'portalWallet',
	plural: 'portalWallets',
	cliName: 'portal-wallets',
	sdkNamespace: 'customerPortal',
	subNamespace: 'customerPortal.wallets',
	description: 'Customer portal: wallets',
	defaultFields: ['id', 'balance', 'currency'],
	operations: [
		{
			type: 'list',
			sdkMethod: 'list',
			description: 'List wallets',
			paginatable: true
		},
		{
			type: 'get',
			sdkMethod: 'get',
			description: 'Get a wallet'
		}
	]
}

// ===========================================================================
// Resource Registry
// ===========================================================================

export const RESOURCES: ResourceDef[] = [
	// Core resources
	organizations,
	products,
	subscriptions,
	orders,
	customers,

	// Checkout
	checkouts,
	checkoutLinks,

	// Benefits
	benefits,
	benefitGrants,

	// License keys
	licenseKeys,

	// Pricing
	discounts,
	customFields,

	// Files
	files,

	// Financial
	refunds,
	disputes,
	payments,

	// Usage-based billing
	meters,
	customerMeters,

	// Events
	events,
	eventTypes,

	// Analytics
	metrics,

	// Organization management
	members,
	customerSeats,
	customerSessions,
	memberSessions,

	// Integrations
	webhooks,
	oauth2,
	oauth2Clients,
	orgTokens,

	// Customer portal
	portalBenefitGrants,
	portalCustomer,
	portalSubscriptions,
	portalOrders,
	portalLicenseKeys,
	portalDownloadables,
	portalMembers,
	portalSeats,
	portalMeters,
	portalSession,
	portalOrg,
	portalWallets
]

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

export function getResource(cliName: string): ResourceDef | undefined {
	return RESOURCES.find(r => r.cliName === cliName)
}
