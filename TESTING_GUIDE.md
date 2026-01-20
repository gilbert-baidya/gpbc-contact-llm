# Authentication System Testing Guide

## Quick Test Commands

### 1. Test Backend Authentication API (Terminal)

```bash
# Navigate to project root
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"

# Test Admin Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gpbc.org","password":"admin123"}' | jq

# Test Pastor Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pastor@gpbc.org","password":"pastor123"}' | jq

# Test Member Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member@gpbc.org","password":"member123"}' | jq

# Test Protected Endpoint (replace TOKEN with actual token from login)
TOKEN="paste_token_here"
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Test User Management (Admin Only)
curl -X GET http://localhost:8000/api/auth/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 2. Test Frontend Authentication (Browser)

**Step 1: Open the Application**
- Open http://localhost:3005 in your browser
- You should be redirected to the login page

**Step 2: Test Admin Login**
1. Click "Quick Login: Admin" button
2. Should see: "Welcome back, Admin User!"
3. Should redirect to Dashboard
4. Top right should show "Admin User (admin)" with logout button

**Step 3: Test Messaging Access (Admin)**
1. Click "Messaging" in sidebar
2. Should have full access to send messages
3. Try selecting contacts and composing a message

**Step 4: Test Pastor Login**
1. Click logout
2. Login as Pastor (click "Quick Login: Pastor")
3. Navigate to Messaging
4. Should have access to send messages

**Step 5: Test Member Login**
1. Logout
2. Login as Member (click "Quick Login: Member")
3. Try to access Messaging
4. Should see "Access Denied" message
5. Member cannot send messages

**Step 6: Test Settings Page**
1. While logged in, click "Settings" in sidebar
2. Should see your current role and permissions
3. Review what each role can do

## Browser DevTools Testing

### Check Authentication State
Open browser console (F12) and run:

```javascript
// Check stored tokens (frontend still uses demo auth)
console.log('User:', localStorage.getItem('user'));
console.log('Demo Auth Data:', localStorage.getItem('auth'));

// Check if user is authenticated
const authData = JSON.parse(localStorage.getItem('auth') || '{}');
console.log('Authenticated:', authData.isAuthenticated);
console.log('User Role:', authData.user?.role);
```

### Test API Calls
```javascript
// Test backend login from browser
fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@gpbc.org',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Login response:', data);
  console.log('Access Token:', data.access_token);
  console.log('User:', data.user);
});

// Test protected endpoint
const token = 'paste_your_token_here';
fetch('http://localhost:8000/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Current user:', data));
```

## Automated Test Script

Save this as `test_auth.sh`:

```bash
#!/bin/bash

echo "=== Testing GPBC Authentication System ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"

echo -e "${BLUE}1. Testing Admin Login...${NC}"
ADMIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gpbc.org","password":"admin123"}')

if echo "$ADMIN_RESPONSE" | grep -q "access_token"; then
  echo -e "${GREEN}✅ Admin login successful${NC}"
  ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
else
  echo -e "${RED}❌ Admin login failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}2. Testing Pastor Login...${NC}"
PASTOR_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pastor@gpbc.org","password":"pastor123"}')

