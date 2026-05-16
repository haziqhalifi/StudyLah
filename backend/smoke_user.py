from backend.routers import users
from backend.schemas.session import CreateUserRequest

def main():
    req = CreateUserRequest(user_id="smoke-user", name="Smoke Test")
    result = users.create_user(req)
    print(result)

if __name__ == '__main__':
    main()
