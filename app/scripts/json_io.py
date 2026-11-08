"""JSON file handoff for environments that do not permit child-process pipes."""
import json
import sys
from pathlib import Path


def read_payload():
    if len(sys.argv) >= 3 and sys.argv[1] == "--input-file":
        return json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    return json.load(sys.stdin)


def write_result(value):
    if len(sys.argv) >= 5 and sys.argv[3] == "--output-file":
        Path(sys.argv[4]).write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    else:
        json.dump(value, sys.stdout, ensure_ascii=False)


def write_error(error):
    try:
        write_result({"error": str(error)})
    except Exception:
        pass
