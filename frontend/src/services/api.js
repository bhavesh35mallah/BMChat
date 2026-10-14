const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_AUTH = `${API_BASE}/api/auth`;
const API_CHAT = `${API_BASE}/api/chat`;

/**
 * Handles JSON HTTP requests with appropriate headers and error parsing
 */
async function request(baseUrl, endpoint, options = {}) {
  const { token, data, method = 'GET' } = options;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    let url = `${baseUrl}${endpoint}`;
    let res = await fetch(url, config);

    // If relative path gave 404 in local development, fallback directly to backend server (http://127.0.0.1:5000)
    if (res.status === 404 && !url.startsWith('http') && import.meta.env.DEV) {
      try {
        const directUrl = `http://127.0.0.1:5000${baseUrl}${endpoint}`;
        const directRes = await fetch(directUrl, config);
        const directType = directRes.headers.get('content-type') || '';
        if (directType.includes('application/json')) {
          res = directRes;
        }
      } catch (directErr) {
        console.warn('Direct backend fallback error:', directErr.message);
      }
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Endpoint ${url} returned ${res.status} non-JSON response.`);
    }

    const json = await res.json();

    if (!res.ok) {
      const err = new Error(json.message || `Request failed with status ${res.status}`);
      err.notFound = !!json.notFound || !!json.notRegistered;
      err.notRegistered = !!json.notRegistered || !!json.notFound;
      err.alreadyRegistered = !!json.alreadyRegistered;
      err.status = res.status;
      throw err;
    }

    return json;
  } catch (error) {
    throw error;
  }
}

export const authAPI = {
  // Register a new user
  register: (data) => request(API_AUTH, '/register', { method: 'POST', data }),

  // Login existing user
  login: (data) => request(API_AUTH, '/login', { method: 'POST', data }),

  // Fetch current authenticated user profile
  getMe: (token) => request(API_AUTH, '/me', { method: 'GET', token }),

  // Update profile details (name, bio, avatar)
  updateProfile: (token, data) => request(API_AUTH, '/profile', { method: 'PUT', token, data }),

  // Get list of all other users for chatting
  getUsers: (token) => request(API_AUTH, '/users', { method: 'GET', token }),

  // Send OTP for registration
  sendRegisterOTP: (data) => request(API_AUTH, '/send-register-otp', { method: 'POST', data }),

  // Verify OTP & register
  verifyRegisterOTP: (data) => request(API_AUTH, '/verify-register-otp', { method: 'POST', data }),

  // Send OTP for login
  sendLoginOTP: (data) => request(API_AUTH, '/send-login-otp', { method: 'POST', data }),

  // Verify OTP & login
  verifyLoginOTP: (data) => request(API_AUTH, '/verify-login-otp', { method: 'POST', data }),

  // Health check
  checkHealth: async () => {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch (err) {
      return { status: 'offline', message: err.message };
    }
  },
};

export const chatAPI = {
  // Get conversation history with target user
  getMessages: (token, targetUserId) =>
    request(API_CHAT, `/messages/${targetUserId}`, { method: 'GET', token }),

  // Send a message (fallback/REST)
  sendMessage: (token, data) =>
    request(API_CHAT, '/messages', { method: 'POST', token, data }),

  // Clear conversation history with target user
  clearMessages: (token, targetUserId) =>
    request(API_CHAT, `/messages/${targetUserId}`, { method: 'DELETE', token }),

  // Delete message for current user only
  deleteForMe: (token, messageId) =>
    request(API_CHAT, `/message/${messageId}/me`, { method: 'DELETE', token }),

  // Delete message for everyone (sender or group admin)
  deleteForEveryone: (token, messageId) =>
    request(API_CHAT, `/message/${messageId}/everyone`, { method: 'DELETE', token }),
};

const API_GROUPS = '/api/groups';

export const groupAPI = {
  // Create a new group
  createGroup: (token, data) =>
    request(API_GROUPS, '', { method: 'POST', token, data }),

  // Get all groups the current user belongs to
  getUserGroups: (token) =>
    request(API_GROUPS, '', { method: 'GET', token }),

  // Get messages for a specific group
  getGroupMessages: (token, groupId) =>
    request(API_GROUPS, `/${groupId}/messages`, { method: 'GET', token }),

  // Add members to group
  addMembers: (token, groupId, members) =>
    request(API_GROUPS, `/${groupId}/members`, { method: 'PUT', token, data: { members } }),

  // Remove member from group
  removeMember: (token, groupId, memberId) =>
    request(API_GROUPS, `/${groupId}/members/${memberId}`, { method: 'DELETE', token }),

  // Make member an admin
  makeAdmin: (token, groupId, memberId) =>
    request(API_GROUPS, `/${groupId}/admins/${memberId}`, { method: 'PUT', token }),

  // Dismiss member as admin
  dismissAdmin: (token, groupId, memberId) =>
    request(API_GROUPS, `/${groupId}/admins/${memberId}`, { method: 'DELETE', token }),

  // Leave group
  leaveGroup: (token, groupId) =>
    request(API_GROUPS, `/${groupId}/leave`, { method: 'POST', token }),

  // Delete group
  deleteGroup: (token, groupId) =>
    request(API_GROUPS, `/${groupId}`, { method: 'DELETE', token }),
};

const API_STATUS = '/api/status';

export const statusAPI = {
  // Get all active statuses
  getStatuses: (token) =>
    request(API_STATUS, '', { method: 'GET', token }),

  // Create a new status update
  createStatus: (token, data) =>
    request(API_STATUS, '', { method: 'POST', token, data }),

  // Mark status as viewed
  viewStatus: (token, statusId) =>
    request(API_STATUS, `/${statusId}/view`, { method: 'PUT', token }),

  // Delete status
  deleteStatus: (token, statusId) =>
    request(API_STATUS, `/${statusId}`, { method: 'DELETE', token }),
};
