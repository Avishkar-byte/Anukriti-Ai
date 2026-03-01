"""
LLM-powered 3D Device Model Generator.
Takes architecture graph → asks LLM to design a 3D layout → returns structured JSON.
"""

import json
import os
import time
import requests
import hashlib
import threading
from typing import Any, Dict, List

MESHY_API_KEY = os.getenv("MESHY_API_KEY", "")
MESHY_BASE_URL = "https://api.meshy.ai/openapi/v2/text-to-3d"

MODEL_3D_PROMPT = """You are an expert prompt engineer specializing in text-to-3D generation via Meshy AI.

Convert this medical device architecture into a highly detailed, rich visual prompt for a text-to-3D modeler.

Your output must be a SINGLE SENTENCE PROMPT, no more than 300 characters.
Include descriptive terms for high quality (e.g., "highly detailed, 4k resolution, sleek industrial design, photorealistic, cinematic lighting").

Example input: A device that has a battery, display, and tubing
Example output: A photorealistic, highly detailed 3D model of a medical infusion pump, featuring a sleek modern white plastic housing, a bright glowing digital display, integrated lithium battery pack, and translucent medical-grade IV tubing connected to the side, cinematic lighting, 8k resolution.

Respond ONLY with the precise 3D model generation prompt, no other text."""

