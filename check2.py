import subprocess, json

def api(path):
    # Login fresh each time
    login = subprocess.run(
        ["curl", "-s", "-X", "POST", "https://staging.qgocargo.cloud/api/auth/login",
         "-H", "Content-Type: application/json",
         "-d", '{"email":"akifbade46@gmail.com","password":"aaaaaa"}'],
        capture_output=True, text=True
    )
    token = json.loads(login.stdout)["token"]
    r = subprocess.run(
        ["curl", "-s", "https://staging.qgocargo.cloud/api" + path,
         "-H", "Authorization: Bearer " + token],
        capture_output=True, text=True
    )
    return json.loads(r.stdout)

# Check first shipment details
ships = api("/shipments")
s = ships.get("shipments", [])
if s:
    first = s[0]
    print("=== FIRST SHIPMENT ===")
    print("Name:", first.get("name",""))
    print("rackCode:", first.get("rackCode","N/A"))
    print("rackLocation:", first.get("rackLocation","N/A"))
    locs = first.get("rackLocations") or []
    print("rackLocations:", locs)
    dims = first.get("dimensions") or []
    print("dimensions:", len(dims))
    if dims:
        print("  first dim rackCode:", dims[0].get("rackCode","N/A"))
    photos = first.get("shipmentPhotos") or []
    print("photos:", len(photos))
    boxes = first.get("boxes") or []
    print("boxes:", len(boxes))

# Moving job
print("\n=== MOVING JOB ===")
jobs = api("/moving-jobs")
if isinstance(jobs, list) and jobs:
    j = jobs[0]
    print("Keys:", list(j.keys()))
    print("title:", j.get("title","N/A"))
    print("jobNumber:", j.get("jobNumber","N/A"))
    print("status:", j.get("status","N/A"))
    mats = j.get("materials") or []
    print("materials:", len(mats))

# Email routes
r = subprocess.run(
    ["find", "/root/WMS-STAGING/backend/src/routes/", "-name", "*email*"],
    capture_output=True, text=True
)
print("\nEmail route files:", r.stdout)
