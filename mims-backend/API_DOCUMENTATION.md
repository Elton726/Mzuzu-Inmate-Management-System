# **MIMS Backend API Integration Guide**

## **Overview**
Your Laravel backend provides a complete user management system with authentication, user profiles, and admin controls. All endpoints return JSON responses and use token-based authentication (Sanctum).

---

## **Base URL**
```
http://localhost:8000/api
```

---

## **Authentication Flow**

### **1. Login**
```
POST /api/login
Body: { email, password }
Response: { user: {...}, token: "..." }
```
Store the token in localStorage and include it in all subsequent requests:
```
Headers: { Authorization: `Bearer ${token}` }
```

### **2. Logout**
```
POST /api/logout
Headers: { Authorization: `Bearer ${token}` }
Response: { message: "Successfully logged out" }
```

### **3. Register (Admin Only)**
```
POST /api/register
Headers: { Authorization: `Bearer ${token}`, role must be admin }
Body: { 
  name: string,
  email: string (unique),
  password: string (min 8 chars, uppercase, number, symbol),
  password_confirmation: string,
  role: "admin|reception_officer|station_officer|officer_on_duty|gatekeeper"
}
Response: { user: {...} }
```

---

## **User Endpoints** (Authenticated Users)

### **Get Current User**
```
GET /api/user or GET /api/user/profile
Headers: { Authorization: `Bearer ${token}` }
Response: { 
  id: integer,
  name: string,
  email: string,
  role: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

### **View Own Profile by ID**
```
GET /api/user/{userId}
Headers: { Authorization: `Bearer ${token}` }
Note: Users can only view their own profile
Response: { id, name, email, role, created_at, updated_at }
```

### **Update Own Profile**
```
PUT /api/user/profile
Headers: { Authorization: `Bearer ${token}` }
Body: { 
  name?: string (max 255),
  email?: string (unique, except own),
  password?: string (min 8, must include uppercase, number, symbol),
  password_confirmation?: string
}
Response: { 
  message: "Profile updated successfully",
  user: {...}
}
```

### **Change Password**
```
POST /api/user/change-password
Headers: { Authorization: `Bearer ${token}` }
Body: { 
  current_password: string,
  password: string (min 8, must include uppercase, number, symbol),
  password_confirmation: string
}
Response: { message: "Password changed successfully" }
Errors:
  - 422: Current password is incorrect
  - 400: Invalid password format
```

---

## **Admin Endpoints** (Admin Only - Authorization: role:admin)

All admin endpoints are protected by `role:admin` middleware. Non-admin requests will receive a **403 Forbidden** response.

### **List All Users (with Search/Filter/Sort/Pagination)**
```
GET /api/admin/users?search=john&role=reception_officer&sort_by=name&sort_order=asc&per_page=20
Headers: { Authorization: `Bearer ${token}` }

Query Parameters:
  - search: string (searches in name and email)
  - role: "admin|reception_officer|station_officer|officer_on_duty|gatekeeper"
  - sort_by: "id|name|email|role|created_at" (default: created_at)
  - sort_order: "asc|desc" (default: desc)
  - per_page: integer (default: 50, max: 100)

Response: { 
  data: [
    { id, name, email, role, created_at, updated_at },
    ...
  ],
  current_page: integer,
  from: integer,
  last_page: integer,
  path: string,
  per_page: integer,
  to: integer,
  total: integer
}
```

### **Get User Statistics**
```
GET /api/admin/users/statistics
Headers: { Authorization: `Bearer ${token}` }

Response: { 
  total_users: integer,
  by_role: {
    admin: integer,
    reception_officer: integer,
    station_officer: integer,
    officer_on_duty: integer,
    gatekeeper: integer
  },
  recent_users: [
    { id, name, email, role, created_at },
    ...
  ]
}
```

### **Create User**
```
POST /api/admin/users
Headers: { Authorization: `Bearer ${token}` }
Body: { 
  name: string (required, max 255),
  email: string (required, unique, valid email),
  password: string (required, min 8, uppercase, number, symbol),
  password_confirmation: string (required, must match password),
  role: string (required, one of the available roles)
}

Response: { 
  message: "User created successfully",
  user: { id, name, email, role, created_at, updated_at }
}

Errors:
  - 422: Validation error (see errors object)
  - 409: Email already exists
```

### **View User Details**
```
GET /api/admin/users/{userId}
Headers: { Authorization: `Bearer ${token}` }

Response: { id, name, email, role, created_at, updated_at }

Errors:
  - 404: User not found
```

### **Update User (Admin Can Update Any User Including Roles)**
```
PUT or PATCH /api/admin/users/{userId}
Headers: { Authorization: `Bearer ${token}` }
Body: { 
  name?: string (max 255),
  email?: string (unique, except own),
  password?: string (min 8, uppercase, number, symbol),
  password_confirmation?: string,
  role?: "admin|reception_officer|station_officer|officer_on_duty|gatekeeper"
}

Response: { 
  message: "User updated successfully",
  user: { id, name, email, role, created_at, updated_at }
}

Errors:
  - 422: Validation error
  - 404: User not found
```

### **Delete User**
```
DELETE /api/admin/users/{userId}
Headers: { Authorization: `Bearer ${token}` }

