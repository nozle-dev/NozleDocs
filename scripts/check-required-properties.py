#!/usr/bin/env python3
"""Checks that every schema in nozle-openapi.yaml only requires keys it declares.

A `required` entry must name a key of the schema's `properties`. Keys declared by `allOf`,
`oneOf` and `anyOf` members count, a member may require a key its parent declares, `$ref`s
are followed, and a schema that allows any extra key (`additionalProperties` or
`patternProperties`) is skipped.
`required` on a schema that is not an object (for example an array) is an error too: it
belongs on the object inside `items`.

Usage: check-required-properties.py [path/to/openapi.yaml]
"""
import pathlib
import sys

import yaml

# Values under these keys are data, not schemas.
DATA_KEYS = {"example", "examples", "default", "enum", "const", "x-codeSamples"}


def resolve(spec, node, seen=()):
    while isinstance(node, dict) and "$ref" in node:
        ref = node["$ref"]
        if ref in seen or not ref.startswith("#/"):
            return {}
        seen = (*seen, ref)
        node = spec
        for part in ref[2:].split("/"):
            node = node.get(part.replace("~1", "/").replace("~0", "~"), {})
    return node if isinstance(node, dict) else {}


def declared(spec, node, seen=()):
    """Returns (keys, open): the keys a schema declares, and whether it accepts any key."""
    node = resolve(spec, node, seen)
    if id(node) in seen:
        return set(), False
    seen = (*seen, id(node))
    keys = set(node.get("properties") or {})
    is_open = bool(node.get("additionalProperties")) or bool(node.get("patternProperties"))
    for combo in ("allOf", "oneOf", "anyOf"):
        for member in node.get(combo) or []:
            member_keys, member_open = declared(spec, member, seen)
            keys |= member_keys
            is_open = is_open or member_open
    return keys, is_open


def check(spec):
    errors = []

    def walk(node, path, sibling_keys=frozenset()):
        if isinstance(node, list):
            for i, item in enumerate(node):
                walk(item, f"{path}[{i}]", sibling_keys)
            return
        if not isinstance(node, dict):
            return
        required = node.get("required")
        if isinstance(required, list) and "$ref" not in node:
            keys, is_open = declared(spec, node)
            types = node.get("type")
            types = types if isinstance(types, list) else [types]
            if "array" in types and "object" not in types:
                errors.append(f"{path}: `required` on an array schema; it belongs in `items`")
            elif not is_open:
                missing = [k for k in required if k not in keys | sibling_keys]
                if missing:
                    errors.append(f"{path}: requires {', '.join(map(repr, missing))} not in its properties")
        for key, value in node.items():
            if key in DATA_KEYS:
                continue
            if key == "properties" and isinstance(value, dict):
                for name, prop in value.items():
                    walk(prop, f"{path}.properties.{name}")
            elif key in ("allOf", "oneOf", "anyOf") and isinstance(value, list):
                # A member may require a key that the parent or a sibling member declares.
                context = frozenset(declared(spec, node)[0]) | sibling_keys
                for i, member in enumerate(value):
                    walk(member, f"{path}.{key}[{i}]", context)
            else:
                walk(value, f"{path}.{key}")

    walk(spec, "#")
    return errors


def self_test():
    spec = {
        "components": {
            "schemas": {
                "Base": {"type": "object", "properties": {"id": {}}},
                "Good": {"allOf": [{"$ref": "#/components/schemas/Base"}, {"required": ["id"]}]},
                "Either": {"type": "object", "properties": {"a": {}, "b": {}}, "anyOf": [{"required": ["a"]}, {"required": ["b"]}]},
                "Open": {"type": "object", "required": ["x"], "additionalProperties": True},
                "Bad": {"type": "object", "required": ["Customers"], "properties": {"customers": {}}},
                "List": {"type": "array", "required": ["id"], "items": {"$ref": "#/components/schemas/Base"}},
                "Example": {"type": "object", "properties": {}, "example": {"required": ["nope"]}},
            }
        }
    }
    found = check(spec)
    assert len(found) == 2, found
    assert "Bad" in found[0] and "'Customers'" in found[0], found
    assert "List" in found[1] and "items" in found[1], found


if __name__ == "__main__":
    self_test()
    root = pathlib.Path(__file__).resolve().parent.parent
    path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "nozle-openapi.yaml"
    problems = check(yaml.safe_load(path.read_text()))
    for problem in problems:
        print(problem, file=sys.stderr)
    if problems:
        print(f"{len(problems)} schema(s) require keys they do not declare.", file=sys.stderr)
        sys.exit(1)
    print("Every required key is declared in its schema's properties.")
