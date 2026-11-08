#!/usr/bin/env python3
"""JSON adapter for the repository's canonical posting guard."""

import json
import base64
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from posting_guard import guard  # noqa: E402
from page_decode import decode_page  # noqa: E402
from json_io import read_payload, write_result, write_error  # noqa: E402


def main() -> int:
    try:
        payload = read_payload()
        content = payload.get("content", "")
        decoded_html = ""
        if payload.get("contentBase64"):
            raw = base64.b64decode(payload["contentBase64"])
            decoded_html = decode_page(raw) if payload["mode"] == "html" else ""
            content = decoded_html or raw.decode("utf-8", errors="replace")
        cleaned, findings = guard(content, payload["mode"])
        write_result({"cleanedText": cleaned, "findings": findings, "decodedHtml": decoded_html})
        return 0
    except Exception as exc:  # report a bounded error to the local app
        write_error(exc)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
