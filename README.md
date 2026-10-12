# Nozle documentation

Source for [docs.nozle.dev](https://docs.nozle.dev), the Nozle documentation site. The site covers billing, subscriptions, product credits, usage metering, entitlements, margin intelligence, the HTTP APIs, and the React, Node.js, Python, and Go SDKs.

Start with the [quickstart](https://docs.nozle.dev/guides/getting-started/quickstart) if you are integrating Nozle. This repository is for editing and reviewing the documentation.

## Find your way around

| Area | What it contains |
| --- | --- |
| [`guides/`](guides/getting-started/introduction.mdx) | Concepts and workflows for billing, credits, entitlements, and margin intelligence |
| [`api/`](api/introduction.mdx) and [`nozle-openapi.yaml`](nozle-openapi.yaml) | Handwritten API guidance and the checked-in Core OpenAPI contract |
| [`sdks/`](sdks/node/installation.mdx) | Installation and workflow guides for React, Node.js, Python, and Go |
| [`integrations/`](integrations/stripe.mdx) | Provider integration guides |
| [`changelog/`](changelog/index.mdx) | Published product and SDK release notes |
| [`examples/`](examples/node-sdk.ts) | Source examples compiled against the pinned published SDK packages by documentation CI; these are excluded from the published site |
| [`docs.json`](docs.json) | Mintlify site configuration, navigation, and API reference mapping |

SDK setup guides: [React](sdks/react/installation.mdx) · [Node.js](sdks/node/installation.mdx) · [Python](sdks/python/installation.mdx) · [Go](sdks/go/installation.mdx).

For the service prefixes and credential boundaries used in examples, see [API URLs](guides/getting-started/api-domains.mdx) and [Authentication](api/authentication.mdx). The public Core and Engine bases are `https://api.nozle.app/core` and `https://api.nozle.app/engine`.

## Preview locally

Use Node.js 22, the version used by documentation CI. From the repository root:

```bash
npm ci --ignore-scripts
npx --yes mintlify@4.2.715 dev
```

The Mintlify command prints the local preview URL and opens it in your browser. Add `--no-open` when running without a browser. The preview reads `docs.json` and the MDX files in this checkout; no Nozle API key is needed to read or edit the docs.

## Check a change

Install `jq` and Python 3 for the full checks. Run the content checks used by [documentation CI](.github/workflows/docs-ci.yml), then validate the Mintlify build:

```bash
jq empty docs.json
npx --yes mintlify@4.2.715 broken-links
npm run typecheck:examples
python3 -m py_compile examples/python-sdk.py
npx --yes mintlify@4.2.715 validate
```

CI also checks for accidental third-party branding in published files. The [CI workflow](.github/workflows/docs-ci.yml) is the source of truth for its exact checks and tool versions.

## Edit the documentation

1. Edit the relevant MDX page. For a new page, add its path to the appropriate tab and group in `docs.json`; a file alone does not make it appear in navigation.
2. Keep API routes, request fields, and examples aligned with the current Core or Engine contract. `docs.json` maps Core reference pages to `nozle-openapi.yaml`; workflow pages in `api/` explain Nozle-specific operations.
3. Keep SDK installation commands and release notes aligned with versions available from the public registries. Link runnable examples to tags that contain them.
4. Run the checks above and review the changed pages in the local preview before opening a pull request.

Never put a real `sk_` secret in an example or browser snippet. Server SDK examples use a backend environment variable such as `NOZLE_SECRET_KEY`; React examples use a publishable key and authenticated callbacks to the merchant backend.
