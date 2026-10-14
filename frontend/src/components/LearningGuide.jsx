import React, { useState } from 'react';
import { IconBook, IconFileText, IconLock, IconShield, IconPaperclip } from './Icons';

export const LearningGuide = () => {
  const [activeTab, setActiveTab] = useState('flow');

  return (
    <div className="guide-container">
      <div className="guide-header">
        <div className="badge badge-accent">Interactive Architecture Guide</div>
        <h2 className="guide-title">How MERN Authentication Works</h2>
        <p className="guide-subtitle">
          A step-by-step guide to understanding JSON Web Tokens, bcrypt hashing, Express middleware, and MongoDB integration.
        </p>

        <div className="guide-tabs">
          <button
            className={`guide-tab-btn ${activeTab === 'flow' ? 'active' : ''}`}
            onClick={() => setActiveTab('flow')}
          >
            <IconBook size={15} />
            <span>Auth Flowchart</span>
          </button>
          <button
            className={`guide-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <IconFileText size={15} />
            <span>1. Registration & Hashing</span>
          </button>
          <button
            className={`guide-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            <IconLock size={15} />
            <span>2. Login & JWT Signing</span>
          </button>
          <button
            className={`guide-tab-btn ${activeTab === 'protected' ? 'active' : ''}`}
            onClick={() => setActiveTab('protected')}
          >
            <IconShield size={15} />
            <span>3. Protected Route Guard</span>
          </button>
          <button
            className={`guide-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <IconPaperclip size={15} />
            <span>Project File Structure</span>
          </button>
        </div>
      </div>

      <div className="guide-content-card">
        {activeTab === 'flow' && (
          <div className="guide-section">
            <h3 className="section-title">The Complete Full-Stack Authentication Cycle</h3>
            <div className="flow-diagram-grid">
              <div className="flow-step">
                <div className="step-number">1</div>
                <div className="step-title">Client (React)</div>
                <p className="step-desc">
                  User fills out form. React dispatches <code>POST /api/auth/register</code> or <code>/login</code> via <code>fetch()</code>.
                </p>
              </div>

              <div className="flow-arrow">➔</div>

              <div className="flow-step">
                <div className="step-number">2</div>
                <div className="step-title">Express Server</div>
                <p className="step-desc">
                  Body-parser parses JSON. Route triggers controller function to validate email & password.
                </p>
              </div>

              <div className="flow-arrow">➔</div>

              <div className="flow-step">
                <div className="step-number">3</div>
                <div className="step-title">Bcrypt & MongoDB</div>
                <p className="step-desc">
                  Password is automatically salted and hashed via Mongoose pre-save hook. Document stored in database.
                </p>
              </div>

              <div className="flow-arrow">➔</div>

              <div className="flow-step">
                <div className="step-number">4</div>
                <div className="step-title">JWT Generation</div>
                <p className="step-desc">
                  <code>jwt.sign({'{'} id: user._id {'}'}, secret)</code> creates cryptographically signed token returned to client.
                </p>
              </div>

              <div className="flow-arrow">➔</div>

              <div className="flow-step">
                <div className="step-number">5</div>
                <div className="step-title">Protected Requests</div>
                <p className="step-desc">
                  React passes <code>Authorization: Bearer &lt;token&gt;</code>. Express middleware verifies token before granting access.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="guide-section">
            <h3 className="section-title">Registration & Password Hashing (bcryptjs)</h3>
            <p className="text-secondary mb-4">
              <strong>Rule #1 of Web Security:</strong> Never store plain-text passwords in your database. Even if your database is compromised, hashed passwords cannot be reverse engineered.
            </p>

            <div className="code-example-block">
              <div className="code-example-header">backend/src/models/User.js (Mongoose Pre-Save Hook)</div>
              <pre className="code-viewer">{`// Before saving the user to MongoDB, automatically hash the password
userSchema.pre('save', async function () {
  // Only hash if password was created or changed
  if (!this.isModified('password')) {
    return;
  }

  // Generate cryptographic salt (cost factor = 10)
  const salt = await bcrypt.genSalt(10);

  // Replace plain text password with salted hash
  this.password = await bcrypt.hash(this.password, salt);
});`}</pre>
            </div>
          </div>
        )}

        {activeTab === 'login' && (
          <div className="guide-section">
            <h3 className="section-title">Login Authentication & JSON Web Tokens (JWT)</h3>
            <p className="text-secondary mb-4">
              When a user logs in, we compare the entered password with the stored hash using <code>bcrypt.compare()</code>. If they match, a JWT token is created and sent back.
            </p>

            <div className="code-example-block">
              <div className="code-example-header">backend/src/controllers/authController.js (Login Logic)</div>
              <pre className="code-viewer">{`// 1. Find user by email (include +password since schema hides it by default)
const user = await User.findOne({ email }).select('+password');

// 2. Check if user exists & verify password against bcrypt hash
const isMatch = await user.matchPassword(enteredPassword);
if (!isMatch) {
  return res.status(401).json({ message: 'Invalid credentials' });
}

// 3. Issue a JWT token with user ID in payload
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
  expiresIn: '30d',
});

// 4. Return token & safe user profile back to client
res.json({ token, user: { name: user.name, email: user.email } });`}</pre>
            </div>
          </div>
        )}

        {activeTab === 'protected' && (
          <div className="guide-section">
            <h3 className="section-title">Protecting Routes with Express Middleware</h3>
            <p className="text-secondary mb-4">
              Private API routes like <code>/api/auth/me</code> and <code>/api/auth/profile</code> are shielded with the <code>protect</code> middleware function.
            </p>

            <div className="code-example-block">
              <div className="code-example-header">backend/src/middleware/auth.js (protect middleware)</div>
              <pre className="code-viewer">{`export const protect = async (req, res, next) => {
  let token;

  // 1. Check for Authorization header starting with "Bearer "
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];

    try {
      // 2. Cryptographically verify signature and expiry
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Look up user by ID and attach to req.user (excluding password)
      req.user = await User.findById(decoded.id).select('-password');
      return next(); // Proceed to controller!
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  // 4. No token was sent
  return res.status(401).json({ message: 'Access denied, token required' });
};`}</pre>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="guide-section">
            <h3 className="section-title">Project Architecture & Key Files</h3>
            <div className="file-tree-grid">
              <div className="file-tree-card">
                <h4>Backend (<code>backend/</code>)</h4>
                <ul>
                  <li><code>src/server.js</code> — Express app, CORS, routes mounting</li>
                  <li><code>src/config/db.js</code> — Mongoose connection to MongoDB</li>
                  <li><code>src/models/User.js</code> — User schema, bcrypt pre-save hook</li>
                  <li><code>src/controllers/authController.js</code> — Register, login, getMe logic</li>
                  <li><code>src/middleware/auth.js</code> — JWT Bearer token protection</li>
                  <li><code>src/routes/authRoutes.js</code> — Route definitions</li>
                  <li><code>.env</code> — Port, MongoDB URI, JWT secret</li>
                </ul>
              </div>

              <div className="file-tree-card">
                <h4>Frontend (<code>frontend/</code>)</h4>
                <ul>
                  <li><code>src/context/AuthContext.jsx</code> — Centralized auth state & localStorage</li>
                  <li><code>src/services/api.js</code> — HTTP client with auto-Bearer token</li>
                  <li><code>src/components/LoginForm.jsx</code> — Login form & validation</li>
                  <li><code>src/components/RegisterForm.jsx</code> — Registration & strength meter</li>
                  <li><code>src/components/Dashboard.jsx</code> — Protected profile & token inspector</li>
                  <li><code>src/components/Navbar.jsx</code> — Header & server health status</li>
                  <li><code>src/index.css</code> / <code>App.css</code> — Modern dark glass styling</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
