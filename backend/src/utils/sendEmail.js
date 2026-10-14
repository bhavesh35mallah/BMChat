import nodemailer from 'nodemailer';

/**
 * Send an OTP verification email to user
 * Supports real SMTP transport if environment variables are provided,
 * or simulated delivery with console logging and fast testing.
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

  // Check if SMTP configuration exists in environment
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  let smtpError = null;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const isGmail = smtpHost.includes('gmail.com');
      const port = Number(process.env.SMTP_PORT) || 587;
      const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport(
        isGmail
          ? {
              service: 'gmail',
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              connectionTimeout: 4000,
              greetingTimeout: 4000,
              socketTimeout: 5000,
            }
          : {
              host: smtpHost,
              port,
              secure: isSecure,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              connectionTimeout: 4000,
              greetingTimeout: 4000,
              socketTimeout: 5000,
            }
      );

      const defaultFrom = smtpUser ? `"BMChat Auth" <${smtpUser}>` : '"BMChat Auth" <no-reply@bmchat.local>';
      const fromAddress =
        process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('yourdomain.com')
          ? process.env.EMAIL_FROM
          : defaultFrom;

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

      // Enforce strict 4.5s timeout on email sending so the user is NEVER kept waiting
      const sendPromise = transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: `Your ${actionName} Code: ${otp}`,
        text: `Your ${actionName} verification code is: ${otp}. It expires in 10 minutes.`,
        html: htmlContent,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout: mail server took longer than 4.5 seconds to respond')), 4500)
      );

      await Promise.race([sendPromise, timeoutPromise]);

      console.log(`✅ [EMAIL SENT] Verification code successfully sent via SMTP to: ${email}`);
      return { success: true, mode: 'smtp' };
    } catch (err) {
      smtpError = err.message;
      console.warn('⚠️ SMTP delivery failed/timed out, continuing with code dispatch:', err.message);
    }
  }

  // Simulated delivery for local dev / instant testing
  return { success: true, mode: 'simulated', error: smtpError };
};
