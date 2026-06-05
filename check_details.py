import subprocess, json

login = subprocess.run(
    ["curl", "-s", "-X", "POST", "https://staging.qgocargo.cloud/api/auth/login",
     "-H", "Content-Type: application/json",
     "-d", '{"email":"akifbade46@gmail.com","password":"aaaaaa"}'],
    capture_output=True, text=True
)
token = json.loads(login.stdout)["token"]
auth = "Authorization: Bearer *** + token

def api(path):
    r = subprocess.run(
        ["curl", "-s", "https://staging.qgocargo.cloud/api" + path,
         "-H", auth],
        capture_output=True, text=True
    )
    return json.loads(r.stdout)

# Check first shipment details
ships = api("/shipments")
s = ships.get("shipments", [])
if s:
    first = s[0]
    print("=== FIRST SHIPMENT FIELDS ===")
    relevant = {k: v for k, v in first.items() if any(x in k.lower() for x in ["rack", "box", "location", "photo", "dimension", "cbm", "piece", "count"])}
    print(json.dumps(relevant, indent=2))

# Check moving job fields
jobs = api("/moving-jobs")
if isinstance(jobs, list):
    print("\n=== FIRST MOVING JOB FIELDS ===")
    print(json.dumps({k: v for k, v in jobs[0].items() if not isinstance(v, (list, dict)) or len(json.dumps(v)) < 200}, indent=2))

# Check email route
email_settings = api("/email")
print("\n=== EMAIL ===")
print(json.dumps(email_settings, indent=2)[:500])

# Check if backend has email route
r = subprocess.run(
    ["grep", "-r", "email", "/root/WMS-STAGING/backend/src/routes/", "-l"],
    capture_output=True, text=True
)
print("\n=== EMAIL ROUTE FILES ===")
print(r.stdout)
