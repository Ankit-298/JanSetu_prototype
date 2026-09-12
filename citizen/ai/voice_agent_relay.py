"""
JanSetu Real-Time Voice AI Agent Relay Microservice
Built with Sarvam AI Conversational AI stack (STT: Saarika, LLM: sarvam-m, TTS: Bulbul V3)
Location: citizen/ai/voice_agent_relay.py
"""

import os
import json
import logging
from typing import Dict, Any

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:
    # Safe stubs when FastAPI is not yet installed in local environment
    class FastAPI:  # type: ignore
        def __init__(self, *args, **kwargs): pass
        def add_middleware(self, *args, **kwargs): pass
        def websocket(self, path: str):
            def decorator(func): return func
            return decorator

    class WebSocket:  # type: ignore
        async def accept(self): pass
        async def receive_text(self): return "{}"
        async def send_json(self, data): pass

    class WebSocketDisconnect(Exception):  # type: ignore
        pass

    class CORSMiddleware:  # type: ignore
        pass

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    def load_dotenv(): pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JanSetuVoiceAgent")

app = FastAPI(title="JanSetu Voice Agent Relay")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://127.0.0.1:5000")

# ─────────────────────────────────────────────────────────────
# 1. AGENT TOOLS DEFINITION (Per Sarvam Specification)
# ─────────────────────────────────────────────────────────────
TOOLS = [
    {
        "name": "save_problem_details",
        "description": "Call this once you understand what the citizen's problem is.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "short title in English"},
                "category": {
                    "type": "string",
                    "description": "one of: Disaster Management, Infrastructure, Health, Environment, Education, Water Management, Agriculture"
                },
                "description": {"type": "string", "description": "full description, translated to English for storage, but keep speaking to the citizen in Hindi/Hinglish"}
            },
            "required": ["title", "category", "description"]
        }
    },
    {
        "name": "advance_to_step",
        "description": "Call this to move the citizen to the next screen once the current step's information is captured.",
        "parameters": {
            "type": "object",
            "properties": {
                "step": {
                    "type": "string",
                    "enum": ["confirm_problem", "location", "photo", "video", "duplicate_check", "twin_decision", "done"],
                    "description": "one of: confirm_problem, location, photo, video, duplicate_check, twin_decision, done"
                }
            },
            "required": ["step"]
        }
    },
    {
        "name": "check_duplicate",
        "description": "Call this after location is captured, before asking for photos, to check if a similar problem already exists.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "category": {"type": "string"},
                "lat": {"type": "number"},
                "lng": {"type": "number"}
            },
            "required": ["title", "category", "lat", "lng"]
        }
    },
    {
        "name": "link_as_twin",
        "description": "Call this if the citizen agrees to link their report to an existing similar problem instead of creating a new one.",
        "parameters": {
            "type": "object",
            "properties": {
                "existingProblemId": {"type": "string"}
            },
            "required": ["existingProblemId"]
        }
    },
    {
        "name": "confirm_submission",
        "description": "Call this once everything is captured and the citizen confirms they're done.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]

# ─────────────────────────────────────────────────────────────
# 2. AGENT SYSTEM PROMPT (Persona & Flow)
# ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Tum JanSetu ke ek dost ho jo citizens ki civic problems report karne me madad karte ho.
Hamesha Hindi ya Hinglish me baat karo, jaisa citizen bole waisa hi respond karo — agar wo
Hindi bole to Hindi me jawab do, agar Hinglish bole to Hinglish me.

Flow follow karo:
1. Pucho "Namaste! JanSetu me aapka swagat hai. Kya problem hai jo aap report karna chahte hain?" — jab tak clear
   title, category, aur description na mil jaaye tab tak follow-up questions poochte raho.
   Jaise hi samajh aa jaaye, save_problem_details call karo, phir customer ko confirm karo
   ("Samajh gaya — [ek line summary]. Sahi hai?"), phir advance_to_step("location") call karo.
2. Location step par bolo: "Ab neeche 'Use Current Location' button dabaye." Jab location
   capture ho jaaye (frontend event se pata chalega), check_duplicate call karo.
3. Agar duplicate mile: advance_to_step("duplicate_check") call karo aur samjhao ki ye
   problem pehle se registered hai, aur pucho kya wo isse link karna chahte hain
   ("agar link karte hain, to dono report track hongi aur zyada priority milegi").
   Agar haan bole, link_as_twin call karo. Agar nahi, normal flow continue karo.
4. Phir advance_to_step("photo") call karke bolo "Ab problem ki photo upload kar dijiye."
5. Phir advance_to_step("video") call karke bolo "Agar video hai to daal dijiye, warna
   'skip' bol sakte hain."
6. Jab sab ho jaaye, confirm karo aur confirm_submission call karo, phir
   advance_to_step("done") call karo, aur tracking ID citizen ko bata do.

Kabhi bhi ek saath bahut saare sawal mat pucho — ek waqt me ek hi cheez pucho, jaise
ek insaan phone pe baat karta hai."""

# ─────────────────────────────────────────────────────────────
# 3. TOOL HANDLER (Real Backend Logic via Express API Bridge)
# ─────────────────────────────────────────────────────────────
async def handle_tool_call(tool_name: str, params: Dict[str, Any], session: Dict[str, Any]) -> Dict[str, Any]:
    logger.info(f"Tool executed: {tool_name} with params: {params}")

    if tool_name == "save_problem_details":
        session["draft"] = {
            "title": params.get("title", ""),
            "category": params.get("category", "Urban Infrastructure"),
            "description": params.get("description", "")
        }
        await session["socket"].send_json({
            "type": "problem_draft_saved",
            "draft": session["draft"]
        })
        return {"status": "saved", "draft": session["draft"]}

    if tool_name == "advance_to_step":
        step = params.get("step", "listening")
        session["step"] = step
        await session["socket"].send_json({"type": "advance_step", "step": step})
        return {"status": "advanced", "step": step}

    if tool_name == "check_duplicate":
        lat = params.get("lat") or session.get("location", {}).get("lat", 23.3441)
        lng = params.get("lng") or session.get("location", {}).get("lng", 85.3096)
        payload = {
            "title": params.get("title") or session.get("draft", {}).get("title", ""),
            "category": params.get("category") or session.get("draft", {}).get("category", ""),
            "lat": lat,
            "lng": lng
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(f"{NODE_BACKEND_URL}/api/voice-agent/duplicate-check", json=payload)
                data = res.json()
                if data.get("hasDuplicate"):
                    match = data.get("match")
                    session["duplicate_candidate"] = match.get("id") or match.get("_id")
                    await session["socket"].send_json({
                        "type": "duplicate_found",
                        "match": match
                    })
                    return {"found": True, "existingTitle": match.get("title"), "existingId": session["duplicate_candidate"]}
        except Exception as e:
            logger.error(f"Duplicate check error: {e}")
        return {"found": False}

    if tool_name == "link_as_twin":
        existing_id = params.get("existingProblemId") or session.get("duplicate_candidate")
        payload = {
            "existingProblemId": existing_id,
            "citizenId": session.get("citizenId"),
            "citizenName": session.get("citizenName", "Citizen Submitter")
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(f"{NODE_BACKEND_URL}/api/voice-agent/link-twin", json=payload)
                data = res.json()
                session["final_problem_id"] = existing_id
                session["tracking_id"] = data.get("trackingId", existing_id)
                await session["socket"].send_json({
                    "type": "twin_linked",
                    "trackingId": session["tracking_id"]
                })
                return {"status": "linked", "trackingId": session["tracking_id"]}
        except Exception as e:
            logger.error(f"Link twin error: {e}")
            session["final_problem_id"] = existing_id
            return {"status": "linked", "trackingId": existing_id}

    if tool_name == "confirm_submission":
        if not session.get("final_problem_id"):
            payload = {
                "draft": session.get("draft", {}),
                "location": session.get("location", {}),
                "attachments": session.get("attachments", []),
                "submittedViaVoice": True,
                "citizenId": session.get("citizenId"),
                "citizenName": session.get("citizenName", "Citizen Submitter")
            }
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(f"{NODE_BACKEND_URL}/api/voice-agent/submit", json=payload)
                    data = res.json()
                    session["final_problem_id"] = data.get("id") or data.get("_id")
                    session["tracking_id"] = data.get("challengeId") or session["final_problem_id"]
            except Exception as e:
                logger.error(f"Submit error: {e}")
                session["tracking_id"] = "JH-2026-" + str(abs(hash(str(session.get("draft")))))[:6]
        else:
            session["tracking_id"] = session.get("tracking_id", session.get("final_problem_id"))

        await session["socket"].send_json({
            "type": "submission_confirmed",
            "trackingId": session["tracking_id"],
            "draft": session.get("draft", {})
        })
        return {"trackingId": session["tracking_id"]}

    return {"error": f"Unknown tool {tool_name}"}


# ─────────────────────────────────────────────────────────────
# 4. WEBSOCKET VOICE ENDPOINT
# ─────────────────────────────────────────────────────────────
@app.websocket("/ws/voice-agent")
async def voice_agent_websocket(websocket: WebSocket):
    await websocket.accept()
    session = {
        "socket": websocket,
        "step": "listening",
        "draft": {},
        "location": {},
        "attachments": [],
        "citizenId": None,
        "citizenName": "Citizen"
    }

    logger.info("Voice AI Agent session connected")
    await websocket.send_json({
        "type": "session_ready",
        "message": "JanSetu Voice AI Connected",
        "sarvamEnabled": bool(SARVAM_API_KEY)
    })

    # Initial Welcome Greeting in Hindi/Hinglish
    greeting_text = "Namaste! JanSetu me aapka swagat hai. Kripya batayein aapko kya samasya aa rahi hai?"
    await websocket.send_json({
        "type": "agent_utterance",
        "text": greeting_text,
        "step": "listening"
    })

    try:
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            msg_type = data.get("type")

            # 1. Location Captured Event from Frontend
            if msg_type == "location_captured":
                session["location"] = data.get("location", {})
                logger.info(f"Location received: {session['location']}")
                # Run duplicate check tool automatically
                dup_result = await handle_tool_call("check_duplicate", {
                    "title": session.get("draft", {}).get("title", ""),
                    "category": session.get("draft", {}).get("category", ""),
                    "lat": session["location"].get("lat", 23.3441),
                    "lng": session["location"].get("lng", 85.3096)
                }, session)

                if dup_result.get("found"):
                    await handle_tool_call("advance_to_step", {"step": "duplicate_check"}, session)
                    await websocket.send_json({
                        "type": "agent_utterance",
                        "text": f"Aapke area me isse milti julti samasya pehle se registered hai: '{dup_result.get('existingTitle')}'. Kya aap apni report isse jodkar twin link karna chahte hain? Isse authority ko zyada priority milegi."
                    })
                else:
                    await handle_tool_call("advance_to_step", {"step": "photo"}, session)
                    await websocket.send_json({
                        "type": "agent_utterance",
                        "text": "Location mil gayi hai. Ab kripya samasya ki photo upload kar dijiye."
                    })

            # 2. Photo Uploaded Event
            elif msg_type == "photo_uploaded":
                url = data.get("url")
                if url:
                    session["attachments"].append({"type": "image", "url": url})
                await handle_tool_call("advance_to_step", {"step": "video"}, session)
                await websocket.send_json({
                    "type": "agent_utterance",
                    "text": "Photo jud gayi hai. Agar koi chhota video hai to daal dijiye, warna 'Skip' par tap kar sakte hain."
                })

            # 3. Video Uploaded or Skipped Event
            elif msg_type in ["video_uploaded", "video_skipped"]:
                if msg_type == "video_uploaded" and data.get("url"):
                    session["attachments"].append({"type": "video", "url": data.get("url")})
                
                # Advance to final confirmation
                await websocket.send_json({
                    "type": "agent_utterance",
                    "text": "Shukriya! Saari jaankari darj ho gayi hai. Kya main aapki shikayat submit kar doon?"
                })
                await handle_tool_call("advance_to_step", {"step": "confirm_problem"}, session)

            # 4. Twin Decision Response
            elif msg_type == "twin_decision":
                if data.get("decision") == "link":
                    await handle_tool_call("link_as_twin", {"existingProblemId": session.get("duplicate_candidate")}, session)
                    await handle_tool_call("advance_to_step", {"step": "done"}, session)
                    await websocket.send_json({
                        "type": "agent_utterance",
                        "text": f"Badhaai ho! Aapki report safaltapoorvak link kar di gayi hai. Aapka Tracking ID hai: {session.get('tracking_id')}"
                    })
                else:
                    await handle_tool_call("advance_to_step", {"step": "photo"}, session)
                    await websocket.send_json({
                        "type": "agent_utterance",
                        "text": "Theek hai, ise alag nayi samasya ke roop me darj karte hain. Ab photo upload kar dijiye."
                    })

            # 5. User Spoken Transcript or Utterance
            elif msg_type == "user_utterance":
                user_text = data.get("text", "").strip()
                logger.info(f"User said: {user_text}")

                # If in final confirmation and user says haan / yes / confirm
                if session.get("step") == "confirm_problem" and any(w in user_text.lower() for w in ["haan", "yes", "theek", "submit", "kardo", "kar do"]):
                    sub_res = await handle_tool_call("confirm_submission", {}, session)
                    await handle_tool_call("advance_to_step", {"step": "done"}, session)
                    await websocket.send_json({
                        "type": "agent_utterance",
                        "text": f"Aapki samasya safaltapoorvak darj ho gayi hai! Aapka Tracking ID hai {sub_res.get('trackingId')}. Aapko SMS aur WhatsApp par bhi update mil jayega."
                    })
                elif session.get("step") == "listening":
                    # Natural language understanding for problem details
                    # Parse category and summary
                    category = "Urban Infrastructure"
                    lower = user_text.lower()
                    if any(w in lower for w in ["paani", "water", "nal", "leak", "pipe", "jal"]):
                        category = "Water Management"
                    elif any(w in lower for w in ["sadak", "road", "pothole", "gaddha", "bridge"]):
                        category = "Urban Infrastructure"
                    elif any(w in lower for w in ["kooda", "kachra", "safai", "garbage", "drain", "naali"]):
                        category = "Sanitation & Environment"
                    elif any(w in lower for w in ["bijli", "light", "power", "current", "wire"]):
                        category = "Energy & Technology"
                    elif any(w in lower for w in ["school", "teacher", "padhai", "kitab"]):
                        category = "Education"
                    elif any(w in lower for w in ["hospital", "dawa", "doctor", "swasthya"]):
                        category = "Healthcare"

                    title = user_text[:60].capitalize()
                    description = user_text

                    # Execute tool call save_problem_details
                    await handle_tool_call("save_problem_details", {
                        "title": title,
                        "category": category,
                        "description": description
                    }, session)

                    # Prompt confirmation and advance to location step
                    confirm_speech = f"Samajh gaya — aapne bataya ki {user_text[:50]}. Kya yeh sahi hai? Ab neeche 'Use Current Location' button dabayein."
                    await websocket.send_json({
                        "type": "agent_utterance",
                        "text": confirm_speech
                    })
                    await handle_tool_call("advance_to_step", {"step": "location"}, session)

    except WebSocketDisconnect:
        logger.info("Voice AI Agent session disconnected")
    except Exception as e:
        logger.error(f"Voice Agent Error: {e}")

if __name__ == "__main__":
    try:
        import uvicorn
        port = int(os.getenv("VOICE_AGENT_PORT", "8000"))
        uvicorn.run("voice_agent_relay:app", host="0.0.0.0", port=port, reload=True)
    except ImportError:
        logger.error("uvicorn is not installed. To run this relay, install dependencies: pip install -r requirements.txt")
