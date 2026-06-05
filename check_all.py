import subprocess, json

# Login
login = subprocess.run(
    ["curl", "-s", "-X", "POST", "https://staging.qgocargo.cloud/api/auth/login",
     "-H", "Content-Type: application/json",
     "-d", '{"email":"akifbade46@gmail.com","password":"aaaaaa"}'],
    capture_output=True, text=True
)
token = json.loads(login.stdout)["token"]
auth = "Authorization: Bearer " + token

def api(path):
    r = subprocess.run(
        ["curl", "-s", "https://staging.qgocargo.cloud/api" + path,
         "-H", auth],
        capture_output=True, text=True
    )
    return json.loads(r.stdout)

# 1. Shipments without rack
ships = api("/shipments")
s = ships.get("shipments", [])
no_rack = [x for x in s if not x.get("rackCode")]
print("=== SHIPMENTS ===")
print(f"Total: {len(s)}, Without rack: {len(no_rack)}")
if no_rack:
    for x in no_rack[:3]:
        print(f"  - {x.get('name','?')} | pieces: {x.get('currentBoxCount',0)}/{x.get('totalBoxes',0)}")
# Check photos
if s:
    first = s[0]
    photos = first.get("shipmentPhotos") or []
    print(f"First shipment photos: {len(photos)}")
    print(f"Has rackCode: {bool(first.get('rackCode'))}")
    print(f"Rack location: {first.get('rackLocation','none')}")

# 2. Moving jobs with materials
jobs = api("/moving-jobs")
if isinstance(jobs, list):
    print("\n=== MOVING JOBS ===")
    print(f"Total: {len(jobs)}")
    for j in jobs[:5]:
        mats = j.get("materials") or []
        print(f"  {j.get('title','?')} ({j.get('status')}) - materials: {len(mats)}")
        for mm in mats[:3]:
            print(f"    - {mm.get('materialName','?')} x {mm.get('quantityIssued',0)}")

# 3. Email
email = api("/email")
print("\n=== EMAIL ===")
if "error" in email:
    print(f"Error: {email['error']}")
else:
    print(json.dumps(email, indent=2)[:300])

# 4. Materials
mats = api("/materials")
print("\n=== MATERIALS ===")
if isinstance(mats, list):
    print(f"Count: {len(mats)}")
    for m in mats[:3]:
        print(f"  - {m.get('name','?')} x {m.get('quantity',0)}")
elif isinstance(mats, dict):
    items = mats.get("materials", mat.get("items", []))
    print(f"Count: {len(items)}")
    print(json.dumps(mats, indent=2)[:200])
else:
    print(str(mats)[:200])
