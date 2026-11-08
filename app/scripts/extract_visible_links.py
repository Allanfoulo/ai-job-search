#!/usr/bin/env python3
"""Extract visible anchor targets while reusing the posting guard's hidden test."""

import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from posting_guard import _is_hidden  # noqa: E402
from json_io import read_payload, write_result, write_error  # noqa: E402


VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class LinkParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.stack: list[tuple[str, bool]] = []
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        raw = " ".join(f'{key}="{value or ""}"' for key, value in attrs)
        hidden = any(item[1] for item in self.stack) or _is_hidden(raw)
        if tag.lower() == "a" and not hidden and values.get("href"):
            target = urljoin(self.base_url, values["href"].strip())
            parsed = urlsplit(target)
            if parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password:
                if target not in self.links:
                    self.links.append(target)
        if tag.lower() not in VOID:
            self.stack.append((tag.lower(), hidden))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        tag = tag.lower()
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break


def main() -> int:
    try:
        payload = read_payload()
        parser = LinkParser(payload["baseUrl"])
        parser.feed(payload["html"])
        write_result({"links": parser.links})
        return 0
    except Exception as exc:
        write_error(exc)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
