# Polar CLI — Comprehensive Specification

## 1. Overview

**polar-cli** is a developer-friendly command-line interface for the [Polar](https://polar.sh) platform, built with Bun and the official `@polar-sh/sdk` TypeScript SDK. It provides complete feature parity with the Polar API, optimized for both human developers and AI agents.

### Design Principles

1. **Complete API Parity** — Every resource and operation available in `@polar-sh/sdk` is accessible via the CLI.
2. **Discoverability First** — Rich help menus, consistent command structure, and contextual descriptions make it easy to find what you need without docs.
3. **AI-Agent Optimized Output** — Default output is compact, structured, and context-window friendly. No raw JSON dumps. Every output mode is designed to minimize tokens while maximizing signal.
4. **Consistent Grammar** — Commands follow `polar <resource> <action> [args] [flags]` uniformly.
5. **Progressive Disclosure** — Simple commands stay simple; advanced options are available but not in the way.

---

## 2. Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Fast startup, native TS, built-in test runner |
| SDK | `@polar-sh/sdk` | Official Polar TypeScript SDK |
| CLI Framework | `commander` | Mature, composable, excellent help generation |
| Styling | `chalk` | Terminal colors for human-readable output |
| Config | `~/.polar/config.json` | Standard dotfile config |
| Auth storage | `~/.polar/credentials.json` | Separate from config for security |

---

## 3. Authentication & Configuration

### 3.1 Authentication Flow

```
polar auth login              # Interactive: prompts for access token
polar auth login --token <t>  # Non-interactive: set token directly
polar auth logout             # Remove stored credentials
polar auth status             # Show current auth state (org, user, token prefix)
```

**Storage**: `~/.polar/credentials.json`
```json
{
  "accessToken": "polar_pat_...",
  "server": "production"
}
```

### 3.2 Configuration

```
polar config set <key> <value>   # Set a config value
polar config get <key>           # Get a config value
polar config list                # List all config values
polar config reset               # Reset to defaults
```

**Config file**: `~/.polar/config.json`
```json
{
  "organizationId": "uuid",
  "server": "production",
  "output": "table",
  "defaultLimit": 25,
  "noColor": false
}
```

### 3.3 Environment Variable Overrides

| Variable | Purpose |
|----------|---------|
| `POLAR_ACCESS_TOKEN` | Access token (overrides stored credential) |
| `POLAR_ORGANIZATION_ID` | Default organization ID |
| `POLAR_SERVER` | `production` or `sandbox` |
| `POLAR_OUTPUT` | Default output format |
| `NO_COLOR` | Disable color output |

### 3.4 Server Selection

```
polar config set server sandbox    # Use sandbox environment
polar config set server production # Use production environment
```

Or per-command:
```
polar orgs list --server sandbox
```

---

## 4. Output System — AI-Agent Optimized

The output system is the **most critical design element** of this CLI. Every decision
is made through the lens of: "How does this look in an AI agent's context window?"

### 4.1 Core Problem Statement

AI agents interact with CLIs by reading stdout. Every byte of output consumes
context window tokens. The typical failure modes are:

1. **Token bloat** — dumping 500-line JSON responses with 40 null fields each
2. **Signal loss** — burying the 3 useful fields inside 30 irrelevant ones
3. **No pagination awareness** — returning 1000 results when the agent needed 5
4. **Unparseable decoration** — box-drawing characters, colors, spinners in piped output
5. **Missing context** — the agent doesn't know if there are more results, what page it's on, or what commands to run next

This CLI solves all of them.

### 4.2 Output Formats

| Flag | Format | Audience | Description |
|------|--------|----------|-------------|
| `--output table` | Aligned columns | Humans | Default when stdout is a TTY |
| `--output compact` | `key=value` one-liners | AI agents | **Default when piped / non-TTY** |
| `--output json` | Minified JSON | Programs | Full fidelity, single JSON object |
| `--output jsonl` | JSON Lines | Streaming | One JSON object per line, for streaming/piping |
| `--output csv` | CSV | Export | With header row |
| `--output tsv` | Tab-separated | Unix tools | For `cut`, `awk`, etc. |
| `--output id` | IDs only | Piping | One ID per line, nothing else |
| `--output count` | Integer | Agents | Just the total count, nothing else |

### 4.3 AI-Optimized Compact Format (Default for Non-TTY)

The `compact` format is the **primary AI-agent interface**. It is the default
whenever the CLI detects it's being piped or called by a non-TTY process.

#### Single entity (`get` commands):

```
product id=prod_123 name="Pro Plan" recurring=true interval=month status=active prices=[2000_USD/mo] benefits=3 org=my-org created=2024-01-15
```

#### List of entities (`list` commands):

```
products 1-3/142 page=1
  [1] id=prod_123 name="Pro Plan" recurring=true prices=[2000_USD/mo]
  [2] id=prod_456 name="Starter" recurring=true prices=[1000_USD/mo]
  [3] id=prod_789 name="Enterprise" one-time prices=[50000_USD]
next: polar products list --page 2 --limit 3
```

#### Design rules:

| Rule | Rationale |
|------|-----------|
| **Type prefix** on first line (`product`, `products`) | Agent instantly knows the resource type |
| **Pagination header** `1-3/142 page=1` | Agent knows position, total count, current page in one glance |
| **`next:` hint** on last line | Agent knows the exact command to get more — no guessing |
| **No null/empty/default fields** | Omitted entirely — zero wasted tokens |
| **Flatten nested objects** | `customer.email` not `{ customer: { email: ... } }` |
| **Summarize arrays** | `benefits=3` instead of listing all 3 benefit objects. Use `--expand` to inline |
| **Compress timestamps** | `2024-01-15T10:30:00.000Z` → `2024-01-15` |
| **Compress money** | `{ amount: 2000, currency: "usd", interval: "month" }` → `2000_USD/mo` |
| **Index markers** `[1]` `[2]` | Positional reference, no `/N` suffix (total is in the header already) |
| **Quoted strings only when they contain spaces** | `name=Pro` vs `name="Pro Plan"` — saves tokens |
| **No decorative characters** | No colors, no box-drawing, no spinner artifacts |

#### Empty results:

```
products 0/0
```

Two tokens. An agent instantly knows: zero results, zero total.

### 4.4 Relationship Handling — `--expand` vs References

This is critical for AI token budget. By default, related entities are shown as
**references** (just IDs or counts). The `--expand` flag inlines them.

**Default (references only):**
```
subscription id=sub_123 status=active customer=cust_456 product=prod_789 discount=none prices=1
```

**With `--expand customer,product`:**
```
subscription id=sub_123 status=active discount=none
  customer id=cust_456 email=alice@example.com name="Alice Smith"
  product id=prod_789 name="Pro Plan" recurring=true
```

**With `--expand all`:**
Expands every related entity. Use sparingly.

Rules:
- `--expand <relation1,relation2>` — expand specific relations
- `--expand all` — expand everything (use with caution)
- Default: references only (ID or count)
- In `json` / `jsonl` output, `--expand` controls whether nested objects are included or replaced with `{ "id": "..." }`

### 4.5 Field Selection — `--fields`

Every command supports `--fields` to control exactly which fields appear.

```bash
polar products list --fields id,name,prices
polar customers get cust_123 --fields email,name
```

Special field selectors:
- `--fields all` — show every field (escape hatch)
- `--fields minimal` — just `id` and `name`/`email`/primary identifier
- `--fields default` — the curated default set (this is what you get without `--fields`)

Each resource has a **curated default field set** (see Section 11) that shows the
most useful fields. This is NOT the full API response — it's a human/AI-curated
subset.

### 4.6 Summary vs Detail Views

For `get` commands on a single entity, two verbosity levels exist:

**Default (summary):** Shows the curated default fields.
```
polar products get prod_123
# → product id=prod_123 name="Pro Plan" recurring=true interval=month prices=[2000_USD/mo] benefits=3 archived=false
```

**Detail (`--detail`):** Shows all fields, fully expanded.
```
polar products get prod_123 --detail
# → product id=prod_123
#   name="Pro Plan"
#   description="Our professional plan with all features"
#   recurring=true
#   interval=month
#   intervalCount=1
#   isArchived=false
#   visibility=visible
#   organizationId=org_abc
#   createdAt=2024-01-15
#   modifiedAt=2024-06-20
#   metadata={"tier":"pro","version":"2"}
#   prices:
#     [1] id=price_001 type=fixed amount=2000 currency=USD interval=month
#   benefits:
#     [1] id=ben_001 type=license_keys description="License key access"
#     [2] id=ben_002 type=downloadables description="Source code download"
#     [3] id=ben_003 type=custom description="Priority support"
#   medias: 0
#   customFields: 0
```

The `--detail` flag gives a multi-line, indented, fully-expanded view.
This is what an agent uses when it needs to inspect a specific entity deeply.
The summary view is what it uses for "glancing" at something.

### 4.7 Count-Only Mode

For agents that just need to know "how many?" without fetching any records:

```bash
polar products list --output count
# → 142

polar subscriptions list --status active --output count
# → 87
```

This makes a single API call, reads the total from pagination metadata, and
prints one integer. Extremely token-efficient.

### 4.8 Schema Introspection

Agents often need to know "what fields can I use?" before building a command.
Instead of making them read help text, we provide a structured schema command:

```bash
polar products schema
# → product fields:
#   id           string   read-only  The product ID
#   name         string   required   Product name
#   description  string   optional   Product description (max 10000 chars)
#   isRecurring  boolean  read-only  Whether this is a recurring product
#   isArchived   boolean  optional   Archive status (default: false)
#   prices       Price[]  required   Price configurations
#   benefits     string[] optional   Benefit IDs to attach
#   medias       string[] optional   Media file IDs
#   metadata     object   optional   Key-value metadata
#   ...

polar products schema --action create
# → Only shows fields relevant to creation (excludes read-only)

polar products schema --action update
# → Only shows fields relevant to update (excludes read-only, marks mutable)

polar products schema --action list-filters
# → Shows available filter flags for the list command
#   --org            string    Filter by organization ID
#   --is-archived    boolean   Filter by archive status
#   --is-recurring   boolean   Filter by recurring status
#   --benefit-id     string    Filter by benefit ID
#   --sorting        enum      Sort: created_at, -created_at, name, -name
```

This costs zero API calls — it's built from SDK type information at compile time.

### 4.9 Pagination Controls

```bash
# Basic pagination
polar products list --limit 5              # Return at most 5 items
polar products list --limit 5 --page 3     # Page 3 of 5-item pages

# Fetch all (use with caution)
polar products list --all                  # Fetches every page, concatenates results

# First N (convenience shorthand — fetches only what's needed)
polar products list --first 3              # Equivalent to --limit 3 --page 1
```

**Pagination metadata** is always included in compact output:
```
products 1-5/142 page=1
  ...
next: polar products list --page 2 --limit 5
```

When there are no more pages:
```
products 6-7/7 page=2
  ...
```
(No `next:` line — agent knows it's done.)

**Default limit**: 10 for non-TTY (AI-friendly small pages), 25 for TTY.
Configurable via `polar config set defaultLimit <n>`.

### 4.10 Auto-Detection & Defaults

| Context | Output Format | Default Limit | Colors | Pagination Hints |
|---------|---------------|---------------|--------|------------------|
| TTY (interactive) | `table` | 25 | Yes | Human-friendly |
| Non-TTY (piped) | `compact` | 10 | No | Machine-friendly (`next:` command) |
| `POLAR_OUTPUT` set | Respected | Respected | Per format | Per format |

Detection logic:
1. If `--output` flag is set → use it
2. Else if `POLAR_OUTPUT` env var is set → use it
3. Else if `process.stdout.isTTY` → `table`
4. Else → `compact`

### 4.11 JSON Output Modes

For programmatic consumption, two JSON modes:

**`--output json`**: Single JSON object.
```json
{"items":[{"id":"prod_123","name":"Pro Plan"}],"pagination":{"page":1,"limit":10,"totalCount":142}}
```
Always minified (one line). Use `| jq .` if you need pretty-printing.

**`--output jsonl`**: JSON Lines (one object per line).
```
{"id":"prod_123","name":"Pro Plan","isRecurring":true}
{"id":"prod_456","name":"Starter","isRecurring":true}
```
Better for streaming, `jq` processing, and large result sets.

Both JSON modes respect `--fields` for field filtering and `--expand` for
relationship expansion.

---

## 5. Command Structure

### 5.1 Command Grammar

```
polar <resource> <action> [positional-args] [--flags]
```

- **Resources** are always plural nouns (e.g., `products`, `customers`, `orders`)
- **Actions** are verbs (e.g., `list`, `get`, `create`, `update`, `delete`)
- **Positional args** are typically IDs
- **Flags** are named parameters

### 5.2 Universal Flags

These flags are available on every command:

| Flag | Short | Description |
|------|-------|-------------|
| `--output <format>` | `-o` | Output format: table, compact, json, jsonl, csv, tsv, id, count |
| `--fields <list>` | `-f` | Comma-separated field list (`all`, `minimal`, or specific fields) |
| `--expand <rels>` | `-e` | Expand related entities (comma-separated, or `all`) |
| `--detail` | `-d` | Show all fields in multi-line detail view (single-entity commands) |
| `--help` | `-h` | Show help for this command |
| `--server <name>` | `-s` | Server: production or sandbox |
| `--org <id>` | | Organization ID override |
| `--no-color` | | Disable color |
| `--verbose` | | Show request/response debug details (stderr) |
| `--quiet` | `-q` | Suppress non-essential output (only data, no hints) |
| `--dry-run` | | Show what would happen without executing |
| `--yes` | `-y` | Skip confirmation prompts (for scripting) |

Flags specific to `list` commands:

| Flag | Short | Description |
|------|-------|-------------|
| `--limit <n>` | `-l` | Max items per page (default: 10 piped, 25 TTY) |
| `--page <n>` | `-p` | Page number |
| `--first <n>` | | Shorthand for `--limit N --page 1` |
| `--all` | | Fetch all pages (use with caution) |

### 5.3 Common Action Patterns

Every CRUD resource follows the same pattern:

```
polar <resource> list [--filters...] [--limit N] [--page N]
polar <resource> get <id>
polar <resource> create [--field value...]
polar <resource> update <id> [--field value...]
polar <resource> delete <id> [--yes]
```

---

## 6. Complete Command Reference

### 6.1 Auth & Config

```
polar auth login [--token <token>]
polar auth logout
polar auth status

polar config set <key> <value>
polar config get <key>
polar config list
polar config reset
```

---

### 6.2 Organizations

```
polar orgs list [--slug <slug>] [--sorting <field>]
polar orgs get <id>
polar orgs create --name <name> [--slug <slug>]
polar orgs update <id> [--name <name>] [--slug <slug>] [--avatar-url <url>]
```

**List filters**: `--slug <slug>`, `--sorting <field>`
**Sort values**: `created_at`, `-created_at`, `slug`, `-slug`, `name`, `-name`

---

### 6.3 Products

```
polar products list [--org <id>] [--id <id,...>] [--query <search>] [--is-archived] [--is-recurring] [--benefit-id <id>] [--visibility <vis>] [--metadata <json>] [--sorting <field>]
polar products get <id>
polar products create --name <name> [--description <desc>] [--prices <json>] [--recurring-interval <i>] [--recurring-interval-count <n>] [--trial-interval <i>] [--trial-interval-count <n>] [--visibility <vis>] [--medias <id,...>] [--attached-custom-fields <json>] [--metadata <json>] [--org <id>]
polar products update <id> [--name <name>] [--description <desc>] [--is-archived] [--prices <json>] [--recurring-interval <i>] [--recurring-interval-count <n>] [--trial-interval <i>] [--trial-interval-count <n>] [--visibility <vis>] [--medias <id,...>] [--attached-custom-fields <json>] [--metadata <json>]
polar products update-benefits <id> --benefits <id1,id2,...>
```

**List filters**: `--org`, `--id` (multi), `--query`, `--is-archived`, `--is-recurring`, `--benefit-id`, `--visibility`, `--metadata`, `--sorting`
**Sort values**: `created_at`, `-created_at`, `name`, `-name`, `price_amount`, `-price_amount`, `price_amount_type`, `-price_amount_type`
**Visibility values**: `public`, `hidden`
**Recurring interval values**: `day`, `week`, `month`, `year`
**Trial interval values**: `day`, `week`, `month`, `year`

---

### 6.4 Subscriptions

```
polar subscriptions list [--org <id>] [--product-id <id>] [--customer-id <id>] [--external-customer-id <id>] [--active <bool>] [--cancel-at-period-end <bool>] [--discount-id <id>] [--metadata <json>] [--sorting <field>]
polar subscriptions get <id>
polar subscriptions create --customer-id <id> --product-id <id> [--external-customer-id <id>] [--metadata <json>]
polar subscriptions update <id> [--product-id <id>] [--proration-behavior <invoice|prorate>] [--cancel-at-period-end] [--discount-id <id>] [--seats <n>] [--metadata <json>]
polar subscriptions revoke <id>
polar subscriptions export [--org <id>]
```

**List filters**: `--org`, `--product-id`, `--customer-id`, `--external-customer-id`, `--active` (boolean), `--cancel-at-period-end` (boolean), `--discount-id`, `--metadata`, `--sorting`
**Sort values**: `customer`, `-customer`, `status`, `-status`, `started_at`, `-started_at`, `current_period_end`, `-current_period_end`, `ended_at`, `-ended_at`, `ends_at`, `-ends_at`, `amount`, `-amount`, `product`, `-product`, `discount`, `-discount`

> Note: The SDK does NOT have a `status` enum filter. Use `--active true` for active subscriptions, `--active false` for inactive. Use `--cancel-at-period-end true` for subscriptions set to cancel.

---

### 6.5 Orders

```
polar orders list [--org <id>] [--product-id <id>] [--product-billing-type <recurring|one_time>] [--customer-id <id>] [--external-customer-id <id>] [--discount-id <id>] [--checkout-id <id>] [--metadata <json>] [--sorting <field>]
polar orders get <id>
polar orders update <id> [--billing-name <name>] [--billing-address <json>]
polar orders invoice <id>
polar orders generate-invoice <id>
polar orders export [--org <id>]
```

**List filters**: `--org`, `--product-id`, `--product-billing-type`, `--customer-id`, `--external-customer-id`, `--discount-id`, `--checkout-id`, `--metadata`, `--sorting`
**Sort values**: `created_at`, `-created_at`, `status`, `-status`, `invoice_number`, `-invoice_number`, `amount`, `-amount`, `net_amount`, `-net_amount`, `customer`, `-customer`, `product`, `-product`, `discount`, `-discount`, `subscription`, `-subscription`
**Order status values** (read-only): `pending`, `paid`, `refunded`, `partially_refunded`

---

### 6.6 Customers

```
polar customers list [--org <id>] [--email <email>] [--query <search>] [--metadata <json>] [--sorting <field>]
polar customers get <id>
polar customers get-external <external-id>
polar customers create --email <email> [--name <name>] [--type <individual|team>] [--external-id <ext-id>] [--billing-address <json>] [--tax-id <json>] [--locale <locale>] [--metadata <json>] [--org <id>]
polar customers update <id> [--email <email>] [--name <name>] [--type <individual|team>] [--external-id <ext-id>] [--billing-address <json>] [--tax-id <json>] [--locale <locale>] [--metadata <json>]
polar customers update-external <external-id> [--email <email>] [--name <name>] [--billing-address <json>] [--tax-id <json>] [--locale <locale>] [--metadata <json>]
polar customers delete <id> [--yes]
polar customers delete-external <external-id> [--yes]
polar customers state <id>
polar customers state-external <external-id>
polar customers export [--org <id>]
```

**List filters**: `--org`, `--email`, `--query`, `--metadata`, `--sorting`
**Sort values**: `created_at`, `-created_at`, `email`, `-email`, `name`, `-name`
**Customer type values**: `individual`, `team`

---

### 6.7 Checkouts

```
polar checkouts list [--org <id>] [--product-id <id>] [--customer-id <id>] [--external-customer-id <id>] [--status <status>] [--query <search>] [--sorting <field>]
polar checkouts get <id>
polar checkouts create --products <id,...> [--customer-id <id>] [--external-customer-id <id>] [--customer-email <email>] [--customer-name <name>] [--customer-billing-name <name>] [--customer-billing-address <json>] [--customer-tax-id <json>] [--customer-ip-address <ip>] [--customer-metadata <json>] [--is-business-customer] [--discount-id <id>] [--allow-discount-codes] [--require-billing-address] [--amount <cents>] [--seats <n>] [--currency <code>] [--success-url <url>] [--return-url <url>] [--embed-origin <url>] [--allow-trial] [--trial-interval <i>] [--trial-interval-count <n>] [--subscription-id <id>] [--custom-field-data <json>] [--locale <locale>] [--prices <json>] [--metadata <json>]
polar checkouts update <id> [--customer-email <email>] [--customer-name <name>] [--customer-billing-name <name>] [--customer-billing-address <json>] [--customer-tax-id <json>] [--discount-id <id>] [--allow-discount-codes] [--amount <cents>] [--seats <n>] [--custom-field-data <json>] [--metadata <json>]
polar checkouts client-get <client-secret>
polar checkouts client-update <client-secret> [--customer-email <email>] [--customer-name <name>] [--customer-billing-name <name>] [--customer-billing-address <json>] [--customer-tax-id <json>] [--discount-id <id>] [--amount <cents>] [--custom-field-data <json>]
polar checkouts client-confirm <client-secret>
```

**List filters**: `--org`, `--product-id`, `--customer-id`, `--external-customer-id`, `--status`, `--query`, `--sorting`
**Sort values**: `created_at`, `-created_at`, `expires_at`, `-expires_at`, `status`, `-status`
**Checkout status values**: `open`, `expired`, `confirmed`, `succeeded`, `failed`

> Note: `--products` accepts a comma-separated list of product IDs. The SDK requires `products: string[]`, not a single product ID.

---

### 6.8 Checkout Links

```
polar checkout-links list [--org <id>] [--product-id <id>] [--sorting <field>]
polar checkout-links get <id>
polar checkout-links create --product-id <id> [--success-url <url>] [--label <label>] [--allow-discount-codes] [--discount-id <id>] [--metadata <json>]
polar checkout-links update <id> [--label <label>] [--success-url <url>] [--allow-discount-codes] [--discount-id <id>] [--metadata <json>]
polar checkout-links delete <id> [--yes]
```

**Sort values**: `created_at`, `-created_at`, `label`, `-label`, `success_url`, `-success_url`, `allow_discount_codes`, `-allow_discount_codes`

---

### 6.9 Benefits

```
polar benefits list [--org <id>] [--id <id,...>] [--exclude-id <id,...>] [--type <type>] [--query <search>] [--metadata <json>] [--sorting <field>]
polar benefits get <id>
polar benefits create --type <type> --description <desc> [--properties <json>] [--org <id>] [--metadata <json>]
polar benefits update <id> [--description <desc>] [--properties <json>] [--metadata <json>]
polar benefits delete <id> [--yes]
polar benefits grants <id> [--customer-id <cid>] [--member-id <mid>] [--is-granted] [--is-revoked]
```

**List filters**: `--org`, `--id` (multi), `--exclude-id` (multi), `--type`, `--query`, `--metadata`, `--sorting`
**Benefit types**: `custom`, `discord`, `github_repository`, `downloadables`, `license_keys`, `meter_credit`
**Sort values**: `created_at`, `-created_at`, `description`, `-description`, `type`, `-type`, `user_order`, `-user_order`

---

### 6.10 Benefit Grants

```
polar benefit-grants list [--org <id>] [--customer-id <id>] [--external-customer-id <id>] [--is-granted] [--is-revoked] [--sorting <field>]
```

**List filters**: `--org`, `--customer-id`, `--external-customer-id`, `--is-granted`, `--is-revoked`, `--sorting`
**Sort values**: `created_at`, `-created_at`, `granted_at`, `-granted_at`, `revoked_at`, `-revoked_at`

> Note: To filter grants by benefit, use `polar benefits grants <benefit-id>` instead.

---

### 6.11 License Keys

```
polar license-keys list [--org <id>] [--benefit-id <id>] [--sorting <field>]
polar license-keys get <id>
polar license-keys update <id> [--status <status>] [--limit-activations <n>] [--limit-usage <n>] [--expires-at <date>]
polar license-keys get-activation <id> --activation-id <aid>
polar license-keys validate --key <key> --org-id <org-id> [--activation-id <aid>] [--benefit-id <bid>] [--customer-id <cid>] [--increment-usage <n>] [--conditions <json>]
polar license-keys activate --key <key> --org-id <org-id> --label <label> [--conditions <json>] [--meta <json>]
polar license-keys deactivate --key <key> --org-id <org-id> --activation-id <aid>
```

**License key status values**: `granted`, `revoked`, `disabled`

---

### 6.12 Discounts

```
polar discounts list [--org <id>] [--query <search>] [--sorting <field>]
polar discounts get <id>
polar discounts create --name <name> --type <percentage|fixed> --amount <n> --duration <once|forever|repeating> [--duration-months <n>] [--currency <code>] [--code <code>] [--starts-at <date>] [--ends-at <date>] [--max-redemptions <n>] [--product-ids <ids>] [--metadata <json>] [--org <id>]
polar discounts update <id> [--name <name>] [--code <code>] [--starts-at <date>] [--ends-at <date>] [--max-redemptions <n>] [--product-ids <ids>] [--metadata <json>]
polar discounts delete <id> [--yes]
```

**Discount types**: `percentage`, `fixed`
**Duration values**: `once`, `forever`, `repeating` (note: NOT `repeat`)
**Sort values**: `created_at`, `-created_at`, `name`, `-name`, `code`, `-code`, `redemptions_count`, `-redemptions_count`

---

### 6.13 Custom Fields

```
polar custom-fields list [--org <id>] [--query <search>] [--sorting <field>]
polar custom-fields get <id>
polar custom-fields create --type <text|number|date|checkbox|select> --slug <slug> --name <name> [--properties <json>] [--org <id>]
polar custom-fields update <id> [--name <name>] [--properties <json>]
polar custom-fields delete <id> [--yes]
```

**Custom field types**: `text`, `number`, `date`, `checkbox`, `select`
**Sort values**: `created_at`, `-created_at`, `slug`, `-slug`, `name`, `-name`, `type`, `-type`

---

### 6.14 Files

```
polar files list [--org <id>]
polar files create --name <name> --mime-type <type> --size <bytes> [--upload <path>] [--checksum-sha256-base64 <hash>] [--org <id>]
polar files uploaded <id>
polar files update <id> [--name <name>] [--version <v>]
polar files delete <id> [--yes]
```

---

### 6.15 Refunds

```
polar refunds list [--org <id>] [--id <id,...>] [--order-id <id>] [--subscription-id <id>] [--customer-id <id>] [--external-customer-id <id>] [--succeeded <bool>] [--sorting <field>]
polar refunds create --order-id <id> --amount <cents> --reason <reason> [--comment <text>] [--revoke-benefits]
```

**Refund reasons**: `duplicate`, `fraudulent`, `customer_request`, `service_disruption`, `satisfaction_guarantee`, `dispute_prevention`, `other`
**Refund status values** (read-only): `pending`, `succeeded`, `failed`, `canceled`
**Sort values**: `created_at`, `-created_at`, `amount`, `-amount`

---

### 6.16 Disputes

```
polar disputes list [--org <id>] [--order-id <id>] [--status <status>] [--sorting <field>]
polar disputes get <id>
```

**Dispute status values**: `prevented`, `early_warning`, `needs_response`, `under_review`, `lost`, `won`
**Sort values**: `created_at`, `-created_at`, `amount`, `-amount`

---

### 6.17 Payments

```
polar payments list [--org <id>] [--checkout-id <id>] [--order-id <id>] [--status <status>] [--method <method>] [--customer-email <email>] [--sorting <field>]
polar payments get <id>
```

**Payment status values**: `pending`, `succeeded`, `failed`
**Sort values**: `created_at`, `-created_at`, `status`, `-status`, `amount`, `-amount`, `method`, `-method`

> Note: The SDK does NOT have `customerId` on payments. Use `--customer-email` instead.

---

### 6.18 Meters

```
polar meters list [--org <id>] [--query <search>] [--is-archived <bool>] [--metadata <json>] [--sorting <field>]
polar meters get <id>
polar meters create --name <name> --filter <json> --aggregation <json> [--metadata <json>] [--org <id>]
polar meters update <id> [--name <name>] [--metadata <json>]
polar meters quantities <id> [--customer-ids <ids>]
```

**Sort values**: `created_at`, `-created_at`, `name`, `-name`

---

### 6.19 Customer Meters

```
polar customer-meters list [--org <id>] [--customer-id <id>] [--external-customer-id <id>] [--meter-id <id>] [--sorting <field>]
polar customer-meters get <id>
```

**Sort values**: `created_at`, `-created_at`, `modified_at`, `-modified_at`, `customer_id`, `-customer_id`, `customer_name`, `-customer_name`, `meter_id`, `-meter_id`, `meter_name`, `-meter_name`, `consumed_units`, `-consumed_units`, `credited_units`, `-credited_units`, `balance`, `-balance`

---

### 6.20 Events

```
polar events list [--org <id>] [--customer-id <id>] [--external-customer-id <id>] [--name <name>] [--source <user|system>] [--start-timestamp <ts>] [--end-timestamp <ts>] [--meter-id <id>] [--filter <json>] [--query <search>] [--parent-id <id>] [--depth <n>] [--metadata <json>] [--sorting <field>]
polar events get <id>
polar events list-names [--org <id>] [--query <search>] [--sorting <field>]
polar events ingest --events <json>
```

**Event source values**: `user`, `system`
**Event sort values**: `timestamp`, `-timestamp`
**Event names sort values**: `name`, `-name`, `occurrences`, `-occurrences`, `first_seen`, `-first_seen`, `last_seen`, `-last_seen`

---

### 6.21 Event Types

```
polar event-types list [--org <id>] [--query <search>] [--sorting <field>]
polar event-types update <id> [--is-archived]
```

**Sort values**: `name`, `-name`, `label`, `-label`, `occurrences`, `-occurrences`, `first_seen`, `-first_seen`, `last_seen`, `-last_seen`

---

### 6.22 Metrics

```
polar metrics get --start-date <date> --end-date <date> --interval <interval> [--org <id>] [--product-id <id>] [--customer-id <id>] [--billing-type <recurring|one_time>] [--timezone <tz>] [--metrics <metric,...>]
polar metrics limits
```

**Interval values**: `hour`, `day`, `week`, `month`, `year`

**Metric types** (complete list — 40+):
- Revenue: `revenue`, `net_revenue`, `cumulative_revenue`, `net_cumulative_revenue`
- Costs: `costs`, `cumulative_costs`
- Orders: `orders`, `average_order_value`, `net_average_order_value`
- One-time: `one_time_products`, `one_time_products_revenue`, `one_time_products_net_revenue`
- New subs: `new_subscriptions`, `new_subscriptions_revenue`, `new_subscriptions_net_revenue`
- Renewed subs: `renewed_subscriptions`, `renewed_subscriptions_revenue`, `renewed_subscriptions_net_revenue`
- Active subs: `active_subscriptions`, `committed_subscriptions`
- MRR: `monthly_recurring_revenue`, `committed_monthly_recurring_revenue`
- Checkouts: `checkouts`, `succeeded_checkouts`, `checkouts_conversion`
- Per-user: `average_revenue_per_user`, `cost_per_user`, `active_user_by_event`
- Churn: `canceled_subscriptions`, `churned_subscriptions`, `churn_rate`
- Cancellation reasons: `canceled_subscriptions_customer_service`, `canceled_subscriptions_low_quality`, `canceled_subscriptions_missing_features`, `canceled_subscriptions_switched_service`, `canceled_subscriptions_too_complex`, `canceled_subscriptions_too_expensive`, `canceled_subscriptions_unused`, `canceled_subscriptions_other`
- Financial: `ltv`, `gross_margin`, `gross_margin_percentage`, `cashflow`

---

### 6.23 Members

```
polar members list [--org <id>] [--customer-id <id>] [--external-customer-id <id>] [--sorting <field>]
polar members get <id>
polar members create --email <email> --role <role> [--org <id>]
polar members update <id> [--role <role>]
polar members delete <id> [--yes]
```

**Role values**: `owner`, `billing_manager`, `member`
**Sort values**: `created_at`, `-created_at`

---

### 6.24 Customer Seats

```
polar customer-seats list <subscription-id>
polar customer-seats assign <subscription-id> --email <email>
polar customer-seats revoke <id>
polar customer-seats resend-invitation <id>
polar customer-seats claim-info <token>
polar customer-seats claim <token>
```

---

### 6.25 Customer Sessions

```
polar customer-sessions create --customer-id <id>
```

---

### 6.26 Member Sessions

```
polar member-sessions create --member-id <id> [--customer-id <id>]
```

---

### 6.27 Webhooks

```
polar webhooks list [--org <id>]
polar webhooks get <id>
polar webhooks create --url <url> --events <event1,event2,...> [--format <raw|discord|slack>] [--secret <secret>] [--org <id>]
polar webhooks update <id> [--url <url>] [--events <events>] [--format <raw|discord|slack>] [--enabled]
polar webhooks delete <id> [--yes]
polar webhooks reset-secret <id>
polar webhooks deliveries [--endpoint-id <id>]
polar webhooks redeliver <delivery-id>
```

**Webhook format values**: `raw`, `discord`, `slack` (note: NOT `standard`)

**Webhook event types** (34 total):
- Checkout: `checkout.created`, `checkout.updated`, `checkout.expired`
- Customer: `customer.created`, `customer.updated`, `customer.deleted`, `customer.state_changed`
- Customer seat: `customer_seat.assigned`, `customer_seat.claimed`, `customer_seat.revoked`
- Member: `member.created`, `member.updated`, `member.deleted`
- Order: `order.created`, `order.updated`, `order.paid`, `order.refunded`
- Subscription: `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked`, `subscription.past_due`
- Product: `product.created`, `product.updated`
- Organization: `organization.updated`
- Benefit: `benefit.created`, `benefit.updated`
- Benefit grant: `benefit_grant.created`, `benefit_grant.updated`, `benefit_grant.cycled`, `benefit_grant.revoked`
- Refund: `refund.created`, `refund.updated`

---

### 6.28 OAuth2

```
polar oauth2 authorize
polar oauth2 token --grant-type <type> --code <code> [--redirect-uri <uri>] [--code-verifier <v>]
polar oauth2 revoke --token <token> [--token-type-hint <hint>]
polar oauth2 introspect --token <token> [--token-type-hint <hint>]
polar oauth2 userinfo

polar oauth2 clients create --redirect-uris <uris> --client-name <name> [--grant-types <types>] [--scope <scope>]
polar oauth2 clients get <id>
polar oauth2 clients update <id> [--client-name <name>] [--redirect-uris <uris>]
polar oauth2 clients delete <id> [--yes]
```

---

### 6.29 Organization Access Tokens

```
polar org-tokens list [--org <id>] [--sorting <field>]
polar org-tokens create --comment <comment> [--scopes <scopes>] [--expires-at <date>] [--org <id>]
polar org-tokens update <id> [--comment <comment>] [--scopes <scopes>]
polar org-tokens delete <id> [--yes]
```

**Sort values**: `created_at`, `-created_at`, `comment`, `-comment`, `last_used_at`, `-last_used_at`

**Available scopes**: `openid`, `profile`, `email`, `user:read`, `user:write`, `organizations:read`, `organizations:write`, `products:read`, `products:write`, `benefits:read`, `benefits:write`, `files:read`, `files:write`, `subscriptions:read`, `subscriptions:write`, `orders:read`, `orders:write`, `metrics:read`, `webhooks:read`, `webhooks:write`, `external_organizations:read`, `license_keys:read`, `license_keys:write`, `repositories:read`, `repositories:write`, `customer_sessions:write`, `customers:read`, `customers:write`, `discounts:read`, `discounts:write`, `checkout_links:read`, `checkout_links:write`, `checkouts:read`, `checkouts:write`, `custom_fields:read`, `custom_fields:write`, `organization_access_tokens:read`, `organization_access_tokens:write`

---

### 6.30 Customer Portal (Subcommand Group)

All customer portal commands are nested under `polar portal`:

```
# Benefit Grants
polar portal benefit-grants list [--type <type>] [--benefit-id <id>]
polar portal benefit-grants get <id>
polar portal benefit-grants update <id> [--properties <json>]

# Customer Profile
polar portal customer get
polar portal customer update [--name <name>] [--email <email>] [--billing-address <json>]
polar portal customer payment-methods [--list | --add | --delete <id> | --confirm-method <id>]

# Subscriptions
polar portal subscriptions list [--product-id <id>] [--status <status>]
polar portal subscriptions get <id>
polar portal subscriptions cancel <id>
polar portal subscriptions update <id> [--product-id <id>]

# Orders
polar portal orders list [--product-id <id>] [--status <status>]
polar portal orders get <id>
polar portal orders update <id> [--billing-name <name>]
polar portal orders invoice <id>
polar portal orders generate-invoice <id>
polar portal orders payment-status <id>
polar portal orders retry-payment <id>

# License Keys
polar portal license-keys list [--benefit-id <id>]
polar portal license-keys get <id>
polar portal license-keys validate --key <key> --org-id <org-id>
polar portal license-keys activate --key <key> --org-id <org-id> --label <label>
polar portal license-keys deactivate --key <key> --org-id <org-id> --activation-id <aid>

# Downloadables
polar portal downloadables list [--benefit-id <id>]

# Members
polar portal members list
polar portal members add --email <email>
polar portal members remove <id>
polar portal members update <id> [--role <role>]

# Seats
polar portal seats list [--subscription-id <id>]
polar portal seats assign [--subscription-id <id>] --email <email>
polar portal seats revoke <id>
polar portal seats resend <id>
polar portal seats claimed-subscriptions

# Meters
polar portal meters list
polar portal meters get <id>

# Session
polar portal session introspect
polar portal session user

# Organization
polar portal org get --slug <slug>

# Wallets
polar portal wallets list
polar portal wallets get <id>
```

---

## 7. Help System Design

### 7.1 Root Help

```
$ polar --help

Polar CLI - Manage your Polar resources from the command line

VERSION
  polar-cli/0.1.0

USAGE
  $ polar <command> [options]

CORE COMMANDS
  products          Manage products (list, create, update, archive)
  subscriptions     Manage subscriptions (list, get, create, revoke)
  orders            Manage orders (list, get, invoices, export)
  customers         Manage customers (list, create, update, delete)
  checkouts         Manage checkout sessions
  checkout-links    Manage reusable checkout links

MONETIZATION
  benefits          Manage benefits (custom, Discord, GitHub, downloads, license keys)
  benefit-grants    View benefit grant history
  license-keys      Manage and validate license keys
  discounts         Manage discount codes and promotions
  meters            Manage usage meters
  customer-meters   View customer meter usage
  refunds           Manage refunds
  disputes          View payment disputes
  payments          View payment history

USAGE & EVENTS
  events            Manage and ingest custom events
  event-types       Manage event type definitions
  metrics           Query analytics metrics

ORGANIZATION
  orgs              Manage organizations
  members           Manage organization members
  org-tokens        Manage organization access tokens
  webhooks          Manage webhook endpoints and deliveries
  custom-fields     Manage custom checkout/order fields
  files             Manage file uploads

IDENTITY & AUTH
  auth              Authenticate with Polar
  oauth2            OAuth2 client management and token operations
  customer-sessions Create customer portal sessions
  member-sessions   Create member sessions
  customer-seats    Manage subscription seats

CUSTOMER PORTAL
  portal            Customer portal operations (subscriptions, orders, benefits)

CONFIGURATION
  config            CLI configuration management

OUTPUT FLAGS
  -o, --output <format>   Output format: table|compact|json|jsonl|csv|tsv|id|count
  -f, --fields <list>     Field selection: field1,field2 | all | minimal
  -e, --expand <rels>     Expand relations: relation1,relation2 | all
  -d, --detail            Full detail view (single-entity commands)
  -q, --quiet             Data only, no hints or pagination info

GLOBAL FLAGS
  -s, --server <name>     Server: production|sandbox
  -h, --help              Show help
  --verbose               Debug output to stderr
  --no-color              Disable color
  --yes, -y               Skip confirmation prompts

LIST FLAGS
  -l, --limit <n>         Items per page (default: 10 piped, 25 TTY)
  -p, --page <n>          Page number
  --first <n>             Shorthand for --limit N --page 1
  --all                   Fetch all pages

EXAMPLES
  $ polar products list --first 5
  $ polar customers get cust_abc123 --detail
  $ polar subscriptions list --status active -o count
  $ polar products schema --action create
  $ polar metrics get --start-date 2024-01-01 --end-date 2024-12-31 --interval month
```

### 7.2 Resource Help

```
$ polar products --help

Manage Polar products

USAGE
  $ polar products <action> [options]

ACTIONS
  list                  List products with optional filters
  get <id>              Get a product by ID
  create                Create a new product
  update <id>           Update a product
  update-benefits <id>  Update the benefits attached to a product
  schema                Show product fields, types, and filter options

DEFAULT FIELDS (compact/table)
  id, name, isRecurring, isArchived, prices (summary)

EXAMPLES
  $ polar products list --first 5
  $ polar products get prod_abc123
  $ polar products get prod_abc123 --detail --expand benefits
  $ polar products create --name "Pro Plan" --recurring-interval month
  $ polar products schema --action create
```

### 7.3 Action Help

```
$ polar products create --help

Create a new Polar product

USAGE
  $ polar products create [options]

REQUIRED FLAGS
  --name <name>             Product name

OPTIONAL FLAGS
  --description <text>      Product description
  --recurring-interval <i>  Billing interval: month | year
  --prices <json>           Price configuration (JSON)
  --benefits <id,...>        Benefit IDs to attach
  --medias <id,...>          Media file IDs to attach
  --metadata <json>         Metadata key-value pairs
  --org <id>                Organization ID

EXAMPLES
  $ polar products create --name "Pro Plan" --recurring-interval month --prices '[{"amount": 2000, "currency": "usd"}]'
  $ polar products create --name "E-book" --prices '[{"amount": 1500, "currency": "usd"}]'
```

---

## 8. Error Handling

### 8.1 Error Output — Structured for Agents

Errors are always written to **stderr** (never stdout — so piped output stays clean).
Errors follow a structured, parseable format:

**For TTY (human-friendly):**
```
Error: Resource not found (404)
  Resource: product
  ID: prod_nonexistent
  Hint: Use 'polar products list' to see available products.
```

**For non-TTY / piped (agent-friendly):**
```
error code=404 type=ResourceNotFound resource=product id=prod_nonexistent hint="polar products list"
```

The agent-friendly error format is a single line with `key=value` pairs, matching
the compact output format. An agent can parse the error type, code, and get an
actionable hint without any ambiguity.

**Validation errors (agent-friendly):**
```
error code=422 type=ValidationError fields="name: required; recurring_interval: must be month|year" hint="polar products create --help"
```

**Auth errors (agent-friendly):**
```
error code=401 type=Unauthorized hint="polar auth login"
```

### 8.2 Error Mapping

| SDK Error | CLI `type` | `code` | Agent `hint` |
|-----------|-----------|--------|--------------|
| `Unauthorized` | `Unauthorized` | 401 | `polar auth login` |
| `NotPermitted` | `NotPermitted` | 403 | — |
| `ResourceNotFound` | `ResourceNotFound` | 404 | `polar <resource> list` |
| `HTTPValidationError` | `ValidationError` | 422 | `polar <resource> <action> --help` |
| `ConnectionError` | `ConnectionError` | — | "Check network connection" |
| `SubscriptionLocked` | `SubscriptionLocked` | 409 | "Retry after pending update completes" |
| `ExpiredCheckoutError` | `CheckoutExpired` | 410 | `polar checkouts create` |
| `AlreadyCanceledSubscription` | `AlreadyCanceled` | 403 | — |
| `RefundedAlready` | `AlreadyRefunded` | 403 | — |
| `PaymentError` | `PaymentError` | 400 | — |
| `CustomerNotReady` | `CustomerNotReady` | 400 | — |
| `MissingInvoiceBillingDetails` | `MissingBillingDetails` | 422 | "Update billing details first" |

### 8.3 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | API/runtime error (auth, network, server errors) |
| 2 | Invalid usage (bad args, missing required flags, unknown command) |

### 8.4 `--quiet` Error Behavior

With `--quiet`, only the error `type` and `code` are printed:
```
error code=404 type=ResourceNotFound
```

Useful for agents that just need to check success/failure and error type.

---

## 9. AI Agent Integration Patterns

This section documents the specific design patterns that make this CLI optimal
for AI agent consumption. These patterns should inform every implementation decision.

### 9.1 Context Window Budget Awareness

An AI agent calling this CLI has a finite context window. Every token matters.
The CLI is designed around the principle: **minimum tokens, maximum signal.**

| Scenario | Bad (typical CLI) | Good (polar-cli) |
|----------|-------------------|-------------------|
| "How many customers?" | Dumps 25 full customer objects (5000+ tokens) | `polar customers list -o count` → `142` (1 token) |
| "Find customer by email" | Returns full JSON blob | `polar customers list --email alice@x.com --fields id,email,name` → 1 line |
| "Get product details" | 80-field JSON response | Default compact shows 8 key fields; use `--detail` only when needed |
| "List active subs" | Full subscription objects with nested customer, product, prices | Flat references: `customer=cust_123 product=prod_456 prices=1` |
| "What can I filter by?" | Agent must read docs or guess | `polar products schema --action list-filters` → structured list |

### 9.2 The Three-Query Pattern

AI agents typically interact with resources in 3 steps. The CLI is optimized
for each step:

**Step 1: Discover** — "What's there?"
```bash
polar products list --first 5
# → Compact list with pagination header showing total count
# → Agent now knows there are N products and has IDs for the first 5
```

**Step 2: Inspect** — "Tell me about this one"
```bash
polar products get prod_123
# → Compact single-line summary of key fields
# → If agent needs more: polar products get prod_123 --detail
```

**Step 3: Act** — "Change something"
```bash
polar products update prod_123 --name "New Name"
# → Returns the updated entity in compact format (confirmation of what changed)
```

### 9.3 Mutate Commands Return Results

Every `create`, `update`, and `delete` command writes the resulting entity to
stdout in the current output format. This means:

```bash
polar products create --name "Pro" --prices '[...]'
# stdout: product id=prod_NEW name="Pro" ...
```

The agent gets the created entity's ID without needing a follow-up `list` or `get`.
For `delete`, the output confirms what was deleted:
```bash
polar customers delete cust_123 --yes
# stdout: deleted customer id=cust_123 email=alice@x.com
```

### 9.4 Piping & Composition

```bash
# Get all active subscription IDs and pipe to another command
polar subscriptions list --status active -o id | xargs -I {} polar subscriptions get {}

# Export customers to CSV
polar customers list --all -o csv > customers.csv

# Chain: get a customer's active subscriptions
polar subscriptions list --customer-id $(polar customers get-external ext_123 -o id)

# Count active subscriptions without fetching data
polar subscriptions list --status active -o count

# Get the first 3 products, expand their benefits
polar products list --first 3 --expand benefits
```

### 9.5 JSON Input for Complex Objects

For flags that accept complex objects (metadata, prices, filters, etc.), the CLI accepts:
1. **Inline JSON**: `--metadata '{"key": "value"}'`
2. **File reference**: `--metadata @metadata.json`
3. **Stdin**: `echo '{"key":"value"}' | polar products create --name "Test" --metadata -`

### 9.6 Confirmation Prompts & Non-Interactive Mode

Destructive actions require confirmation in TTY mode:
```
$ polar customers delete cust_abc123
Are you sure you want to delete customer cust_abc123? This cannot be undone. [y/N]
```

**In non-TTY mode (piped / agent):** Destructive actions **fail** with a clear error
unless `--yes` is passed. This prevents agents from accidentally deleting things
while giving them a clear path to do so intentionally:
```bash
# This fails in non-TTY:
polar customers delete cust_abc123
# → error type=ConfirmationRequired hint="Add --yes to confirm destructive action"

# This succeeds:
polar customers delete cust_abc123 --yes
# → deleted customer id=cust_abc123 email=alice@x.com
```

### 9.7 Dry Run

```bash
polar products create --name "Test" --dry-run
# → Would create product:
#     name: Test
#     organization: my-org (org_abc123)
#     No prices configured
```

Dry run writes to stderr (not stdout), so piped output stays empty on dry run.

### 9.8 Schema Introspection for Agents

Agents can discover the CLI's structure programmatically:

```bash
# What resources exist?
polar --help
# → Categorized list of all resource commands with one-line descriptions

# What actions does a resource support?
polar products --help
# → List of actions with descriptions

# What fields does this resource have?
polar products schema
# → Structured field list with types and descriptions

# What can I filter on?
polar products schema --action list-filters
# → Available filter flags with types and allowed values

# What fields are required for creation?
polar products schema --action create
# → Only create-relevant fields, marking required vs optional

# What's the compact format default fields?
polar products schema --action default-fields
# → The field names shown by default in compact/table output
```

### 9.9 Stderr vs Stdout Discipline

| Content | Destination | Rationale |
|---------|-------------|-----------|
| Data (entities, lists, counts) | **stdout** | This is what gets piped |
| Pagination hints (`next: ...`) | **stdout** | Part of the data contract |
| Errors | **stderr** | Never pollutes piped data |
| Warnings | **stderr** | Never pollutes piped data |
| Progress/spinners | **stderr** | Never pollutes piped data |
| Dry-run output | **stderr** | No actual data to pipe |
| Verbose/debug info | **stderr** | Only with `--verbose` |
| Confirmation prompts | **stderr** | Only in TTY mode |

This is critical: an agent capturing stdout will only ever see clean data output.

### 9.10 Idempotent & Safe by Default

- `list` and `get` commands are always safe (no side effects)
- `create` returns the created entity (agent gets the ID immediately)
- `update` returns the updated entity (agent can verify the change)
- `delete` requires `--yes` in non-TTY (agents can't accidentally delete)
- `--dry-run` available on every mutating command

---

## 10. Project Structure

```
polar-cli/
├── src/
│   ├── index.ts                 # Entry point, CLI bootstrap
│   ├── cli.ts                   # Commander program setup, global flags
│   ├── client.ts                # Polar SDK client factory
│   ├── auth.ts                  # Auth management (token storage, retrieval)
│   ├── config.ts                # Config file management
│   ├── output/
│   │   ├── index.ts             # Output dispatcher (auto-detect, format routing)
│   │   ├── table.ts             # Table formatter (TTY default)
│   │   ├── compact.ts           # AI-optimized compact formatter (non-TTY default)
│   │   ├── json.ts              # JSON + JSON Lines formatter
│   │   ├── csv.ts               # CSV / TSV formatter
│   │   ├── id.ts                # ID-only formatter
│   │   ├── count.ts             # Count-only formatter
│   │   ├── detail.ts            # Multi-line detail view formatter
│   │   ├── fields.ts            # Field selection & default field registry
│   │   └── relationships.ts     # Expand/reference logic for related entities
│   ├── commands/
│   │   ├── auth.ts              # polar auth *
│   │   ├── config.ts            # polar config *
│   │   ├── organizations.ts     # polar orgs *
│   │   ├── products.ts          # polar products *
│   │   ├── subscriptions.ts     # polar subscriptions *
│   │   ├── orders.ts            # polar orders *
│   │   ├── customers.ts         # polar customers *
│   │   ├── checkouts.ts         # polar checkouts *
│   │   ├── checkout-links.ts    # polar checkout-links *
│   │   ├── benefits.ts          # polar benefits *
│   │   ├── benefit-grants.ts    # polar benefit-grants *
│   │   ├── license-keys.ts      # polar license-keys *
│   │   ├── discounts.ts         # polar discounts *
│   │   ├── custom-fields.ts     # polar custom-fields *
│   │   ├── files.ts             # polar files *
│   │   ├── refunds.ts           # polar refunds *
│   │   ├── disputes.ts          # polar disputes *
│   │   ├── payments.ts          # polar payments *
│   │   ├── meters.ts            # polar meters *
│   │   ├── customer-meters.ts   # polar customer-meters *
│   │   ├── events.ts            # polar events *
│   │   ├── event-types.ts       # polar event-types *
│   │   ├── metrics.ts           # polar metrics *
│   │   ├── members.ts           # polar members *
│   │   ├── customer-seats.ts    # polar customer-seats *
│   │   ├── customer-sessions.ts # polar customer-sessions *
│   │   ├── member-sessions.ts   # polar member-sessions *
│   │   ├── webhooks.ts          # polar webhooks *
│   │   ├── oauth2.ts            # polar oauth2 *
│   │   ├── org-tokens.ts        # polar org-tokens *
│   │   └── portal/              # polar portal * (customer portal)
│   │       ├── index.ts         # Portal subcommand group
│   │       ├── benefit-grants.ts
│   │       ├── customer.ts
│   │       ├── subscriptions.ts
│   │       ├── orders.ts
│   │       ├── license-keys.ts
│   │       ├── downloadables.ts
│   │       ├── members.ts
│   │       ├── seats.ts
│   │       ├── meters.ts
│   │       ├── session.ts
│   │       ├── org.ts
│   │       └── wallets.ts
│   ├── schemas/
│   │   └── registry.ts           # Resource schema definitions (fields, types, filters)
│   └── utils/
│       ├── pagination.ts        # Pagination helpers (page iterator, metadata)
│       ├── errors.ts            # Error formatting (structured for TTY/non-TTY)
│       ├── prompts.ts           # Confirmation prompts (with non-TTY safety)
│       ├── json-input.ts        # JSON flag parsing (inline, @file, stdin)
│       └── formatters.ts        # Value formatting (dates, money, truncation)
├── bin/
│   └── polar.ts                 # Shebang entry: #!/usr/bin/env bun
├── package.json
├── tsconfig.json
├── SPEC.md
└── README.md
```

---

## 11. Resource Field Defaults

Each resource has a default set of fields shown in `table` and `compact` output:

| Resource | Default Fields |
|----------|---------------|
| Organization | `id`, `name`, `slug`, `status` |
| Product | `id`, `name`, `isRecurring`, `isArchived`, `prices` (summary) |
| Subscription | `id`, `status`, `customer.email`, `product.name`, `currentPeriodEnd`, `amount`, `currency` |
| Order | `id`, `status`, `product.name`, `customer.email`, `totalAmount`, `currency`, `createdAt` |
| Customer | `id`, `email`, `name`, `type`, `createdAt` |
| Checkout | `id`, `status`, `product.name`, `totalAmount`, `currency`, `url` |
| Checkout Link | `id`, `product.name`, `url`, `createdAt` |
| Benefit | `id`, `type`, `description`, `organizationId` |
| Benefit Grant | `id`, `benefitId`, `customerId`, `isGranted`, `isRevoked` |
| License Key | `id`, `displayKey`, `status`, `customer.email`, `activations`/`limitActivations` |
| Discount | `id`, `name`, `type`, `amount`, `duration`, `code` |
| Custom Field | `id`, `type`, `slug`, `name` |
| File | `id`, `name`, `mimeType`, `size`, `createdAt` |
| Refund | `id`, `status`, `reason`, `amount`, `currency`, `orderId` |
| Dispute | `id`, `status`, `amount`, `currency`, `orderId` |
| Payment | `id`, `status`, `amount`, `currency`, `customerId` |
| Meter | `id`, `name`, `aggregation` (summary) |
| Customer Meter | `id`, `meterId`, `customerId`, `value` |
| Event | `id`, `name`, `source`, `customerId`, `createdAt` |
| Event Type | `id`, `name`, `isArchived` |
| Webhook | `id`, `url`, `events` (count), `enabled` |
| Member | `id`, `email`, `name`, `role` |
| Org Token | `id`, `comment`, `scopes` (summary), `expiresAt` |
| Metric | `type`, `value`, `previousValue`, `changePercent` |

---

## 12. Implementation Priorities

### Phase 1 — Foundation
1. Project scaffolding, CLI bootstrap, global flags
2. Auth system (login, logout, status)
3. Config system (set, get, list)
4. Output system (all formatters)
5. Error handling framework
6. SDK client factory with auth/config integration

### Phase 2 — Core Resources
7. Organizations (CRUD)
8. Products (CRUD + update-benefits)
9. Customers (full CRUD + external ID + state + export)
10. Subscriptions (CRUD + revoke + export)
11. Orders (list, get, update, invoice, export)
12. Checkouts (CRUD + client operations)
13. Checkout Links (CRUD)

### Phase 3 — Monetization
14. Benefits (CRUD + grants)
15. Benefit Grants (list)
16. License Keys (CRUD + validate + activate/deactivate)
17. Discounts (CRUD)
18. Refunds (list + create)
19. Disputes (list + get)
20. Payments (list + get)

### Phase 4 — Usage & Analytics
21. Meters (CRUD + quantities)
22. Customer Meters (list + get)
23. Events (list + get + ingest + list-names)
24. Event Types (list + update)
25. Metrics (get + limits)

### Phase 5 — Organization Management
26. Members (CRUD)
27. Webhooks (full management + deliveries)
28. Custom Fields (CRUD)
29. Files (CRUD)
30. Organization Access Tokens (CRUD)

### Phase 6 — Identity & Sessions
31. OAuth2 (authorize, token, revoke, introspect, userinfo, clients)
32. Customer Sessions (create)
33. Member Sessions (create)
34. Customer Seats (list, assign, revoke, claim)

### Phase 7 — Customer Portal
35. Portal benefit grants
36. Portal customer profile + payment methods
37. Portal subscriptions
38. Portal orders + invoices
39. Portal license keys
40. Portal downloadables
41. Portal members
42. Portal seats
43. Portal meters
44. Portal session + org
45. Portal wallets

---

## 13. Testing Strategy

```
tests/
├── unit/
│   ├── output/           # Formatter unit tests
│   ├── utils/            # Utility function tests
│   └── config/           # Config management tests
├── integration/
│   ├── commands/          # Command integration tests (with mocked SDK)
│   └── auth/              # Auth flow tests
└── e2e/
    └── sandbox/           # End-to-end tests against sandbox API
```

- **Unit tests**: `bun test` — formatters, config, utilities
- **Integration tests**: Mock the Polar SDK client, test command logic
- **E2E tests**: Run against `sandbox` server with test credentials

---

## 14. Distribution

### npm / bun global install
```json
{
  "name": "polar-cli",
  "bin": {
    "polar": "./bin/polar.ts"
  }
}
```

```bash
# Install globally
bun install -g polar-cli

# Or run directly
bunx polar-cli products list
```

### Binary compilation (future)
```bash
bun build ./bin/polar.ts --compile --outfile polar
```

---

## 15. SDK Method ↔ CLI Command Mapping

This is the complete mapping ensuring feature parity:

| SDK Namespace | SDK Method | CLI Command |
|---------------|-----------|-------------|
| `organizations` | `list` | `polar orgs list` |
| `organizations` | `create` | `polar orgs create` |
| `organizations` | `get` | `polar orgs get <id>` |
| `organizations` | `update` | `polar orgs update <id>` |
| `products` | `list` | `polar products list` |
| `products` | `create` | `polar products create` |
| `products` | `get` | `polar products get <id>` |
| `products` | `update` | `polar products update <id>` |
| `products` | `updateBenefits` | `polar products update-benefits <id>` |
| `subscriptions` | `list` | `polar subscriptions list` |
| `subscriptions` | `create` | `polar subscriptions create` |
| `subscriptions` | `get` | `polar subscriptions get <id>` |
| `subscriptions` | `update` | `polar subscriptions update <id>` |
| `subscriptions` | `revoke` | `polar subscriptions revoke <id>` |
| `subscriptions` | `export` | `polar subscriptions export` |
| `orders` | `list` | `polar orders list` |
| `orders` | `get` | `polar orders get <id>` |
| `orders` | `update` | `polar orders update <id>` |
| `orders` | `invoice` | `polar orders invoice <id>` |
| `orders` | `generateInvoice` | `polar orders generate-invoice <id>` |
| `orders` | `export` | `polar orders export` |
| `customers` | `list` | `polar customers list` |
| `customers` | `create` | `polar customers create` |
| `customers` | `get` | `polar customers get <id>` |
| `customers` | `delete` | `polar customers delete <id>` |
| `customers` | `update` | `polar customers update <id>` |
| `customers` | `getExternal` | `polar customers get-external <ext-id>` |
| `customers` | `deleteExternal` | `polar customers delete-external <ext-id>` |
| `customers` | `updateExternal` | `polar customers update-external <ext-id>` |
| `customers` | `getState` | `polar customers state <id>` |
| `customers` | `getStateExternal` | `polar customers state-external <ext-id>` |
| `customers` | `export` | `polar customers export` |
| `checkouts` | `list` | `polar checkouts list` |
| `checkouts` | `create` | `polar checkouts create` |
| `checkouts` | `get` | `polar checkouts get <id>` |
| `checkouts` | `update` | `polar checkouts update <id>` |
| `checkouts` | `clientGet` | `polar checkouts client-get <secret>` |
| `checkouts` | `clientUpdate` | `polar checkouts client-update <secret>` |
| `checkouts` | `clientConfirm` | `polar checkouts client-confirm <secret>` |
| `checkoutLinks` | `list` | `polar checkout-links list` |
| `checkoutLinks` | `create` | `polar checkout-links create` |
| `checkoutLinks` | `get` | `polar checkout-links get <id>` |
| `checkoutLinks` | `delete` | `polar checkout-links delete <id>` |
| `checkoutLinks` | `update` | `polar checkout-links update <id>` |
| `benefits` | `list` | `polar benefits list` |
| `benefits` | `create` | `polar benefits create` |
| `benefits` | `get` | `polar benefits get <id>` |
| `benefits` | `delete` | `polar benefits delete <id>` |
| `benefits` | `update` | `polar benefits update <id>` |
| `benefits` | `grants` | `polar benefits grants <id>` |
| `benefitGrants` | `list` | `polar benefit-grants list` |
| `licenseKeys` | `list` | `polar license-keys list` |
| `licenseKeys` | `get` | `polar license-keys get <id>` |
| `licenseKeys` | `update` | `polar license-keys update <id>` |
| `licenseKeys` | `getActivation` | `polar license-keys get-activation <id>` |
| `licenseKeys` | `validate` | `polar license-keys validate` |
| `licenseKeys` | `activate` | `polar license-keys activate` |
| `licenseKeys` | `deactivate` | `polar license-keys deactivate` |
| `discounts` | `list` | `polar discounts list` |
| `discounts` | `create` | `polar discounts create` |
| `discounts` | `get` | `polar discounts get <id>` |
| `discounts` | `delete` | `polar discounts delete <id>` |
| `discounts` | `update` | `polar discounts update <id>` |
| `customFields` | `list` | `polar custom-fields list` |
| `customFields` | `create` | `polar custom-fields create` |
| `customFields` | `get` | `polar custom-fields get <id>` |
| `customFields` | `delete` | `polar custom-fields delete <id>` |
| `customFields` | `update` | `polar custom-fields update <id>` |
| `files` | `list` | `polar files list` |
| `files` | `create` | `polar files create` |
| `files` | `uploaded` | `polar files uploaded <id>` |
| `files` | `delete` | `polar files delete <id>` |
| `files` | `update` | `polar files update <id>` |
| `refunds` | `list` | `polar refunds list` |
| `refunds` | `create` | `polar refunds create` |
| `disputes` | `list` | `polar disputes list` |
| `disputes` | `get` | `polar disputes get <id>` |
| `payments` | `list` | `polar payments list` |
| `payments` | `get` | `polar payments get <id>` |
| `meters` | `list` | `polar meters list` |
| `meters` | `create` | `polar meters create` |
| `meters` | `get` | `polar meters get <id>` |
| `meters` | `update` | `polar meters update <id>` |
| `meters` | `quantities` | `polar meters quantities <id>` |
| `customerMeters` | `list` | `polar customer-meters list` |
| `customerMeters` | `get` | `polar customer-meters get <id>` |
| `events` | `list` | `polar events list` |
| `events` | `get` | `polar events get <id>` |
| `events` | `listNames` | `polar events list-names` |
| `events` | `ingest` | `polar events ingest` |
| `eventTypes` | `list` | `polar event-types list` |
| `eventTypes` | `update` | `polar event-types update <id>` |
| `metrics` | `get` | `polar metrics get` |
| `metrics` | `limits` | `polar metrics limits` |
| `members` | `listMembers` | `polar members list` |
| `members` | `createMember` | `polar members create` |
| `members` | `getMember` | `polar members get <id>` |
| `members` | `deleteMember` | `polar members delete <id>` |
| `members` | `updateMember` | `polar members update <id>` |
| `customerSeats` | `listSeats` | `polar customer-seats list <sub-id>` |
| `customerSeats` | `assignSeat` | `polar customer-seats assign <sub-id>` |
| `customerSeats` | `revokeSeat` | `polar customer-seats revoke <id>` |
| `customerSeats` | `resendInvitation` | `polar customer-seats resend-invitation <id>` |
| `customerSeats` | `getClaimInfo` | `polar customer-seats claim-info <token>` |
| `customerSeats` | `claimSeat` | `polar customer-seats claim <token>` |
| `customerSessions` | `create` | `polar customer-sessions create` |
| `memberSessions` | `create` | `polar member-sessions create` |
| `webhooks` | `listWebhookEndpoints` | `polar webhooks list` |
| `webhooks` | `createWebhookEndpoint` | `polar webhooks create` |
| `webhooks` | `getWebhookEndpoint` | `polar webhooks get <id>` |
| `webhooks` | `deleteWebhookEndpoint` | `polar webhooks delete <id>` |
| `webhooks` | `updateWebhookEndpoint` | `polar webhooks update <id>` |
| `webhooks` | `resetWebhookEndpointSecret` | `polar webhooks reset-secret <id>` |
| `webhooks` | `listWebhookDeliveries` | `polar webhooks deliveries` |
| `webhooks` | `redeliverWebhookEvent` | `polar webhooks redeliver <id>` |
| `oauth2` | `authorize` | `polar oauth2 authorize` |
| `oauth2` | `token` | `polar oauth2 token` |
| `oauth2` | `revoke` | `polar oauth2 revoke` |
| `oauth2` | `introspect` | `polar oauth2 introspect` |
| `oauth2` | `userinfo` | `polar oauth2 userinfo` |
| `oauth2.clients` | `create` | `polar oauth2 clients create` |
| `oauth2.clients` | `get` | `polar oauth2 clients get <id>` |
| `oauth2.clients` | `update` | `polar oauth2 clients update <id>` |
| `oauth2.clients` | `delete` | `polar oauth2 clients delete <id>` |
| `organizationAccessTokens` | `list` | `polar org-tokens list` |
| `organizationAccessTokens` | `create` | `polar org-tokens create` |
| `organizationAccessTokens` | `delete` | `polar org-tokens delete <id>` |
| `organizationAccessTokens` | `update` | `polar org-tokens update <id>` |
| `customerPortal.benefitGrants` | `list` | `polar portal benefit-grants list` |
| `customerPortal.benefitGrants` | `get` | `polar portal benefit-grants get <id>` |
| `customerPortal.benefitGrants` | `update` | `polar portal benefit-grants update <id>` |
| `customerPortal.customers` | `get` | `polar portal customer get` |
| `customerPortal.customers` | `update` | `polar portal customer update` |
| `customerPortal.customers` | `listPaymentMethods` | `polar portal customer payment-methods` |
| `customerPortal.customers` | `addPaymentMethod` | `polar portal customer add-payment-method` |
| `customerPortal.customers` | `confirmPaymentMethod` | `polar portal customer confirm-payment-method <id>` |
| `customerPortal.customers` | `deletePaymentMethod` | `polar portal customer delete-payment-method <id>` |
| `customerPortal.customerMeters` | `list` | `polar portal meters list` |
| `customerPortal.customerMeters` | `get` | `polar portal meters get <id>` |
| `customerPortal.customerSession` | `introspect` | `polar portal session introspect` |
| `customerPortal.customerSession` | `getAuthenticatedUser` | `polar portal session user` |
| `customerPortal.downloadables` | `list` | `polar portal downloadables list` |
| `customerPortal.licenseKeys` | `list` | `polar portal license-keys list` |
| `customerPortal.licenseKeys` | `get` | `polar portal license-keys get <id>` |
| `customerPortal.licenseKeys` | `validate` | `polar portal license-keys validate` |
| `customerPortal.licenseKeys` | `activate` | `polar portal license-keys activate` |
| `customerPortal.licenseKeys` | `deactivate` | `polar portal license-keys deactivate` |
| `customerPortal.members` | `listMembers` | `polar portal members list` |
| `customerPortal.members` | `addMember` | `polar portal members add` |
| `customerPortal.members` | `removeMember` | `polar portal members remove <id>` |
| `customerPortal.members` | `updateMember` | `polar portal members update <id>` |
| `customerPortal.orders` | `list` | `polar portal orders list` |
| `customerPortal.orders` | `get` | `polar portal orders get <id>` |
| `customerPortal.orders` | `update` | `polar portal orders update <id>` |
| `customerPortal.orders` | `invoice` | `polar portal orders invoice <id>` |
| `customerPortal.orders` | `generateInvoice` | `polar portal orders generate-invoice <id>` |
| `customerPortal.orders` | `getPaymentStatus` | `polar portal orders payment-status <id>` |
| `customerPortal.orders` | `confirmRetryPayment` | `polar portal orders retry-payment <id>` |
| `customerPortal.organizations` | `get` | `polar portal org get` |
| `customerPortal.seats` | `listSeats` | `polar portal seats list` |
| `customerPortal.seats` | `assignSeat` | `polar portal seats assign` |
| `customerPortal.seats` | `revokeSeat` | `polar portal seats revoke <id>` |
| `customerPortal.seats` | `resendInvitation` | `polar portal seats resend <id>` |
| `customerPortal.seats` | `listClaimedSubscriptions` | `polar portal seats claimed-subscriptions` |
| `customerPortal.subscriptions` | `list` | `polar portal subscriptions list` |
| `customerPortal.subscriptions` | `get` | `polar portal subscriptions get <id>` |
| `customerPortal.subscriptions` | `cancel` | `polar portal subscriptions cancel <id>` |
| `customerPortal.subscriptions` | `update` | `polar portal subscriptions update <id>` |
| `customerPortal.wallets` | `list` | `polar portal wallets list` |
| `customerPortal.wallets` | `get` | `polar portal wallets get <id>` |

**Total: 170 SDK methods → 170 CLI commands** (complete parity)
