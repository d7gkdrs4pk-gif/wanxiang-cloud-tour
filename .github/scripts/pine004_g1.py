"""PINE-004: one geometry-only Tripo experiment, with on-repo idempotency lock."""
import os, json, time, pathlib, urllib.request, struct, hashlib, subprocess
p = pathlib.Path("fengming-v2-scene-a/assets/pine-004")
source_id = "64578e00-ce8f-475b-ab01-d899a3b82dad"
key = os.environ.get("TRIPO_API_KEY")
if not key:
    raise SystemExit("Tripo secret unavailable; no charge")
if any((p/x).exists() for x in ("g1-lock.json", "g1-task.json", "geometry.glb")):
    raise SystemExit("G1 already reserved or created; do not resubmit")
old = json.loads((p/"multiview.json").read_text())
if old.get("task_id") != source_id or old.get("status") != "G0_conditionally_suitable_for_geometry_only":
    raise SystemExit("Source G0 review mismatch; no charge")
def api(route, data=None):
    request = urllib.request.Request(
        "https://openapi.tripo3d.com/v3"+route,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
    with urllib.request.urlopen(request, timeout=60) as r:
        value = json.load(r)
    if value.get("code") != 0:
        raise RuntimeError("Tripo returned nonzero response code; no automatic paid retries")
    return value["data"]
source = api("/tasks/"+source_id)
if source.get("status") != "success" or source.get("type") != "image_to_multiview":
    raise SystemExit("Source four-view task is not ready")
balance = float(api("/account/balance").get("balance", 0))
print("Available credits before test:", balance, flush=True)
if balance < 30:
    raise SystemExit("Insufficient credits; no charge")
config = {
    "inputs":[{"task_id":source_id}], "model":"v3.1-20260211",
    "texture":False, "pbr":False, "geometry_quality":"standard",
    "face_limit":50000, "generate_parts":False,
    "smart_low_poly":False, "model_seed":20261126
}
def save(paths, message):
    subprocess.run(["git", "add"]+[str(x) for x in paths], check=True)
    subprocess.run(["git", "commit", "-m", message], check=True)
    subprocess.run(["git", "pull", "--rebase", "origin", "main"], check=True)
    subprocess.run(["git", "push", "origin", "HEAD:main"], check=True)
subprocess.run(["git","config","user.name","github-actions"],check=True)
subprocess.run(["git","config","user.email","github-actions@github.com"],check=True)
lock = p/"g1-lock.json"
lock.write_text(json.dumps({
    "phase":"G1", "source_task":source_id,
    "one_shot":True, "expected_credits":20,
    "request":config,
    "workflow_run":os.environ.get("GITHUB_RUN_ID"),
    "status":"locked_before_paid_request"}, indent=2)+"\n")
save([lock], "PINE-004 reserve one geometry-only paid task")
task = api("/generation/multiview-to-model", config)
task_id = task.get("task_id")
if not isinstance(task_id, str) or len(task_id)<12:
    raise SystemExit("Unknown paid request result; do not resubmit")
record = p/"g1-task.json"
record.write_text(json.dumps({
    "task_id":task_id, "source_task":source_id,
    "status":"submitted", "g1_visual_review":"pending"}, indent=2)+"\n")
save([record], "Persist PINE-004 geometry task ID")
print("G1 task ID:", task_id, flush=True)
for n in range(195):
    info = api("/tasks/"+task_id)
    state = info.get("status")
    if n%8==0 or state in ("success","failed","cancelled","expired"):
        print("G1 status:", state, info.get("progress"), flush=True)
    if state == "success":break
    if state in ("failed","cancelled","canceled","expired"):
        raise SystemExit("G1 task ended; no resubmission")
    time.sleep(6)
else:
    raise SystemExit("Polling timed out; stored task ID for later read-only recovery")
url = (info.get("output") or {}).get("model_url")
if not isinstance(url, str) or not url.startswith("https://"):
    raise SystemExit("Missing GLB download URL")
with urllib.request.urlopen(url, timeout=120) as r:
    blob = r.read(65*1024*1024+1)
if not 64<len(blob)<65*1024*1024 or blob[:4]!=b"glTF" or struct.unpack_from("<I",blob,8)[0]!=len(blob):
    raise SystemExit("Invalid GLB")
length,typ=struct.unpack_from("<I4s",blob,12)
if typ!=b"JSON" or length>len(blob)-20:
    raise SystemExit("Invalid GLB JSON chunk")
document=json.loads(blob[20:20+length].decode("utf8").rstrip(" \x00"))
meshes=document.get("meshes",[])
if not meshes:raise SystemExit("No mesh data in GLB")
accessors=document.get("accessors",[])
triangles=0
for mesh in meshes:
    for part in mesh.get("primitives",[]):
        idx=part.get("indices")
        if part.get("mode",4)==4 and isinstance(idx,int) and idx<len(accessors):
            triangles += int(accessors[idx].get("count",0))//3
glb=p/"geometry.glb"
glb.write_bytes(blob)
meta=p/"g1-metadata.json"
meta.write_text(json.dumps({
    "source_task":source_id,"task_id":task_id,
    "status":"technical_passed_G1_visual_pending",
    "credits_consumed":info.get("credits_consumed"),
    "bytes":len(blob),"sha256":hashlib.sha256(blob).hexdigest(),
    "mesh_count":len(meshes),"triangles":triangles,
    "textures":len(document.get("textures",[])),
    "trunk_continuity":"needs_four_view_visual_review",
    "canopy_separation":"needs_four_view_visual_review",
    "game_integration":"not_started"
},indent=2)+"\n")
record.write_text(json.dumps({
    "task_id":task_id,"source_task":source_id,
    "status":"technical_passed_G1_visual_pending",
    "credits_consumed":info.get("credits_consumed")}, indent=2)+"\n")
save([glb,meta,record], "Save PINE-004 untextured GLB for G1 silhouette QA")
