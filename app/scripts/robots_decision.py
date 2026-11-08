#!/usr/bin/env python3
"""Apply the repo's strict robots parser to a securely fetched robots body."""

import json
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from robots_check import allowed, has_undecodable_rule, is_robots_body  # noqa: E402
from json_io import read_payload, write_result, write_error  # noqa: E402


def main() -> int:
    try:
        payload = read_payload()
        url = urlsplit(payload["url"])
        status = int(payload["status"])
        text = payload.get("text", "")
        if status == 404:
            result = {"allowed": True, "reason": "Allowed, no robots.txt published"}
        elif status == 200 and is_robots_body(text) and not has_undecodable_rule(text):
            path = unquote(url.path) or "/"
            if url.query:
                path += "?" + unquote(url.query)
            is_allowed = allowed(text, "Claude-User", path) and allowed(text, "*", path)
            result = {"allowed": is_allowed, "reason": "Allowed by robots.txt" if is_allowed else "Disallowed by robots.txt"}
        else:
            result = {"allowed": False, "reason": f"Robots policy could not be confirmed (HTTP {status})"}
        write_result(result)
        return 0
    except Exception as exc:
        write_error(exc)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
