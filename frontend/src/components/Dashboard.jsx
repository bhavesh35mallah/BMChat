import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { EditProfileModal } from './EditProfileModal';
import { IconChat, IconEdit, IconLogOut, IconLock, IconActivity, IconSearch } from './Icons';

export const Dashboard = ({ onNavigateToChat }) => {
  const { user, token, logout } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Live API test state
  const [apiTestResult, setApiTestResult] = useState(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  // Decode JWT payload on the fly safely without extra library
  const parseJwt = (tokenStr) => {
    try {
      if (!tokenStr) return null;
      const parts = tokenStr.split('.');
      if (parts.length !== 3) return null;

      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { header, payload, rawParts: parts };
    } catch (e) {
      return null;
    }
  };

  const parsedToken = parseJwt(token);

  // Test the protected endpoint live
  const testProtectedEndpoint = async () => {
    setIsTestingApi(true);
    const startTime = performance.now();
    try {
      const data = await authAPI.getMe(token);
      const latency = Math.round(performance.now() - startTime);
      setApiTestResult({
        status: 200,
        ok: true,
        latency,
        data,
      });
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      setApiTestResult({
        status: 401,
        ok: false,
        latency,
        data: { message: err.message },
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Top Banner */}
      <div className="dashboard-header">
        <div className="user-profile-header">
          <div className="avatar-large">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar-large-img" />
            ) : (
              user?.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div className="user-meta">
            <div className="badge-row">
              <span className="badge badge-success">● JWT Authenticated</span>
              <span className="badge badge-neutral">MongoDB Document</span>
            </div>
            <h1 className="user-display-name">{user?.name}</h1>
            <p className="user-email-text">{user?.email}</p>
          </div>
        </div>

        <div className="dashboard-header-actions">
          {onNavigateToChat && (
            <button className="btn-primary" onClick={onNavigateToChat}>
              <IconChat size={16} />
              <span>Open Live Chat</span>
            </button>
          )}
          <button className="btn-secondary" onClick={() => setIsEditModalOpen(true)}>
            <IconEdit size={16} />
            <span>Edit Profile</span>
          </button>
          <button className="btn-danger-ghost btn-secondary" onClick={logout} title="Sign Out">
            <IconLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: User Profile Details */}
        <div className="card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">User Profile Details</h3>
              <p className="card-desc">Stored securely in MongoDB collection 'users'</p>
            </div>
            <button
              className="btn-sm btn-outline flex-center gap-1"
              onClick={() => setIsEditModalOpen(true)}
            >
              <IconEdit size={14} />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="profile-details-list">
            <div className="detail-item">
              <span className="detail-label">Profile Avatar:</span>
              <div className="detail-value flex-center gap-2">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="detail-avatar-thumb" />
                ) : (
                  <span className="text-secondary text-xs">Default initials avatar</span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-label">MongoDB ID (_id):</span>
              <code className="detail-value mono-badge">{user?._id}</code>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user?.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Bio:</span>
              <span className="detail-value">{user?.bio || 'None set'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Account Created:</span>
              <span className="detail-value">
                {user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'Just now'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Password Storage:</span>
              <span className="detail-value text-success font-medium flex-center gap-1">
                <IconLock size={14} />
                <span>Bcrypt Salted & Hashed (Hidden from API)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Protected API Tester */}
        <div className="card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Live Protected Route Tester</h3>
              <p className="card-desc">Tests Express JWT middleware: <code>auth.protect</code></p>
            </div>
          </div>

          <p className="text-secondary text-sm mb-4">
            Click below to execute an authenticated request with your Bearer token to{' '}
            <code className="text-accent">GET /api/auth/me</code>.
          </p>

          <button
            className="btn-primary w-full mb-4 flex-center gap-2"
            onClick={testProtectedEndpoint}
            disabled={isTestingApi}
          >
            <IconActivity size={16} />
            <span>{isTestingApi ? 'Pinging /api/auth/me...' : 'Test Protected API Route (/api/auth/me)'}</span>
          </button>

          {apiTestResult && (
            <div className="api-response-panel">
              <div className="response-header">
                <span className={`status-tag ${apiTestResult.ok ? 'tag-success' : 'tag-error'}`}>
                  HTTP {apiTestResult.status} {apiTestResult.ok ? 'OK' : 'Unauthorized'}
                </span>
                <span className="response-latency">{apiTestResult.latency} ms</span>
              </div>
              <pre className="code-viewer">
                {JSON.stringify(apiTestResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: JWT Token Deep-Dive Inspector */}
      <div className="card mt-6">
        <div className="card-header-row">
          <div>
            <h3 className="card-title flex items-center gap-2">
              <IconSearch size={18} />
              <span>JWT Token Inspector (Learning Tool)</span>
            </h3>
            <p className="card-desc">
              Your active token stored in <code>localStorage.getItem('mern_auth_token')</code>
            </p>
          </div>
        </div>

        <div className="jwt-inspector-grid">
          {/* Raw Token */}
          <div className="jwt-box">
            <div className="jwt-box-title">Raw Encoded Token (Header.Payload.Signature)</div>
            <div className="jwt-raw-display">
              <span className="jwt-part-header">{parsedToken?.rawParts[0]}</span>.
              <span className="jwt-part-payload">{parsedToken?.rawParts[1]}</span>.
              <span className="jwt-part-sig">{parsedToken?.rawParts[2]}</span>
            </div>
          </div>

          {/* Decoded Header & Payload */}
          <div className="jwt-box">
            <div className="jwt-box-title">Decoded Payload (Read by Server)</div>
            <pre className="code-viewer">
              {JSON.stringify(parsedToken?.payload || {}, null, 2)}
            </pre>
            {parsedToken?.payload?.exp && (
              <div className="text-sm text-secondary mt-2">
                ⏳ Expires on:{' '}
                <strong className="text-light">
                  {new Date(parsedToken.payload.exp * 1000).toLocaleString()}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
