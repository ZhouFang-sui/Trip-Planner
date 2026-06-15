from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Initialize the new Google GenAI client
client = None
if os.getenv("GEMINI_API_KEY"):
    try:
        client = genai.Client()
    except Exception as e:
        print(f"Error initializing Google GenAI Client: {e}")

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str, sender: WebSocket):
        for connection in self.active_connections:
            if connection != sender:
                try:
                    await connection.send_text(message)
                except:
                    pass

manager = ConnectionManager()

# Allow CORS so the Next.js frontend can make requests to this API
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Waypoint(BaseModel):
    id: str
    lat: float
    lng: float
    name: str

class RouteRequest(BaseModel):
    waypoints: List[Waypoint]
    distance: str
    duration: str

@app.get("/")
def read_root():
    return {"message": "Welcome to the Trip Planner Data Analysis API"}

@app.post("/api/analyze-route")
def analyze_route(route: RouteRequest):
    """
    Here you can write all your advanced Python Data Analysis logic!
    Use pandas, numpy, scikit-learn, etc.
    """
    import re
    
    # Safely extract numeric distance
    match = re.search(r'[\d\.]+', route.distance)
    distance_val = float(match.group()) if match else 0.0
    
    suggestions = []
    
    # Example 1: Basic logic
    if distance_val > 100:
        suggestions.append(f"🚗 Data Analysis shows a {distance_val}km route. Recommend scheduling stops.")
    
    # Example 2: Using numpy for coordinate analysis
    lats = [wp.lat for wp in route.waypoints]
    lngs = [wp.lng for wp in route.waypoints]
    
    center_lat = np.mean(lats)
    center_lng = np.mean(lngs)
    
    suggestions.append(f"📊 The geographic center of your trip is at ({center_lat:.2f}, {center_lng:.2f}).")
    suggestions.append("🐍 These insights were calculated using Python & Numpy!")
    
    # Mock Area Information
    area_info = {
        "climate": "Sunny and mild",
        "popular_activities": ["Sightseeing", "Local Dining", "Museums"],
        "safety_rating": "High",
        "description": f"The region spanning from ({lats[0]:.2f}, {lngs[0]:.2f}) to ({lats[-1]:.2f}, {lngs[-1]:.2f}) is known for its beautiful scenery and vibrant culture."
    }
    
    return {
        "suggestions": suggestions,
        "center": {"lat": center_lat, "lng": center_lng},
        "total_points": len(route.waypoints),
        "area_info": area_info
    }

class OptimizeRequest(BaseModel):
    waypoints: List[Waypoint]

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math
    # Radius of the Earth in km
    R = 6371.0
    
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

@app.post("/api/optimize-route")
def optimize_route(req: OptimizeRequest):
    waypoints = req.waypoints
    if len(waypoints) <= 2:
        return {"waypoints": waypoints}
        
    start = waypoints[0]
    others = waypoints[1:]
    n = len(others)
    
    best_order = None
    min_dist = float('inf')
    
    import itertools
    
    # Exact TSP search for small N (N-1 <= 8, meaning <= 9 total points)
    if n <= 8:
        for perm in itertools.permutations(others):
            dist = 0
            curr = start
            for wp in perm:
                dist += haversine_distance(curr.lat, curr.lng, wp.lat, wp.lng)
                curr = wp
            if dist < min_dist:
                min_dist = dist
                best_order = perm
        optimized = [start] + list(best_order)
    else:
        # Nearest neighbor heuristic for larger N
        unvisited = list(others)
        curr = start
        optimized = [start]
        while unvisited:
            nearest = min(unvisited, key=lambda wp: haversine_distance(curr.lat, curr.lng, wp.lat, wp.lng))
            optimized.append(nearest)
            unvisited.remove(nearest)
            curr = nearest
            
        # 2-opt refinement for nearest neighbor route
        improved = True
        while improved:
            improved = False
            for i in range(1, len(optimized) - 2):
                for j in range(i + 1, len(optimized)):
                    if j - i == 1: continue
                    new_path = optimized[:i] + list(reversed(optimized[i:j])) + optimized[j:]
                    
                    old_dist = haversine_distance(optimized[i-1].lat, optimized[i-1].lng, optimized[i].lat, optimized[i].lng)
                    new_dist = haversine_distance(optimized[i-1].lat, optimized[i-1].lng, optimized[j-1].lat, optimized[j-1].lng)
                    
                    if j < len(optimized):
                        old_dist += haversine_distance(optimized[j-1].lat, optimized[j-1].lng, optimized[j].lat, optimized[j].lng)
                        new_dist += haversine_distance(optimized[i].lat, optimized[i].lng, optimized[j].lat, optimized[j].lng)
                    
                    if new_dist < old_dist:
                        optimized = new_path
                        improved = True
                        break
                if improved: break
                
    return {"waypoints": optimized}

