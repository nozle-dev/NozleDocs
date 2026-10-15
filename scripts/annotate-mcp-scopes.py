"""Set x-mcp-scope on every operation of nozle-openapi.yaml.

An MCP server built from the spec can expose only the operations of the scopes it is
started with. Reads are `read`, deletions are `delete`, everything else is `write`, except
the POST operations listed in READ_ONLY_POSTS, which compute a preview or a decision and
change nothing.

Run: python scripts/annotate-mcp-scopes.py  (needs ruamel.yaml)
"""

from pathlib import Path

from ruamel.yaml import YAML

SPEC = Path(__file__).resolve().parent.parent / "nozle-openapi.yaml"
METHODS = ("get", "head", "post", "put", "patch", "delete")
READ_ONLY_POSTS = {
    "estimateCreditNote",
    "eventEstimateFees",
    "eventEstimateInstantFees",
    "eventBatchEstimateInstantFees",
    "previewSharedCostAllocation",
    "invoicePreview",
    "enginePreviewSubscriptionChange",
    "enginePreviewSubscriptionTransition",
    "engineCheckCreditUsage",
    "engineSimulateMargin",
}


def scope(method: str, operation_id: str) -> str:
    if method in ("get", "head") or operation_id in READ_ONLY_POSTS:
        return "read"
    if method == "delete":
        return "delete"
    return "write"


yaml = YAML()
yaml.preserve_quotes = True
yaml.width = 4096
yaml.indent(mapping=2, sequence=4, offset=2)
yaml.representer.add_representer(type(None), lambda r, d: r.represent_scalar("tag:yaml.org,2002:null", "null"))

spec = yaml.load(SPEC.read_text())
missing = []
for path, item in spec["paths"].items():
    for method in METHODS:
        operation = item.get(method)
        if operation is None:
            continue
        operation_id = operation.get("operationId")
        if not operation_id:
            missing.append(f"{method.upper()} {path}")
        operation["x-mcp-scope"] = scope(method, operation_id or "")
unknown = READ_ONLY_POSTS - {
    item[m].get("operationId") for item in spec["paths"].values() for m in METHODS if m in item
}
if unknown:
    raise SystemExit(f"READ_ONLY_POSTS lists operations the spec does not have: {sorted(unknown)}")
with SPEC.open("w") as f:
    yaml.dump(spec, f)
print("annotated; operations without operationId:", missing or "none")
