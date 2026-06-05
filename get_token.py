import subprocess, json

# Login and save token to file
login = subprocess.run(
    ["curl", "-s", "-X", "POST", "https://staging.qgocargo.cloud/api/auth/login",
     "-H", "Content-Type: application/json",
     "-d", '{"email":"akifbade46@gmail.com","password":"aaaaaa"}'],
    capture_output=True, text=True
)
with open("/tmp/tk.txt", "w") as f:
    f.write(json.loads(login.stdout)["token"])