class PlaceRequest(BaseModel):
    place_name: str

@app.post("/api/place-info")
async def get_place_info(req: PlaceRequest):
    # Normalize 臺 to 台 for Taiwan places
    name = req.place_name.replace('臺', '台')
    enc = name.replace(' ', '+')

    # Build real external ticket/booking links for the place
    import random
    
    booking_links = [
        {
            "label": "🎟️ Viator",
            "url": f"https://www.viator.com/searchResults/all?text={enc}",
            "color": "#00A86B",
        },
        {
            "label": "🌏 Klook",
            "url": f"https://www.klook.com/en-US/search/?query={enc}",
            "color": "#FF5722",
        },
        {
            "label": "🎫 GetYourGuide",
            "url": f"https://www.getyourguide.com/s/?q={enc}",
            "color": "#FF8000",
        },
        {
            "label": "🗺️ Musement",
            "url": f"https://www.musement.com/us/search/#text={enc}",
            "color": "#2196F3",
        },
    ]

    import urllib.request
    import urllib.parse
    import json
    
    description = f"{name} is a popular destination. Click a link above to browse tickets, tours, and experiences."
    ai_introduction = f"🤖 AI Insight: {name} is considered a top destination in the region. It is highly recommended for travelers seeking a mix of cultural immersion and breathtaking sights."
    famous_view = f"📸 Famous View: Don't miss the panoramic view from the central area at {name}, best seen during sunset or early morning!"
    
    # Try calling Google GenAI API if client is available
    if os.getenv("GEMINI_API_KEY") and client:
        import asyncio
        models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        prompt = (
            f"Generate travel insights for the destination: \"{name}\".\n"
            "Provide the response in raw JSON format with the following keys:\n"
            "{\n"
            "  \"description\": \"A brief 1-2 sentence description of this place.\",\n"
            "  \"ai_introduction\": \"An engaging introduction explaining why it is famous, its historical or cultural significance, and what makes it special.\",\n"
            "  \"famous_view\": \"What are the absolute must-see attractions, views, or experiences there, and why it is famous.\"\n"
            "}\n"
            "Ensure the values are highly specific to \"{name}\" and extremely accurate. Return ONLY valid JSON."
        )
        
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        'response_mime_type': 'application/json',
                    }
                )
                if response and response.text:
                    parsed = json.loads(response.text.strip())
                    description = parsed.get("description", description)
                    ai_introduction = parsed.get("ai_introduction", ai_introduction)
                    famous_view = parsed.get("famous_view", famous_view)
                    
                    # Add prefixes if missing
                    if not ai_introduction.startswith("🤖"):
                        ai_introduction = f"🤖 AI Insight: {ai_introduction}"
                    if not famous_view.startswith("📸"):
                        famous_view = f"📸 Must See: {famous_view}"
                    break
            except Exception as e:
                print(f"Error calling model '{model}' for place info: {e}")
                
    # Fallback to Wikipedia summary if Gemini was not used or failed
    if not ai_introduction.startswith("🤖 AI Insight: ") or ai_introduction.endswith("breathtaking sights."):
        try:
            wiki_name = name.replace(' ', '_')
            url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(wiki_name)}"
            req_wiki = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_wiki) as response:
                data = json.loads(response.read().decode('utf-8'))
                if 'extract' in data:
                    ai_introduction = f"🤖 AI Insight: {data['extract']}"
                    description = data.get('description', description)
                    if 'thumbnail' in data or 'description' in data:
                        famous_view = f"📸 Fun Fact: {name} is widely recognized. {data.get('description', '')}"
        except Exception as e:
            print(f"Wikipedia fallback failed for {name}: {e}")
            # Robust dynamic rule-based mock if even Wikipedia fails
            ai_introduction = f"🤖 AI Insight: {name} is an amazing destination that captures travelers' hearts with its unique architectural elements, local culture, and dynamic history. It is highly recommended to explore its historic spots."
            famous_view = f"📸 Must See: When visiting {name}, make sure to take in the principal viewpoints and capture its charm during sunset. Be sure to explore local dining nearby!"
            description = f"{name} is a highly recommended and wonderful place to visit, offering rich sightseeing opportunities."

    return {
        "name": name,
        "address": f"Search '{name}' on Google Maps for exact address",
        "open_time": "Check official website for current hours",
        "booking_links": booking_links,
        "description": description,
        "rating": "See reviews on Google Maps or TripAdvisor",
        "ai_introduction": ai_introduction,
        "famous_view": famous_view
    }