Response: { message: "User deleted successfully" } (HTTP 204)

Errors:
  - 400: Cannot delete own account
  - 404: User not found
```

### **Bulk Delete Users**
```
POST /api/admin/users/bulk-delete
Headers: { Authorization: `Bearer ${token}` }
Body: { 
  user_ids: [integer, integer, ...] (required, array, min 1)
}

Response: { 
  message: "2 user(s) deleted successfully",
  deleted_count: integer
}

Errors:
  - 400: Cannot delete own account
  - 422: Validation error (invalid IDs or user not found)
```

### **Bulk Update User Roles**
```
POST /api/admin/users/bulk-update-role
Headers: { Authorization: `Bearer ${token}` }
Body: { 
  user_ids: [integer, integer, ...] (required, array, min 1),
  role: string (required, one of the available roles)
}

Response: { 
  message: "2 user(s) updated successfully",
  updated_count: integer
}

Errors:
  - 400: Cannot change own role
  - 422: Validation error (invalid IDs, user not found, or invalid role)
```

---

## **Available Roles**

| Role | Purpose |
|------|---------|
| `admin` | Full system access, user management |
| `reception_officer` | Front desk operations |
| `station_officer` | Station management |
| `officer_on_duty` | Duty operations |
| `gatekeeper` | Gate access control |

---

## **HTTP Status Codes**

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST request creating resource |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid request data or business logic violation |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but lacks required permissions |
| 404 | Not Found | Resource does not exist |
| 422 | Unprocessable Entity | Validation error on request body |
| 500 | Server Error | Unexpected server error |

---

## **Error Response Format**

### **Validation Error (422)**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email must be a valid email address.", "The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

### **Unauthorized (401)**
```json
{
  "message": "Unauthenticated."
}
```

### **Forbidden (403)**
```json
{
  "message": "Forbidden. You do not have access to this resource."
}
```

### **Bad Request (400)**
```json
{
  "message": "You cannot delete your own account."
}
```

### **Not Found (404)**
```json
{
  "message": "User not found."
}
```

---

## **Request Headers**

### **Required for All Authenticated Endpoints**
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### **Example cURL Request**
```bash
curl -X GET http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

---

## **Authentication Token Lifecycle**

1. **Login**: Send credentials → Get token
2. **Store**: Save token in localStorage or secure cookie
3. **Use**: Include token in Authorization header for all requests
4. **Refresh**: Token is valid indefinitely (no refresh needed)
5. **Logout**: Send logout request with valid token

---

## **React Implementation Example**

### **API Service**
```javascript
const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getProfile() {
    return fetch(`${API_BASE_URL}/user/profile`, {
      headers: this.getHeaders()
    }).then(r => r.json());
  }

  async updateProfile(updates) {
    return fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    }).then(r => r.json());
  }

  async listUsers(params) {
    const queryString = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/admin/users?${queryString}`, {
      headers: this.getHeaders()
    }).then(r => r.json());
  }

  async createUser(userData) {
    return fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData)
    }).then(r => r.json());
  }
}

export default new ApiService();
```

---

## **Common Issues & Solutions**

### **401 Unauthorized Error**
**Problem**: Token is missing or expired
**Solution**: Check token is stored and properly included in header

### **403 Forbidden Error**
**Problem**: User doesn't have required role
**Solution**: Check user.role in response; only admins can access `/api/admin/*`

### **422 Validation Error**
**Problem**: Invalid request data
**Solution**: Check `errors` object in response for specific field errors

### **CORS Error**
**Problem**: Frontend and backend on different domains
**Solution**: Backend is configured for local development; ensure frontend URL matches

---

## **Testing the API**

### **Using Postman/Insomnia**
1. Import the API endpoints
2. Set `{{base_url}}` variable to `http://localhost:8000/api`
3. Login and copy token to `Authorization` header
4. Test endpoints with examples above

### **Using cURL**
```bash
# Login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get Profile (replace TOKEN with actual token)
curl -X GET http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer TOKEN"
```

---

## **API Versioning**
Current API Version: **v1** (no versioning prefix required)
All endpoints use the `/api` prefix.

---

## **Rate Limiting**
No rate limiting is currently implemented. This can be added as needed.

---

## **Pagination**
All list endpoints support pagination via `per_page` query parameter.
Response includes pagination metadata:
- `current_page`: Current page number
- `last_page`: Total number of pages
- `total`: Total number of records
- `per_page`: Records per page
- `from`: Starting record number
- `to`: Ending record number

---

## **Data Validation Rules**

### **User Fields**
| Field | Rules |
|-------|-------|
| name | Required, string, max 255 characters |
| email | Required, valid email format, unique |
| password | Required, min 8 chars, uppercase, number, symbol, confirmed |
| role | Required, one of available roles |

### **Password Requirements**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one number (0-9)
- At least one special character (!@#$%^&*) or symbol

---

## **Support & Documentation**

For issues or questions:
1. Check error messages in response
2. Verify all required fields are included
3. Ensure token is valid and included in Authorization header
4. Check user role has required permissions
5. Review this documentation for endpoint details

---

**Last Updated**: March 14, 2026
**Backend Framework**: Laravel 12.53.0
**Authentication**: Laravel Sanctum (API Token-based)
