#!/usr/bin/env python3
"""Regenerate the SDK changelog pages from each SDK repository's CHANGELOG.md.

Run from the docs repository root after every SDK release, then commit the pages:

    python3 scripts/sync-sdk-changelogs.py
    python3 scripts/sync-sdk-changelogs.py --js ../nozle-js/CHANGELOG.md   # a local file instead

By default each CHANGELOG.md is read from the repository's main branch on GitHub.
Only dated release sections are published; an "Unreleased" section is left out.
"""
import argparse
import pathlib
import re
import urllib.request

SOURCES = {
    "js": "https://raw.githubusercontent.com/nozle-dev/nozle-js/main/CHANGELOG.md",
    "python": "https://raw.githubusercontent.com/nozle-dev/nozle-python/main/CHANGELOG.md",
    "go": "https://raw.githubusercontent.com/nozle-dev/nozle-go/main/CHANGELOG.md",
}

# page path, source, package name in nozle-js headings (None: the whole file is one package), title, package, repo
PAGES = [
    ("sdks/node/changelog.mdx", "js", "Node.js", "Node.js SDK changelog", "`@nozle-js/node`", "nozle-dev/nozle-js"),
    ("sdks/react/changelog.mdx", "js", "React", "React SDK changelog", "`@nozle-js/react`", "nozle-dev/nozle-js"),
    ("sdks/python/changelog.mdx", "python", None, "Python SDK changelog", "`nozle-sdk`", "nozle-dev/nozle-python"),
    ("sdks/go/changelog.mdx", "go", None, "Go SDK changelog", "`github.com/nozle-dev/nozle-go`", "nozle-dev/nozle-go"),
]

# "## 0.41.0 — 2026-11-18", "## [0.41.0] - 2026-11-18", "## Node.js 0.22.0 and React 0.23.0 — 2026-10-29"
RELEASE = re.compile(r"^## (?P<name>.+?) (?:—|-) (?P<date>\d{4}-\d{2}-\d{2})$")
VERSION = re.compile(r"(?:(?P<pkg>Node\.js|React) )?\[?v?(?P<version>\d+\.\d+\.\d+)\]?")
# Documentation CI rejects the inherited third-party name in published pages; SDK notes name its old field prefix.
FORMER_PREFIX = re.compile(r"[lL][aA][gG][oO](?=_)")


def read(source: str) -> str:
    if source.startswith("https://"):
        with urllib.request.urlopen(source, timeout=30) as response:
            return response.read().decode("utf-8")
    return pathlib.Path(source).read_text()


def releases(text: str):
    """Yield (versions by package, date, body lines) for each dated section."""
    name = date = None
    body: list[str] = []
    for line in text.split("\n") + ["## end"]:
        if line.startswith("## "):
            if name:
                yield name, date, body
            match = RELEASE.match(line)
            if match:
                versions = {m["pkg"]: m["version"] for m in VERSION.finditer(match["name"])}
                assert versions, f"no version in heading: {line}"
                name, date, body = versions, match["date"], []
            else:
                assert line in ("## end",) or "unreleased" in line.lower(), f"unknown heading: {line}"
                name = None
        elif name:
            body.append(line)


def escape_mdx(line: str) -> str:
    """Escape MDX-significant characters outside inline code."""
    line = FORMER_PREFIX.sub("<former prefix>", line)
    parts = re.split(r"(`[^`]*`)", line)
    for i in range(0, len(parts), 2):
        parts[i] = parts[i].replace("{", "\\{").replace("}", "\\}").replace("<", "&lt;")
    return "".join(parts)


def render_body(lines: list[str]) -> list[str]:
    out, fenced = [], False
    for line in lines:
        if line.startswith("```"):
            fenced = not fenced
            out.append(line)
        elif fenced:
            out.append(line)
        elif line.startswith("### ") or line.startswith("#### "):
            # Bold, not a heading: a heading inside <Update> becomes its own RSS item titled "Added".
            out.append("**" + escape_mdx(line.lstrip("#").strip()) + "**")
        else:
            out.append(escape_mdx(line))
    assert not fenced, "unclosed code fence"
    while out and not out[-1].strip():
        out.pop()
    while out and not out[0].strip():
        out.pop(0)
    return out


def render_page(text: str, package: str | None, title: str, label: str, repo: str) -> tuple[str, int]:
    blocks = []
    for versions, date, body in releases(text):
        if package is None:
            version = next(iter(versions.values()))
            others = ""
        elif None in versions:
            raise AssertionError(f"{date}: heading names no package, so neither Node.js nor React page gets it")
        elif package in versions:
            version = versions[package]
            others = ", ".join(f"{p} {v}" for p, v in versions.items() if p != package)
        else:
            continue
        description = f"{date}, released with {others}" if others else date
        blocks.append(
            "\n".join([f'<Update label="{version}" description="{description}">', "", *render_body(body), "", "</Update>"])
        )
    assert blocks, f"no releases found for {title}"
    header = "\n".join(
        [
            "---",
            f'title: "{title}"',
            f'description: "Every release of {label.strip("`")}, newest first."',
            "rss: true",
            "---",
            "",
            "{/* Generated by scripts/sync-sdk-changelogs.py from the SDK repository's CHANGELOG.md. Do not edit by hand. */}",
            "",
            f"Release notes for {label}, copied from [`CHANGELOG.md`](https://github.com/{repo}/blob/main/CHANGELOG.md). "
            "Product releases that need no SDK update are in the [changelog](/changelog).",
            "",
        ]
    )
    return header + "\n" + "\n\n".join(blocks) + "\n", len(blocks)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for key, url in SOURCES.items():
        parser.add_argument(f"--{key}", default=url, help=f"CHANGELOG.md path or URL (default {url})")
    args = parser.parse_args()
    assert escape_mdx("a {b} <c> `x<y>{z}`") == "a \\{b\\} &lt;c> `x<y>{z}`", "MDX escaping broke"
    texts = {key: read(getattr(args, key)) for key in SOURCES}
    root = pathlib.Path(__file__).resolve().parent.parent
    for path, source, package, title, label, repo in PAGES:
        page, count = render_page(texts[source], package, title, label, repo)
        (root / path).write_text(page)
        print(f"{path}: {count} releases")


if __name__ == "__main__":
    main()
