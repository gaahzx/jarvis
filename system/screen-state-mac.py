#!/usr/bin/env python3
"""
screen-state-mac.py — macOS desktop state monitor daemon.
Uses AppleScript via osascript (no screenshots, no extra deps).
Outputs JSON lines to stdout on every state change or 2s heartbeat.

Schema (matches Windows version):
{
  "ts": <epoch>,
  "fg": { "title": "...", "proc": "AppName" },
  "windows": [ { "title": "...", "proc": "AppName" }, ... ],
  "cursor": { "x": 100, "y": 200 }
}
"""

import sys
import json
import time
import subprocess
import argparse

sys.stdout.reconfigure(encoding="utf-8")


def run_osa(script: str, timeout: float = 1.5) -> str:
    try:
        r = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=timeout
        )
        return r.stdout.strip()
    except Exception:
        return ""


def get_frontmost():
    """Return (proc_name, window_title) of frontmost app."""
    script = '''
    tell application "System Events"
      set frontApp to first application process whose frontmost is true
      set procName to name of frontApp
      try
        set winTitle to title of front window of frontApp
      on error
        set winTitle to ""
      end try
      return procName & "||" & winTitle
    end tell
    '''
    out = run_osa(script)
    if "||" in out:
        proc, title = out.split("||", 1)
        return proc.strip(), title.strip()
    return "", ""


def get_open_apps(limit: int = 12):
    """Return list of visible app names + their first window title."""
    script = '''
    set output to ""
    tell application "System Events"
      set procs to (every application process whose background only is false)
      repeat with p in procs
        try
          set pname to name of p
          set wtitle to ""
          try
            set wtitle to title of (first window of p whose visible is true)
          end try
          set output to output & pname & "::" & wtitle & "\\n"
        end try
      end repeat
    end tell
    return output
    '''
    out = run_osa(script, timeout=2.0)
    wins = []
    for line in out.split("\n"):
        line = line.strip()
        if not line:
            continue
        if "::" in line:
            proc, title = line.split("::", 1)
            wins.append({"proc": proc.strip(), "title": title.strip()})
        if len(wins) >= limit:
            break
    return wins


def get_cursor():
    """Cursor position via Python Quartz (preinstalled on macOS)."""
    try:
        from Quartz import CGEventCreate, CGEventGetLocation
        loc = CGEventGetLocation(CGEventCreate(None))
        return {"x": int(loc.x), "y": int(loc.y)}
    except Exception:
        return {"x": 0, "y": 0}


def build_state():
    fg_proc, fg_title = get_frontmost()
    return {
        "ts": int(time.time() * 1000),
        "fg": {"title": fg_title, "proc": fg_proc},
        "windows": get_open_apps(),
        "cursor": get_cursor(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["stdout"], default="stdout")
    parser.add_argument("--interval", type=float, default=2.0)
    args = parser.parse_args()

    last_key = None
    last_emit = 0
    while True:
        try:
            state = build_state()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f'{{"error":"{str(e)[:80]}"}}', flush=True)
            time.sleep(args.interval)
            continue

        key = (state["fg"]["title"], state["fg"]["proc"])
        now = time.time()
        # Emit on change OR every ~5s heartbeat
        if key != last_key or (now - last_emit) > 5:
            print(json.dumps(state, ensure_ascii=False), flush=True)
            last_key = key
            last_emit = now
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
