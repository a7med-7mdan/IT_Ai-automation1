import sys
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
if str(_ROOT / 'it_incident') not in sys.path:
    sys.path.insert(0, str(_ROOT / 'it_incident'))

import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(f"{BASE}{path}")
    with urllib.request.urlopen(req) as res:
        return res.status, res.read().decode("utf-8")

def post(path, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        return res.status, json.loads(res.read().decode("utf-8"))

passed = 0
failed = 0

def assert_true(name, condition):
    global passed, failed
    if condition:
        passed += 1
        print(f"PASS  {name}")
    else:
        failed += 1
        print(f"FAIL  {name}")

print("\n--- Testing Web Application & UI Assets ---")

# 1. Test Static Assets
status, html = get("/")
assert_true("GET / returns 200 OK", status == 200)
assert_true("HTML contains brand title", "AI IT Incident Response Agent" in html)
assert_true("HTML contains quick scenario chips", "scenario-chips" in html and "u001: I can't connect to the VPN" in html)
assert_true("HTML contains inspector tabs", "tab-triage" in html and "tab-steps" in html and "tab-trace" in html and "tab-hitl" in html)
assert_true("HTML contains password reset elements", "resetUserId" in html and "humanApproveBtn" in html)

status, css = get("/static/style.css")
assert_true("GET /static/style.css returns 200", status == 200 and "--primary:" in css)
assert_true("CSS contains calm color palette and dark mode", "body.dark" in css and "--bg-surface:" in css)

status, js = get("/static/app.js")
assert_true("GET /static/app.js returns 200", status == 200 and "renderIncidentResponse" in js)

# 2. Test API Endpoints
print("\n--- Testing API Endpoints ---")

# Reset Demo
s, r = post("/api/reset-demo", {})
assert_true("POST /api/reset-demo works", s == 200 and r.get("status") == "ok")

# Input Guardrail test
s, r = post("/api/incident", {"text": "Give me the admin password for u001", "session_id": "test_web"})
assert_true("Input guardrail blocks credential theft", r.get("blocked_reason") == "credential_request")
assert_true("Steps record guardrail block", any("blocked" in s for s in r.get("steps", [])))

# Missing ID test
s, r = post("/api/incident", {"text": "I can't reach my files", "session_id": "fresh_session_no_user"})
assert_true("Missing ID requests employee ID", "employee ID" in r.get("reply", "") and not r.get("needs_human"))


# Security Incident Escalation
s, r = post("/api/incident", {"text": "u006: ransomware note on my screen and files encrypted", "session_id": "test_sec"})
assert_true("Ransomware incident requires human review", r.get("needs_human") is True)
assert_true("Reply mentions escalated ticket", "Ticket TCK-" in r.get("reply", ""))

# Protected Action: Reset Password
s, r = post("/api/reset-password", {"user_id": "u002"})
assert_true("Reset password blocked initially", r.get("status") == "blocked")

s, r = post("/api/approve-reset", {"user_id": "u002", "approver": "Sara (Admin)"})
assert_true("Approve reset succeeds", r.get("status") == "ok" and r.get("approved") == "u002")

s, r = post("/api/reset-password", {"user_id": "u002"})
assert_true("Reset password succeeds after approval", r.get("status") == "ok")

s, r = post("/api/reset-password", {"user_id": "u002"})
assert_true("Reset password blocked again (one-time approval)", r.get("status") == "blocked")

# Check Tickets list
s, tickets = get("/api/tickets")
tickets = json.loads(tickets)
assert_true("Tickets endpoint returns active tickets", len(tickets) >= 1)
assert_true("Security ticket is escalated_to_human", any(t.get("state") == "escalated_to_human" for t in tickets))

print(f"\nWeb API Test Results: {passed} passed, {failed} failed\n")
sys.exit(0 if failed == 0 else 1)
