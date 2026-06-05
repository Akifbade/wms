import subprocess, json

# Login
login = subprocess.run(
    ["curl", "-s", "-X", "POST", "https://staging.qgocargo.cloud/api/auth/login",
     "-H", "Content-Type: application/json",
     "-d", '{"email":"akifbade46@gmail.com","password":"aaaaaa"}'],
    capture_output=True, text=True
)
token = json.loads(login.stdout)['token']

# Get finance overview
r = subprocess.run(
    ["curl", "-s", "https://staging.qgocargo.cloud/api/finance/overview",
     "-H", "Authorization: Bearer " + token],
    capture_output=True, text=True
)
d = json.loads(r.stdout)
print(json.dumps(d, indent=2))
