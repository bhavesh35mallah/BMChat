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

  // 1. Try Brevo HTTPS REST API (Port 443) - Bypasses Render free-tier outbound SMTP port blocks
  const brevoApiKey = (process.env.BREVO_API_KEY || (smtpPass.startsWith('xkeysib-') ? smtpPass : '')).trim();
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();

  // Extract pure email for API sender
  const rawSenderEmail = process.env.EMAIL_FROM || 'bhavesh.45.mallah@gmail.com';
  const matchEmail = rawSenderEmail.match(/<([^>]+)>/) || [null, rawSenderEmail];
  const senderEmailOnly = (matchEmail[1] || 'bhavesh.45.mallah@gmail.com').trim();

  if (brevoApiKey) {
    try {
      console.log(`🚀 [HTTPS API] Sending OTP via Brevo REST API (Port 443 - zero port blocking)...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'BMChat Auth', email: senderEmailOnly },
          to: [{ email }],
          subject: `Your ${actionName} Code: ${otp}`,
          htmlContent,
        }),
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`✅ [EMAIL SENT via BREVO HTTPS API] MessageID: ${resData.messageId || 'OK'} to: ${email}`);
        return { success: true, mode: 'brevo_api', messageId: resData.messageId };
      } else {
        console.warn('⚠️ Brevo HTTPS API rejected:', resData.message || response.statusText);
        smtpError = `Brevo API: ${resData.message || response.statusText}`;
      }
    } catch (apiErr) {
      console.warn('⚠️ Brevo HTTPS API request failed:', apiErr.message);
      smtpError = apiErr.message;
    }
  }

  // 1b. Try Resend HTTPS REST API (Port 443)
  if (resendApiKey) {
    try {
      console.log(`🚀 [HTTPS API] Sending OTP via Resend REST API (Port 443)...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `BMChat Auth <${senderEmailOnly.includes('@') ? senderEmailOnly : 'onboarding@resend.dev'}>`,
          to: [email],
          subject: `Your ${actionName} Code: ${otp}`,
          html: htmlContent,
        }),
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`✅ [EMAIL SENT via RESEND HTTPS API] ID: ${resData.id || 'OK'} to: ${email}`);
        return { success: true, mode: 'resend_api', messageId: resData.id };
      } else {
        console.warn('⚠️ Resend HTTPS API rejected:', resData.message || response.statusText);
        smtpError = `Resend API: ${resData.message || response.statusText}`;
      }
    } catch (resendErr) {
      console.warn('⚠️ Resend HTTPS API request failed:', resendErr.message);
      smtpError = resendErr.message;
    }
  }

  // 2. Fallback to Raw SMTP (Ports 587 / 465)
  if (smtpUser && smtpPass && (smtpHost || smtpUser.includes('gmail.com'))) {
    const isGmail = (smtpHost && smtpHost.includes('gmail.com')) || smtpUser.includes('gmail.com');
    
    // Brevo requires the sender email to be an active verified sender in your Brevo account.
    const fallbackSender = '"BMChat Auth" <bhavesh.45.mallah@gmail.com>';
    let fromAddress = process.env.EMAIL_FROM ? process.env.EMAIL_FROM.trim() : '';
    if (!fromAddress || fromAddress.includes('yourdomain.com') || fromAddress.includes('@smtp-brevo.com')) {
      fromAddress = fallbackSender;
    }

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
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 8000,
        });

        const sendPromise = transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: `Your ${actionName} Code: ${otp}`,
          text: `Your ${actionName} verification code is: ${otp}. It expires in 10 minutes.`,
          html: htmlContent,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP connection timeout: mail server port blocked or unreachable')), 6500)
        );

        const info = await Promise.race([sendPromise, timeoutPromise]);
        console.log(`✅ [EMAIL SENT via SMTP] Verification code successfully sent to: ${email} (MessageID: ${info.messageId || 'OK'})`);
        return { success: true, mode: 'smtp', messageId: info.messageId };
      } catch (err) {
        smtpError = err.message;
        console.warn(`⚠️ [SMTP ATTEMPT ${i + 1} FAILED]:`, err.message);
        if (i < attempts.length - 1) {
          console.log(`🔄 Retrying via alternate SMTP port...`);
        }
      }
    }

    console.warn('\n🚨 [RENDER FREE TIER NOTICE]');
    console.warn('Render Free tier blocks outbound SMTP ports (587, 465, 25).');
    console.warn('To deliver live emails from Render, generate an API key in Brevo (app.brevo.com -> SMTP & API -> API Keys)');
    console.warn('and add BREVO_API_KEY in Render Dashboard -> Environment. It runs over HTTPS (port 443) with zero blocking.\n');
  } else if (!brevoApiKey && !resendApiKey) {
    smtpError = 'Neither BREVO_API_KEY nor SMTP credentials configured in environment';
    console.warn('⚠️ No email dispatch credentials configured on server. Running in simulated OTP mode.');
  }

  // Simulated fallback for local dev or if outbound SMTP fails
  return { success: true, mode: 'simulated', error: smtpError };
};

