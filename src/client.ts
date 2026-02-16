/**
 * Polar SDK client factory.
 *
 * See SPEC.md §3.
 */

import { Polar } from '@polar-sh/sdk'

export interface ClientOptions {
	accessToken: string
	server: 'production' | 'sandbox'
}

export function createClient(options: ClientOptions): Polar {
	if (!options.accessToken) {
		throw new Error(
			"Access token is required. Run 'polar auth login' or set POLAR_ACCESS_TOKEN."
		)
	}

	return new Polar({
		accessToken: options.accessToken,
		server: options.server
	})
}