if echo "$PASTOR_RESPONSE" | grep -q "access_token"; then
  echo -e "${GREEN}✅ Pastor login successful${NC}"
  PASTOR_TOKEN=$(echo $PASTOR_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
else
  echo -e "${RED}❌ Pastor login failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}3. Testing Member Login...${NC}"
MEMBER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member@gpbc.org","password":"member123"}')

if echo "$MEMBER_RESPONSE" | grep -q "access_token"; then
  echo -e "${GREEN}✅ Member login successful${NC}"
else
  echo -e "${RED}❌ Member login failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}4. Testing Protected Endpoint (Current User)...${NC}"
ME_RESPONSE=$(curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$ME_RESPONSE" | grep -q "admin@gpbc.org"; then
  echo -e "${GREEN}✅ Protected endpoint working${NC}"
else
  echo -e "${RED}❌ Protected endpoint failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}5. Testing User Management (Admin)...${NC}"
USERS_RESPONSE=$(curl -s -X GET $BASE_URL/api/auth/users \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$USERS_RESPONSE" | grep -q "admin@gpbc.org"; then
  USER_COUNT=$(echo $USERS_RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
  echo -e "${GREEN}✅ Admin can view users (${USER_COUNT} users)${NC}"
else
  echo -e "${RED}❌ User management failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}6. Testing Access Control (Pastor accessing admin endpoint)...${NC}"
DENIED_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET $BASE_URL/api/auth/users \
  -H "Authorization: Bearer $PASTOR_TOKEN")

STATUS=$(echo "$DENIED_RESPONSE" | tail -n1)
if [ "$STATUS" = "403" ]; then
  echo -e "${GREEN}✅ Access correctly denied (403)${NC}"
else
  echo -e "${RED}❌ Expected 403, got $STATUS${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}=== All Tests Passed! 🎉 ===${NC}"
```

Make it executable and run:
```bash
chmod +x test_auth.sh
./test_auth.sh
```

## Testing Checklist

### Backend API Tests
- [ ] Admin can login and get JWT token
- [ ] Pastor can login and get JWT token  
- [ ] Member can login and get JWT token
- [ ] Invalid credentials return 401 error
- [ ] Protected endpoints require Authorization header
- [ ] Admin can view all users
- [ ] Pastor/Member cannot access admin endpoints (403)
- [ ] JWT token expires after 30 minutes
- [ ] Refresh token works for getting new access token

### Frontend UI Tests
- [ ] Login page displays correctly
- [ ] Quick login buttons work for all roles
- [ ] Manual email/password login works
- [ ] Show/hide password toggle works
- [ ] Wrong credentials show error message
- [ ] Successful login redirects to dashboard
- [ ] User profile shows in sidebar (name, role, avatar)
- [ ] Logout button works and redirects to login
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Messaging page blocked for Members (Access Denied)
- [ ] Messaging page accessible for Admin/Pastor
- [ ] Settings page shows correct permissions

### Role-Based Access Tests
- [ ] **Admin**: Can access all features
- [ ] **Admin**: Can view Settings page
- [ ] **Admin**: Can send messages
- [ ] **Admin**: Can manage users (backend API)
- [ ] **Pastor**: Can send messages
- [ ] **Pastor**: Can access dashboard, contacts, reminders
- [ ] **Pastor**: Cannot access admin features
- [ ] **Member**: Can view dashboard and contacts
- [ ] **Member**: Cannot access messaging page
- [ ] **Member**: Cannot access settings/admin features

### Security Tests
- [ ] Passwords are hashed (check database)
- [ ] JWT tokens are properly signed
- [ ] Expired tokens return 401
- [ ] Login attempts are logged
- [ ] Rate limiting works (try 10+ rapid logins)
- [ ] No sensitive data in localStorage (passwords)
- [ ] CORS configured correctly for frontend

## Common Issues & Solutions

### Backend Not Running
```bash
cd backend
source venv/bin/activate
python main.py
# Should see: "✅ Authentication system enabled"
```

### Frontend Not Running
```bash
cd frontend
npm run dev
# Should open http://localhost:3005
```

### Database Not Initialized
```bash
cd backend
source venv/bin/activate
python init_auth.py
# Should create 3 users
```

### CORS Errors in Browser
Check `backend/main.py` has:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Token Expired
Login again to get fresh token. Access tokens expire after 30 minutes.

## Next: Connect Frontend to Backend

Currently the frontend uses **demo authentication** (localStorage). To connect to the real backend API:

1. Update `AuthContext.tsx` to call backend APIs
2. Store JWT tokens instead of demo user object
3. Add Authorization headers to all API calls
4. Implement token refresh logic

See `AUTHENTICATION_TEST_RESULTS.md` for detailed integration steps.
