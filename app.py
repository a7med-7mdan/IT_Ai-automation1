import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from it_incident import tools, workflow
from it_incident.workflow import handle_incident

app = FastAPI(title="AI IT Incident Response Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class IncidentRequest(BaseModel):
    text: str
    session_id: str = "default"


class ResetPasswordRequest(BaseModel):
    user_id: str


class ApproveResetRequest(BaseModel):
    user_id: str
    approver: str = "IT Admin"


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/incident")
async def api_incident(req: IncidentRequest):
    text = (req.text or "").strip()
    if not text:
        return JSONResponse(
            status_code=400,
            content={"error": "Incident text must not be empty"}
        )
    
    resp = await handle_incident(text, session_id=req.session_id)
    return {
        "reply": resp.reply,
        "triage": resp.triage,
        "steps": resp.steps,
        "needs_human": resp.needs_human,
        "blocked_reason": resp.blocked_reason,
        "trace": list(workflow.LAST_TRACE),
    }


@app.post("/api/reset-password")
async def api_reset_password(req: ResetPasswordRequest):
    result = tools.reset_password(req.user_id.strip())
    return result


@app.post("/api/approve-reset")
async def api_approve_reset(req: ApproveResetRequest):
    result = tools.approve_reset(req.user_id.strip(), req.approver.strip())
    return result


@app.get("/api/tickets")
async def api_tickets():
    return tools.TICKETS


@app.post("/api/reset-demo")
async def api_reset_demo():
    tools.reset_demo_state()
    return {"status": "ok", "message": "Demo state reset"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print("==================================================")
    print("AI IT Incident Response Agent Web UI")
    print(f"Local URL: http://127.0.0.1:{port}")
    print("==================================================")
    uvicorn.run(app, host="127.0.0.1", port=port)

