/**
 * Field selection and default field registry.
 *
 * Each resource has a curated set of default fields shown in compact/table output.
 * Agents can override with --fields. See SPEC.md §4.5.
 */

export const RESOURCE_DEFAULT_FIELDS: Record<string, string[]> = {
	organization: ['id', 'name', 'slug', 'status'],
	product: ['id', 'name', 'isRecurring', 'isArchived', 'prices', 'benefits'],
	subscription: [
		'id',
		'status',
		'customer',
		'product',
		'currentPeriodEnd',
		'amount',
		'currency'
	],
	order: [
		'id',
		'status',
		'product',
		'customer',
		'totalAmount',
		'currency',
		'createdAt'
	],
	customer: ['id', 'email', 'name', 'type', 'createdAt'],
	checkout: ['id', 'status', 'products', 'totalAmount', 'currency', 'url'],
	checkoutLink: ['id', 'label', 'product', 'url', 'createdAt'],
	benefit: ['id', 'type', 'description', 'organizationId'],
	benefitGrant: ['id', 'benefitId', 'customerId', 'isGranted', 'isRevoked'],
	licenseKey: [
		'id',
		'displayKey',
		'status',
		'customer',
		'usage',
		'limitActivations'
	],
	discount: ['id', 'name', 'type', 'amount', 'duration', 'code'],
	customField: ['id', 'type', 'slug', 'name'],
	file: ['id', 'name', 'mimeType', 'size', 'createdAt'],
	refund: ['id', 'status', 'reason', 'amount', 'currency', 'orderId'],
	dispute: ['id', 'status', 'amount', 'currency', 'orderId'],
	payment: ['id', 'status', 'amount', 'currency', 'method'],
	meter: ['id', 'name', 'aggregation', 'createdAt'],
	customerMeter: [
		'id',
		'meterId',
		'customerId',
		'consumedUnits',
		'creditedUnits',
		'balance'
	],
	event: ['id', 'name', 'source', 'customerId', 'timestamp'],
	eventType: ['id', 'name', 'isArchived'],
	webhook: ['id', 'url', 'events', 'enabled'],
	member: ['id', 'email', 'name', 'role'],
	orgToken: ['id', 'comment', 'scopes', 'expiresAt']
}

export type FieldSelector = string[] | 'all' | 'minimal'

export function getDefaultFields(resource: string): string[] {
	return RESOURCE_DEFAULT_FIELDS[resource] ?? ['id']
}

export function selectFields(
	data: Record<string, unknown>,
	fields: FieldSelector
): Record<string, unknown> {
	if (fields === 'all') {
		return { ...data }
	}

	if (fields === 'minimal') {
		const result: Record<string, unknown> = { id: data.id }
		const identifiers = [
			'name',
			'email',
			'slug',
			'displayKey',
			'key',
			'url',
			'label'
		]
		for (const key of identifiers) {
			if (key in data && data[key] !== null && data[key] !== undefined) {
				result[key] = data[key]
				break
			}
		}
		return result
	}

	const result: Record<string, unknown> = {}
	for (const field of fields) {
		if (field in data) {
			result[field] = data[field]
		}
	}
	return result
}
