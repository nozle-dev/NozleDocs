#!/usr/bin/env python3
"""Checks that the webhook event list in the docs equals the list Core sends.

scripts/webhook-event-types.txt is the snapshot of Core's api/config/webhook_event_types.yml.
It must equal: the `webhooks` section of nozle-openapi.yaml, the enum of `event_types` in the
webhook endpoint inputs, the Webhook Events navigation in docs.json and api/webhook-events.mdx.
"""
import json
import pathlib
import re
import sys

import yaml

root = pathlib.Path(__file__).resolve().parent.parent
snapshot = [l.strip() for l in (root / "scripts/webhook-event-types.txt").read_text().splitlines() if l.strip() and not l.startswith("#")]
spec = yaml.safe_load((root / "nozle-openapi.yaml").read_text())
errors = []


def compare(name, found):
    missing, extra = sorted(set(snapshot) - set(found)), sorted(set(found) - set(snapshot))
    if missing:
        errors.append(f"{name} is missing: {', '.join(missing)}")
    if extra:
        errors.append(f"{name} has types Core does not send: {', '.join(extra)}")
    if len(found) != len(set(found)):
        errors.append(f"{name} lists a type twice")


keys = {}
for key, item in spec["webhooks"].items():
    props = item["post"]["requestBody"]["content"]["application/json"]["schema"]["properties"]
    keys[key] = props["webhook_type"]["enum"][0]
compare("nozle-openapi.yaml webhooks", list(keys.values()))
for inp in ("WebhookEndpointCreateInput", "WebhookEndpointUpdateInput"):
    enum = spec["components"]["schemas"][inp]["properties"]["webhook_endpoint"]["properties"]["event_types"]["items"]["enum"]
    compare(f"{inp}.event_types", enum)

nav = json.dumps(json.loads((root / "docs.json").read_text()))
compare("docs.json navigation", [t for k, t in keys.items() if f'"webhook {k}"' in nav])

page = (root / "api/webhook-events.mdx").read_text()
compare("api/webhook-events.mdx", [t for t in snapshot if re.search(rf"^\| `{re.escape(t)}` \|", page, re.M)])

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"{len(snapshot)} webhook event types match in the OpenAPI spec, docs.json and the events page")
