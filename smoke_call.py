from backend.routers import users
from backend.schemas.session import CreateUserRequest

def main():
    try:
        req = CreateUserRequest(user_id="root-smoke", name="Root Smoke")
        result = users.create_user(req)
        print("Result:", result)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