class ChatMessage(BaseModel):
    message: str
    context: List[Waypoint]

def get_mock_response(message: str, is_overloaded: bool = False) -> str:
    offline_prefix = "⚠️ *The AI servers are currently experiencing extremely high demand. I've switched to a high-speed offline mode to assist you immediately!*\n\n" if is_overloaded else ""
    
    msg = message.lower()
    if "recommend" in msg or "place" in msg or "where" in msg:
        local_resp = "Based on your current route, I recommend checking out local historical museums or the downtown central park area. Would you like me to add them to your map? 🗺️"
    elif "document" in msg or "passport" in msg:
        local_resp = "I found 2 related documents in your Workspace:\n📄 Passport Copy (PDF)\n🏨 Hotel Booking Confirmation (PDF)\nYou can view them in the Documents tab."
    elif "flight" in msg or "ticket" in msg:
        local_resp = "I noticed you haven't booked a flight yet. Check the Flights tab for the latest deals! ✈️"
    else:
        local_resp = f"That's an interesting question! 🤔 You asked: '{message}'."
        if not is_overloaded:
            local_resp += " (Note: Add a GEMINI_API_KEY in the python_backend/.env to unlock real AI responses!)"
            
    return f"{offline_prefix}{local_resp}"

@app.post("/api/chat")
async def ai_chat(req: ChatMessage):
    waypoints_text = ", ".join([wp.name for wp in req.context]) if req.context else "No waypoints added yet."
    system_prompt = f"You are a helpful travel assistant. The user's current trip waypoints are: {waypoints_text}. Answer their travel questions intelligently. Keep it concise."
    
    if os.getenv("GEMINI_API_KEY") and client:
        import asyncio
        models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        
        for model in models_to_try:
            retries = 2
            delay = 0.5  # start with 500ms
            for attempt in range(retries + 1):
                try:
                    response = client.models.generate_content(
                        model=model,
                        contents=f"{system_prompt}\nUser: {req.message}"
                    )
                    if response and response.text:
                        return {"response": response.text}
                except Exception as e:
                    print(f"Error calling model '{model}' on attempt {attempt + 1}: {e}")
                    if attempt < retries:
                        await asyncio.sleep(delay)
                        delay *= 2  # exponential backoff
                    else:
                        break  # move to next model
        
        # If all API calls failed, fallback to local/offline response with a warning note
        return {"response": get_mock_response(req.message, is_overloaded=True)}
    else:
        # Fallback Mock AI when no API key is present
        return {"response": get_mock_response(req.message, is_overloaded=False)}

@app.websocket("/ws/trip/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast the received data (like cursor position or state changes) to everyone else
            await manager.broadcast(data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