class DeviceModelGenerator:
    def __init__(self):
        self.llm_enabled = False
        api_key = os.getenv("GROQ_API_KEY")
        model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

        if api_key and api_key != "your_groq_api_key_here":
            try:
                from groq import Groq
                self.client = Groq(api_key=api_key)
                self.model = model_name
                self.llm_enabled = True
                print("[3DModelGen] LLM wrapper for Meshy AI text prompt ready")
            except Exception as e:
                print("[3DModelGen] LLM init failed: %s" % e)

        if not MESHY_API_KEY:
            print("[3DModelGen] MESHY_API_KEY is not set.")
        else:
            print("[3DModelGen] Meshy API Key loaded")
            
        self.cache_file = "mesh_cache.json"
        self.cache = self._load_cache()
        self.active_tasks = {}

    def _load_cache(self) -> Dict:
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[3DModelGen] Failed to load cache: {e}")
        return {}

    def _save_cache(self):
        try:
            with open(self.cache_file, "w") as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            print(f"[3DModelGen] Failed to save cache: {e}")

    def _get_cache_key(self, device_name: str, components: List[Dict], edges: List[Dict]) -> str:
        data = {"device_name": device_name, "components": components, "edges": edges}
        return hashlib.md5(json.dumps(data, sort_keys=True).encode("utf-8")).hexdigest()

    def generate(
        self, device_name: str, components: List[Dict], edges: List[Dict]
    ) -> Dict[str, Any]:
        """Generate 3D model using Meshy AI in a non-blocking way."""
        if not self.llm_enabled or not MESHY_API_KEY:
            return {"device_name": device_name, "mesh_url": None, "error": "LLM or Meshy API key missing"}

        # Check Cache
        cache_key = self._get_cache_key(device_name, components, edges)
        if cache_key in self.cache:
            if self.cache[cache_key].get("status") == "failed":
                return self.cache.pop(cache_key) # Allow retry
            print(f"[3DModelGen] ⚡ Cache hit! Returning saved mesh for {device_name}")
            return self.cache[cache_key]

        # Check Active Tasks
        if cache_key in self.active_tasks:
            return {"status": "processing", "device_name": device_name}
            
        self.active_tasks[cache_key] = True

        def worker():
            try:
                result = self._run_meshy_pipeline(device_name, components, edges, cache_key)
                if result:
                    self.cache[cache_key] = result
                    self._save_cache()
            except Exception as e:
                self.cache[cache_key] = {"error": str(e), "status": "failed"}
                self._save_cache()
            finally:
                self.active_tasks.pop(cache_key, None)

        thread = threading.Thread(target=worker)
        thread.start()

        return {"status": "processing", "device_name": device_name}

    def _run_meshy_pipeline(
        self, device_name: str, components: List[Dict], edges: List[Dict], cache_key: str
    ) -> Dict[str, Any]:
        prompt = self._generate_prompt_with_llm(device_name, components, edges)
        print(f"[3DModelGen] Submitting to Meshy AI with prompt: '{prompt}'")
        
        headers = {
            "Authorization": f"Bearer {MESHY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Step 1: Create Task
        payload = {
            "mode": "preview", # Use preview for faster testing, change to 'high' for production
            "prompt": prompt,
            "art_style": "realistic",
            "should_remesh": True
        }
        
        try:
            response = requests.post(MESHY_BASE_URL, headers=headers, json=payload, timeout=30)
            if response.status_code not in [200, 202]:
                print(f"[3DModelGen] Meshy API Error: {response.text}")
                return {"device_name": device_name, "mesh_url": None, "error": f"Meshy Error: {response.text}", "status": "failed"}
                
            task_id = response.json().get("result")
            print(f"[3DModelGen] Task created: {task_id}. Polling for completion...")
            
            # Step 2: Poll Task Status
            max_attempts = 100 # 5 minutes max
            for attempt in range(max_attempts):
                time.sleep(3)
                
                try:
                    poll_res = requests.get(f"{MESHY_BASE_URL}/{task_id}", headers=headers, timeout=20)
                    if poll_res.status_code != 200:
                        continue
                        
                    task_data = poll_res.json()
                except Exception as e:
                    print(f"[3DModelGen] ⚠️ Poll request failed: {e}. Retrying...")
                    continue
                    
                status = task_data.get("status")
                
                if status == "SUCCEEDED":
                    model_urls = task_data.get("model_urls", {})
                    # Prefer GLB, fallback to OBJ if available
                    mesh_url = model_urls.get("glb") or model_urls.get("obj")
                    
                    if not mesh_url:
                        return {"device_name": device_name, "mesh_url": None, "error": "No model URL returned", "status": "failed"}
                        
                    print(f"[3DModelGen] Meshy generation complete! URL: {mesh_url}")
                    
                    # --- FIX CORS ERROR: Download mesh locally & Host via FastAPI ---
                    ext = "glb" if "glb" in model_urls else "obj"
                    local_filename = f"meshy_{task_id}.{ext}"
                    local_path = os.path.join("static", local_filename)
                    
                    try:
                        print(f"[3DModelGen] Downloading mesh to {local_path} to avoid CORS...")
                        dl_res = requests.get(mesh_url, timeout=30)
                        if dl_res.status_code == 200:
                            os.makedirs("static", exist_ok=True)
                            with open(local_path, "wb") as f:
                                f.write(dl_res.content)
                            base_url = os.getenv("API_URL", "http://localhost:8000").rstrip("/")
                            mesh_url = f"{base_url}/static/{local_filename}"
                            print(f"[3DModelGen] Mesh hosted locally at: {mesh_url}")
                        else:
                            print(f"[3DModelGen] Failed to download mesh: HTTP {dl_res.status_code}")
                    except Exception as e:
                        print(f"[3DModelGen] Failed to download mesh: {e}")
                    # ----------------------------------------------------------------
                    
                    result = {
                        "device_name": device_name,
                        "mesh_url": mesh_url,
                        "prompt_used": prompt,
                        "format": ext,
                        "status": "completed"
                    }
                    return result
                elif status in ["FAILED", "EXPIRED"]:
                    print(f"[3DModelGen] Meshy task failed: {task_data.get('task_error')}")
                    return {"device_name": device_name, "mesh_url": None, "error": f"Task Failed: {task_data.get('task_error')}", "status": "failed"}
                else:
                    # PENDING or IN_PROGRESS
                    if attempt % 5 == 0:
                        print(f"[3DModelGen] Polling ({attempt}/{max_attempts})... Status: {status} ({task_data.get('progress', 0)}%)")
                        
            print("[3DModelGen] Timeout waiting for Meshy API")
            return {"device_name": device_name, "mesh_url": None, "error": "Polling timeout", "status": "failed"}
            
        except Exception as e:
            print(f"[3DModelGen] Network Error: {e}")
            return {"device_name": device_name, "mesh_url": None, "error": str(e), "status": "failed"}

    def _generate_prompt_with_llm(
        self, device_name: str, components: List[Dict], edges: List[Dict]
    ) -> str:
        try:
            comp_text = "\n".join(
                [
                    "- %s (type: %s, properties: %s)"
                    % (
                        c.get("label", c.get("id", "?")),
                        c.get("type", "Component"),
                        json.dumps(c.get("properties", {})),
                    )
                    for c in components
                ]
            )

            edge_text = "\n".join(
                [
                    "- %s → %s (relation: %s)"
                    % (
                        e.get("source", ""),
                        e.get("target", ""),
                        e.get("relation", "connected_to"),
                    )
                    for e in edges[:20]  # Limit to prevent token overflow
                ]
            )

            prompt = """Device: %s

Architecture Components:
%s

Generate a concise 1-sentence prompt describing what this device should look like in a 3D model generator.""" % (
                device_name,
                comp_text,
            )

            print("[3DModelGen] Calling LLM for prompt generation...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": MODEL_3D_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=200,
            )

            raw = response.choices[0].message.content.strip()
            print(f"[3DModelGen] LLM prompt generated: {raw}")
            return raw

        except Exception as e:
            print("[3DModelGen] LLM error: %s - using fallback" % e)
            return f"A realistic 3D model of a {device_name}"
