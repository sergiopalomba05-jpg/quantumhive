"""
Run InfiniteTalk test via ComfyUI API
Uses the UI-format workflow directly
"""
import json
import time
import urllib.request
import urllib.parse
import uuid
import os
import sys
import glob

COMFYUI_URL = "http://localhost:8188"
UPLOAD_DIR = r"C:\Users\sergio\Desktop\boveda-obsidian\AVATARES VIDEOS"
WORKFLOW_FILE = os.path.join(UPLOAD_DIR, "workflows", "official_infinitetalk.json")

def upload_image(filename, filepath):
    """Upload an image to ComfyUI"""
    import mimetypes
    
    boundary = str(uuid.uuid4())
    file_data = open(filepath, 'rb').read()
    mime_type = mimetypes.guess_type(filepath)[0] or 'application/octet-stream'
    
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f'Content-Type: {mime_type}\r\n\r\n'
    ).encode() + file_data + f'\r\n--{boundary}--\r\n'.encode()
    
    req = urllib.request.Request(
        f"{COMFYUI_URL}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    response = urllib.request.urlopen(req)
    return json.loads(response.read())

def upload_audio(filename, filepath):
    """Upload an audio file to ComfyUI (via /upload/image endpoint)"""
    import mimetypes
    
    boundary = str(uuid.uuid4())
    file_data = open(filepath, 'rb').read()
    mime_type = mimetypes.guess_type(filepath)[0] or 'audio/mpeg'
    
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f'Content-Type: {mime_type}\r\n\r\n'
    ).encode() + file_data + f'\r\n--{boundary}--\r\n'.encode()
    
    req = urllib.request.Request(
        f"{COMFYUI_URL}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    response = urllib.request.urlopen(req)
    return json.loads(response.read())

def convert_ui_to_api(ui_workflow):
    """Convert UI format workflow to API format"""
    api = {}
    
    # Build link map: link_id -> (source_node_id, source_output_index)
    link_map = {}
    for link in ui_workflow.get("links", []):
        link_id, from_node, from_slot = link[0], link[1], link[2]
        link_map[link_id] = (str(from_node), from_slot)
    
    # First pass: build reroute map (Reroute nodes just pass through)
    reroute_map = {}  # reroute_node_id -> (source_node_id, source_slot)
    for node in ui_workflow.get("nodes", []):
        if node["type"] == "Reroute":
            reroute_id = str(node["id"])
            for inp in node.get("inputs", []):
                if inp.get("link") is not None and inp["link"] in link_map:
                    source_node, source_slot = link_map[inp["link"]]
                    reroute_map[reroute_id] = (source_node, source_slot)
    
    def resolve_reroute(node_id, slot):
        """Follow reroute chain to get actual source"""
        current = node_id
        current_slot = slot
        visited = set()
        while current in reroute_map and current not in visited:
            visited.add(current)
            current, current_slot = reroute_map[current]
        return current, current_slot
    
    for node in ui_workflow.get("nodes", []):
        node_id = str(node["id"])
        class_type = node["type"]
        
        # Skip Reroute and Primitive nodes
        if class_type in ("Reroute", "PrimitiveInt", "MarkdownNote"):
            continue
        
        inputs = {}
        
        # Static values from widgets
        if node.get("widgets_values"):
            try:
                info_resp = urllib.request.urlopen(f"{COMFYUI_URL}/object_info/{class_type}", timeout=5)
                info = json.loads(info_resp.read())
                node_class = info.get(class_type, {})
                
                all_input_names = []
                for section in ["required", "optional"]:
                    if section in node_class.get("input", {}):
                        all_input_names.extend(node_class["input"][section].keys())
                
                for i, val in enumerate(node["widgets_values"]):
                    if i < len(all_input_names):
                        inputs[all_input_names[i]] = val
            except:
                pass
        
        # Linked inputs
        for inp in node.get("inputs", []):
            if inp.get("link") is not None and inp["link"] in link_map:
                source_node, source_slot = link_map[inp["link"]]
                # Follow reroute nodes
                actual_node, actual_slot = resolve_reroute(source_node, source_slot)
                inputs[inp["name"]] = [actual_node, actual_slot]
        
        api[node_id] = {
            "class_type": class_type,
            "inputs": inputs
        }
    
    return api

def queue_prompt(api_workflow, client_id=None):
    """Submit workflow to ComfyUI"""
    if not client_id:
        client_id = str(uuid.uuid4())
    
    prompt = {
        "prompt": api_workflow,
        "client_id": client_id
    }
    data = json.dumps(prompt).encode('utf-8')
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    response = urllib.request.urlopen(req)
    return json.loads(response.read())

def main():
    print("=== InfiniteTalk Test ===")
    
    # Check ComfyUI
    try:
        urllib.request.urlopen(f"{COMFYUI_URL}/system_stats", timeout=5)
        print("ComfyUI: OK")
    except Exception as e:
        print(f"ComfyUI no disponible: {e}")
        sys.exit(1)
    
    # Upload test assets
    print("\nSubiendo assets de prueba...")
    avatar_path = os.path.join(UPLOAD_DIR, "workflows", "avatar_test.png")
    audio_path = os.path.join(UPLOAD_DIR, "workflows", "test_audio.mp3")
    
    if os.path.exists(avatar_path):
        result = upload_image("avatar_test.png", avatar_path)
        print(f"  Avatar: {result}")
    else:
        print(f"  Avatar no encontrado: {avatar_path}")
        sys.exit(1)
    
    if os.path.exists(audio_path):
        result = upload_audio("test_audio.mp3", audio_path)
        print(f"  Audio: {result}")
    else:
        print(f"  Audio no encontrado: {audio_path}")
        sys.exit(1)
    
    # Load and convert workflow
    print("\nCargando workflow...")
    with open(WORKFLOW_FILE, 'r', encoding='utf-8') as f:
        ui_workflow = json.load(f)
    
    print(f"  UI workflow: {len(ui_workflow.get('nodes', []))} nodos")
    
    api_workflow = convert_ui_to_api(ui_workflow)
    print(f"  API workflow: {len(api_workflow)} nodos")
    
    # Queue it
    print("\nEnviando a ComfyUI...")
    try:
        result = queue_prompt(api_workflow)
        prompt_id = result["prompt_id"]
        print(f"  Prompt ID: {prompt_id}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  Error {e.code}: {error_body}")
        sys.exit(1)
    
    # Wait for completion
    print("\nEjecutando (esto puede tardar varios minutos)...")
    start_time = time.time()
    max_wait = 900  # 15 minutes
    
    while True:
        elapsed = time.time() - start_time
        if elapsed > max_wait:
            print(f"\nTimeout después de {max_wait}s")
            sys.exit(1)
        
        try:
            history_resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}", timeout=5)
            history = json.loads(history_resp.read())
            
            if prompt_id in history:
                status = history[prompt_id].get("status", {})
                if status.get("completed", False):
                    print(f"\n¡Completado en {elapsed:.1f}s!")
                    outputs = history[prompt_id].get("outputs", {})
                    
                    for node_id, node_output in outputs.items():
                        if "gifs" in node_output:
                            for gif in node_output["gifs"]:
                                filename = gif["filename"]
                                subfolder = gif.get("subfolder", "")
                                print(f"  Video: {subfolder}/{filename}")
                                
                                # Download
                                video_url = f"{COMFYUI_URL}/view?filename={urllib.parse.quote(filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
                                output_path = os.path.join(UPLOAD_DIR, "workflows", filename)
                                urllib.request.urlretrieve(video_url, output_path)
                                print(f"  Guardado: {output_path}")
                        if "images" in node_output:
                            for img in node_output["images"]:
                                filename = img["filename"]
                                print(f"  Imagen: {filename}")
                    break
                
                if status.get("status_str") == "error":
                    print(f"\nError:")
                    for node_id, node_output in outputs.items():
                        if "error" in node_output:
                            print(f"  Node {node_id}: {node_output['error']}")
                    break
        except:
            pass
        
        print(f"  {elapsed:.0f}s...", end="\r")
        time.sleep(3)
    
    print("\n=== Fin ===")

if __name__ == "__main__":
    main()
