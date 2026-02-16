# Polar CLI — Resource Reference

Complete list of resources and their operations. Use `polar <resource> --help` for flags and examples.

## Core

| Resource | Actions |
|----------|---------|
| `products` | list, get, create, update, update-benefits |
| `subscriptions` | list, get, create, update, revoke, export |
| `orders` | list, get, update, invoice, generate-invoice, export |
| `customers` | list, get, create, update, delete, get-external, update-external, delete-external, get-state, get-state-external, export |
| `checkouts` | list, get, create, update, client-get, client-update, client-confirm |
| `checkout-links` | list, get, create, update, delete |

## Monetization

| Resource | Actions |
|----------|---------|
| `benefits` | list, get, create, update, delete, grants |
| `benefit-grants` | list |
| `license-keys` | list, get, update, get-activation, validate, activate, deactivate |
| `discounts` | list, get, create, update, delete |
| `refunds` | list, create |
| `disputes` | list, get |
| `payments` | list, get |

## Usage-Based Billing

| Resource | Actions |
|----------|---------|
| `meters` | list, get, create, update, quantities |
| `customer-meters` | list, get |
| `events` | list, get, list-names, ingest |
| `event-types` | list, update |
| `metrics` | get, limits |

## Organization

| Resource | Actions |
|----------|---------|
| `orgs` | list, get, create, update |
| `members` | list, get, create, update, delete |
| `org-tokens` | list, create, update, delete |
| `webhooks` | list, get, create, update, delete, reset-webhook-endpoint-secret, list-webhook-deliveries, redeliver-webhook-event |
| `custom-fields` | list, get, create, update, delete |
| `files` | list, create, uploaded, update, delete |

## Identity

| Resource | Actions |
|----------|---------|
| `oauth2` | authorize, token, revoke, introspect, userinfo |
| `oauth2-clients` | get, create, update, delete |
| `customer-sessions` | create |
| `member-sessions` | create |
| `customer-seats` | list-seats, assign-seat, revoke-seat, resend-invitation, get-claim-info, claim-seat |

## Customer Portal

All under `polar portal <sub-resource>`:

| Sub-resource | Actions |
|--------------|---------|
| `benefit-grants` | list, get, update |
| `customer` | get, update, list-payment-methods, add-payment-method, confirm-payment-method, delete-payment-method |
| `subscriptions` | list, get, update, cancel |
| `orders` | list, get, update, invoice, generate-invoice, get-payment-status, confirm-retry-payment |
| `license-keys` | list, get, validate, activate, deactivate |
| `downloadables` | list |
| `members` | list-members, add-member, remove-member, update-member |
| `seats` | list-seats, assign-seat, revoke-seat, resend-invitation, list-claimed-subscriptions |
| `meters` | list, get |
| `session` | introspect, get-authenticated-user |
| `org` | get |
| `wallets` | list, get |
