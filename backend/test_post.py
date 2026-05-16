import json
import sys
import traceback
from urllib import request

def main():
    url = "http://127.0.0.1:8000/api/users/"
    data = json.dumps({"user_id": "test-user", "name": "Test User"}).encode()
    req = request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        resp = request.urlopen(req)
        print(resp.status)
        print(resp.read().decode())
    except Exception:
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
