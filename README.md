# AI IT Incident Response Agent

Agentic AI final project, Project 1. Built with the OpenAI Agents SDK running on a local Ollama model (qwen2.5:7b). The LLM decides what to do; Python decides what is allowed.

## Flow

User -> Web UI (HTML/CSS/JS + FastAPI) -> input guardrail -> triage -> router -> orchestrator -> workers (in parallel) -> troubleshooter <-> evaluator loop -> output guardrail -> reply or human review

## Who decides what

| Decision | Style | Where |
|---|---|---|
| Block credential requests, prompt injection, unsafe admin requests | Code-orchestrated | guardrails.py, workflow.py |
| Route critical or security incidents to a human | Code-orchestrated | triage.py (decide_route), workflow.py |
| Evaluator loop, stop condition, max 3 iterations | Code-orchestrated | resolution.py |
| Python checks for fake "fixed" claims, unsafe steps, invented evidence | Code-orchestrated | resolution.py |
| reset_password needs human approval, one-time | Code-orchestrated | tools.py |
| Retry after a retryable tool failure | Code-orchestrated | investigation.py, tools.py |
| Classify the incident (category, severity, security flag) | LLM-orchestrated | triage.py |
| Choose which workers (network, account, device) to run | LLM-orchestrated | investigation.py (orchestrator agent) |
| Draft the fix plan | LLM-orchestrated | resolution.py (troubleshooter agent) |
| Judge whether the draft is supported by tool results | LLM-orchestrated plus Python checks | resolution.py (evaluator agent) |

## Orchestration patterns

- Prompt chaining: triage (TriageResult) -> investigation (InvestigationResult) -> resolution (Resolution). Intermediate outputs are shown in the UI.
- Routing: decide_route sends critical and security incidents to human review, everything else continues automatically.
- Parallelization: the diagnostic workers run concurrently with asyncio.gather in investigation.py.
- Orchestrator-workers: an orchestrator agent picks workers; the network, account and device workers use different tools.
- Evaluator-optimizer: troubleshooter drafts, evaluator rejects or approves, feedback goes back, maximum 3 iterations, then a human takes over.

## Structured outputs

TriageResult, WorkerFinding, Resolution, EvalResult, IncidentResponse in models.py, with validators for user IDs, empty lists and summary length.

## Guardrails

- Input: credential requests, prompt injection, unsafe administrative actions.
- Output: fabricated "fixed", "password reset" and "ticket created" claims, leaked passwords. SDK `@output_guardrail` attached to agents.
- Indirect injection: tool results and KB evidence are checked and sanitized against prompt injections before being passed to the resolution agent.
- Tool level: reset_password is blocked until a human approves it, and the approval works once.

## Human in the loop

Security and critical incidents are never closed automatically. Escalations automatically create tickets in state `escalated_to_human`. Unapproved drafts and admin-only fixes open a ticket for the IT team, with live ticket tracking in the UI.

## Memory and tracing

SQLiteSession keeps the conversation per session (sessions.db), so a follow-up without a user ID reuses the earlier one. trace() wraps each incident; the Collector in workflow.py shows agents, tools and generations in the UI.

## Project structure

    app.py                FastAPI server and web UI entry point
    it_incident/          agents, tools, guardrails, workflow, models, data
    static/               web UI (index.html, app.js, style.css)
    tests/                offline tests, scenario tests and demos
    requirements.txt      Python dependencies
    sessions.db           created at runtime for conversation memory

## Requirements

- Windows with PowerShell, Python 3.10 or newer (the `py` launcher)
- Git
- Ollama installed and running, with the qwen2.5:7b model (about 4.7 GB)

## Run

    git clone https://github.com/a7med-7mdan/IT_Ai-automation.git
    cd IT_Ai-automation
    py -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    ollama pull qwen2.5:7b
    $env:OLLAMA_MODEL = "qwen2.5:7b"
    py app.py

Open http://127.0.0.1:8000 in the browser and describe an IT incident, for example "I'm user U1001 and my VPN keeps disconnecting". The first reply can take a minute on a CPU-only machine.

If activating the virtual environment is blocked, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

Optional environment variables:

    $env:OLLAMA_MODEL = "llama3.1:8b"
    $env:OLLAMA_URL = "http://localhost:11434/v1"
    $env:PORT = "8001"

`$env:` values last only for the current PowerShell window, so set them again in each new one.

## Tests

Run all commands from the project root with the virtual environment active.

No LLM needed:

    py tests\test_triage.py --offline
    py tests\test_resolution.py --offline
    py tests\test_investigation.py --offline
    py tests\test_my_part.py
    py tests\demo_my_part.py
    py tests\test_scenarios.py --fast

Ollama must be running:

    py tests\test_llm_smoke.py
    py tests\test_scenarios.py

`tests\test_web_api.py` talks to the web server, so start `py app.py` in another window first.

test_scenarios.py covers the 12 required demo scenarios. demo_my_part.py shows scenarios 7 to 10 without an LLM.

## Troubleshooting

- `ModuleNotFoundError: No module named 'it_incident'`: run from the project root and make sure the `it_incident` folder exists next to `app.py`.
- Connection errors to the model: start Ollama and check that `ollama list` shows qwen2.5:7b.
- Port already in use: set `$env:PORT` to another number.

## Bonus

Evaluation suite measuring tool choice accuracy, escalation handling, evaluator feedback loops, and deterministic fallback behaviour (`test_scenarios.py`, `test_resolution.py`, `test_triage.py`).

## Team

Eyad Mostafa: data, tools, guardrails, tool failure handling. Ahmed Hemdan: agents, workflow, escalation, tracing and sessions. Together: integration, UI, README.
