import nodemailer from 'nodemailer';

/**
 * Send an OTP verification email to user
 * Supports real SMTP transport (Brevo, Gmail, custom SMTP)
 * with automatic port 587 / 465 SSL fallback and verified sender handling.
 */
export const sendOTPEmail = async ({ email, otp, purpose = 'login', name = '' }) => {
  const isRegister = purpose === 'register';
  const actionName = isRegister ? 'Registration' : 'Login';
  const greeting = name ? `Hello ${name},` : 'Hello,';

  console.log(`\n======================================================`);
  console.log(`🔐 [OTP DISPATCH] ${actionName.toUpperCase()}`);
  console.log(`📧 Target Email: ${email}`);
  console.log(`🔑 Verification Code: ${otp}`);
  console.log(`⏳ Expires in: 10 minutes`);
  console.log(`======================================================\n`);

  // Detect SMTP configuration in environment
  const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
  let smtpHost = (process.env.SMTP_HOST || '').trim();

  // Auto-detect Brevo if credentials match Brevo patterns but host was omitted
  if (!smtpHost && (smtpUser.includes('brevo.com') || smtpPass.startsWith('xsmtpsib'))) {
    smtpHost = 'smtp-relay.brevo.com';
  }

  let smtpError = null;

  if (smtpUser && smtpPass && (smtpHost || smtpUser.includes('gmail.com'))) {
    const isGmail = (smtpHost && smtpHost.includes('gmail.com')) || smtpUser.includes('gmail.com');
    
    // Brevo requires the sender email to be an active verified sender in your Brevo account.
    // The username 'be1661001@smtp-brevo.com' is a login ID, NOT a verified sender.
    const fallbackSender = '"BMChat Auth" <bhavesh.45.mallah@gmail.com>';
    let fromAddress = process.env.EMAIL_FROM ? process.env.EMAIL_FROM.trim() : '';
    if (!fromAddress || fromAddress.includes('yourdomain.com') || fromAddress.includes('@smtp-brevo.com')) {
      fromAddress = fallbackSender;
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px 24px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 10px 16px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; color: #818cf8; font-weight: 700; font-size: 16px;">
            BMChat Authentication
          </div>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center; color: #ffffff;">
          ${actionName} Verification Code
        </h2>
        <p style="font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.5; margin-bottom: 24px;">
          ${greeting} Use the 6-digit verification code below to complete your ${actionName.toLowerCase()} request.
        </p>
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px dashed rgba(99, 102, 241, 0.4); border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
          This code expires in <strong>10 minutes</strong>. If you did not request this, please disregard this email.
        </p>
      </div>
    `;

    // Try configured port first, fallback to alternate port (e.g. 587 -> 465 SSL)
    const configuredPort = Number(process.env.SMTP_PORT) || 587;
    const configuredSecure = process.env.SMTP_SECURE === 'true' || configuredPort === 465;

    const attempts = isGmail
      ? [{ service: 'gmail', auth: { user: smtpUser, pass: smtpPass } }]
      : [
          {
            host: smtpHost,
            port: configuredPort,
            secure: configuredSecure,
            auth: { user: smtpUser, pass: smtpPass },
            name: 'primary',
          },
          {
            host: smtpHost,
            port: configuredPort === 465 ? 587 : 465,
            secure: configuredPort !== 465,
            auth: { user: smtpUser, pass: smtpPass },
            name: 'fallback',
          },
        ];

    for (let i = 0; i < attempts.length; i++) {
      const attemptConfig = attempts[i];
      try {
        console.log(`📡 [SMTP] Attempt ${i + 1}/${attempts.length}: Connecting to ${attemptConfig.host || 'gmail'} on port ${attemptConfig.port || 'default'} (secure: ${!!attemptConfig.secure})...`);

        const transporter = nodemailer.createTransport({
          ...attemptConfig,
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 10000,
        });

        const sendPromise = transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: `Your ${actionName} Code: ${otp}`,
          text: `Your ${actionName} verification code is: ${otp}. It expires in 10 minutes.`,
          html: htmlContent,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP timeout: server took longer than 8 seconds to respond')), 8500)
        );

        const info = await Promise.race([sendPromise, timeoutPromise]);
        console.log(`✅ [EMAIL SENT] Verification code successfully sent to: ${email} (MessageID: ${info.messageId || 'OK'})`);
        return { success: true, mode: 'smtp', messageId: info.messageId };
      } catch (err) {
        smtpError = err.message;
        console.warn(`⚠️ [SMTP ATTEMPT ${i + 1} FAILED]:`, err.message);
        if (i < attempts.length - 1) {
          console.log(`🔄 Retrying via alternate SMTP port...`);
        }
      }
    }
  } else {
    smtpError = 'SMTP credentials not configured in environment (SMTP_USER/PASS missing)';
    console.warn('⚠️ SMTP credentials not set on server. Running in simulated OTP mode.');
  }

  // Simulated fallback for local dev or if outbound SMTP fails
  return { success: true, mode: 'simulated', error: smtpError };
};

