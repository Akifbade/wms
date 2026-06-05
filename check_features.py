import subprocess, json

login = subprocess.run(
    ["curl", "-s", "-X", "POST", "https://staging.qgocargo.cloud/api/auth/login",
     "-H", "Content-Type: application/json",
     "-d", '{"email":"akifbade46@gmail.com","password":"aaaaaa"}'],
    capture_output=True, text=True
)
token = json.loads(login.stdout)["token"]

r = subprocess.run(
    ["curl", "-s", "https://staging.qgocargo.cloud/api/shipments",
     "-H", "Authorization: Bearer *** + token],
    capture_output=True, text=True
)
data = json.loads(r.stdout)
shipments = data.get("shipments", [])
print("Total shipments:", len(shipments))
no_rack = [s for s in shipments if not s.get("rackCode")]
print("Without rack:", len(no_rack))
if no_rack:
    for s in no_rack[:3]:
        print("  -", s.get("name","?"), "| status:", s.get("status"), "| pieces:", s.get("currentBoxCount",0), "/", s.get("totalBoxes",0))

# Moving jobs with materials
r2 = subprocess.run(
    ["curl", "-s", "https://staging.qgocargo.cloud/api/moving-jobs",
     "-H", "Authorization: Bearer *** + token],
    capture_output=True, text=True
)
jobs = json.loads(r2.stdout)
if isinstance(jobs, list):
    for j in jobs[:5]:
        mats = j.get("materials") or []
        print("Job:", j.get("title","?"), "|", j.get("status"), "| materials:", len(mats))

# Email config
r3 = subprocess.run(
    ["curl", "-s", "https://staging.qgocargo.cloud/api/email",
     "-H", "Authorization: Bearer *** + token],
    capture_output=True, text=True
)
print("\nEmail API:", r3.stdout[:200])

# Materials
r4 = subprocess.run(
    ["curl", "-s", "https://staging.qgocargo.cloud/api/materials",
     "-H", "Authorization: Bearer *** + token],
    capture_output=True, text=True
)
mats = json.loads(r4.stdout)
if isinstance(mats, list):
    print("Materials count:", len(mats))
elif isinstance(mats, dict):
    print("Materials:", json.dumps(mats, indent=2)[:200])
