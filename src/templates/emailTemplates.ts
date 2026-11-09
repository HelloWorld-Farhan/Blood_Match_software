/**
 * BloodMatch Clinical Email Template Engine
 * 
 * Generates fully responsive, email-client-compatible HTML matching the exact
 * visual identity and clinical palette of the BloodMatch platform.
 */

export interface OtpEmailOptions {
  userName: string;
  userEmail: string;
  otpCode: string;
  expiryMinutes?: number;
}

export interface PasswordResetEmailOptions {
  userName: string;
  userEmail: string;
  resetUrl: string;
  resetCode?: string;
  requestTime?: string;
  requestLocation?: string;
  requestIp?: string;
}

export interface ThankYouEmailOptions {
  userName: string;
  userEmail: string;
  userRole?: string;
  userFacility?: string;
  userPhone?: string;
  portalUrl?: string;
}

export interface PasswordChangedEmailOptions {
  userName: string;
  userEmail: string;
  changeTime?: string;
  changeIp?: string;
  changeDevice?: string;
  loginUrl?: string;
}

/**
 * 1. Generates the OTP Verification Email HTML
 */
export function generateOtpEmailHtml(options: OtpEmailOptions): string {
  const { userName, userEmail, otpCode, expiryMinutes = 10 } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your BloodMatch One-Time Security Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EF; color: #1A1D20; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; font-size: 1px; color: #F5F1EF; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your BloodMatch security verification code is ${otpCode}. Valid for ${expiryMinutes} minutes.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F5F1EF;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D9C7C2; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #7A0C17 0%, #D72638 100%); padding: 32px 36px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 44px; height: 44px; background-color: #FFFFFF; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 44px; color: #D72638;">🩸</span>
                        </td>
                        <td style="padding-left: 14px;">
                          <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.1;">
                            Blood<span style="color: #FFB3BA;">Match</span>
                          </div>
                          <div style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">
                            Clinical Operations Hub
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); border-radius: 100px; font-size: 11px; font-weight: 600; color: #FFFFFF;">
                      🔒 256-Bit TLS
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 36px 32px 36px; text-align: left;">
              <div style="display: inline-block; padding: 5px 12px; background-color: #FDF2F4; border: 1px solid rgba(215, 38, 56, 0.25); border-radius: 100px; font-size: 11px; font-weight: 700; color: #D72638; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                Identity Verification Protocol
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #1A1D20; letter-spacing: -0.5px; line-height: 1.3;">
                One-Time Security Passcode
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4A5568;">
                Hello <strong style="color: #1A1D20;">${userName}</strong>, we received a secure authorization request for your BloodMatch account. Enter the verification code below:
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background: linear-gradient(180deg, #FDF8F7 0%, #F5F1EF 100%); border: 2px dashed #D72638; border-radius: 16px; padding: 26px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #7A0C17; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                      Authorized Verification Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 800; color: #D72638; letter-spacing: 10px; margin: 4px 0;">
                      ${otpCode}
                    </div>
                    <div style="font-size: 12px; font-weight: 600; color: #718096; margin-top: 8px;">
                      ⏱️ Code expires in <strong>${expiryMinutes} minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Caution -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF5F5; border-left: 4px solid #D72638; border-radius: 6px; margin: 24px 0 12px 0;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #7A0C17; margin-bottom: 2px;">
                      ⚠️ Confidential Security Notice
                    </div>
                    <div style="font-size: 12px; color: #4A5568; line-height: 1.5;">
                      Never share this code with anyone. If you did not initiate this request, lock your account immediately.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #718096;">
                Need emergency support? Contact the 24/7 Clinical Trauma Desk at <a href="mailto:support@bloodmatch.org" style="color: #D72638; text-decoration: none; font-weight: 600;">support@bloodmatch.org</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F6; padding: 28px 36px; border-top: 1px solid #EFEAE8; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #A0AEC0; line-height: 1.5;">
                BloodMatch Transfusion Network • Emergency Operations Registry<br>
                Dispatched to <span style="color: #4A5568;">${userEmail}</span>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #A0AEC0;">
                © 2026 BloodMatch Clinical Network. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 2. Generates the Password Reset Email HTML
 */
export function generatePasswordResetEmailHtml(options: PasswordResetEmailOptions): string {
  const {
    userName,
    userEmail,
    resetUrl,
    resetCode = 'BM-' + Math.floor(100000 + Math.random() * 900000),
    requestTime = new Date().toUTCString(),
    requestLocation = 'Clinical Terminal Access Point',
    requestIp = 'Encrypted Proxy Relay',
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your BloodMatch Clinical Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EF; color: #1A1D20; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; font-size: 1px; color: #F5F1EF; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Reset instructions for your BloodMatch security credentials.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F5F1EF;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D9C7C2; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #7A0C17 0%, #D72638 100%); padding: 32px 36px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 44px; height: 44px; background-color: #FFFFFF; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 44px; color: #D72638;">🩸</span>
                        </td>
                        <td style="padding-left: 14px;">
                          <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.1;">
                            Blood<span style="color: #FFB3BA;">Match</span>
                          </div>
                          <div style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">
                            Credential Recovery Protocol
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); border-radius: 100px; font-size: 11px; font-weight: 600; color: #FFFFFF;">
                      🔑 Access Reset
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 36px 32px 36px; text-align: left;">
              <div style="display: inline-block; padding: 5px 12px; background-color: #FDF2F4; border: 1px solid rgba(215, 38, 56, 0.25); border-radius: 100px; font-size: 11px; font-weight: 700; color: #D72638; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                Security Credential Reset
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #1A1D20; letter-spacing: -0.5px; line-height: 1.3;">
                Password Reset Request
              </h1>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4A5568;">
                Hello <strong style="color: #1A1D20;">${userName}</strong>, click the button below to establish a new password for your BloodMatch clinical account:
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="background-color: #D72638; border-radius: 12px; color: #FFFFFF; display: inline-block; font-size: 15px; font-weight: 700; line-height: 50px; text-align: center; text-decoration: none; width: 280px; box-shadow: 0 6px 20px rgba(215, 38, 56, 0.35);">
                      Reset Security Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Manual Code -->
              <div style="background-color: #FAF7F6; border: 1px solid #EFEAE8; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; text-align: center;">
                <div style="font-size: 12px; color: #718096; margin-bottom: 6px;">
                  Alternatively, enter this manual recovery code in your terminal:
                </div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 800; color: #7A0C17; letter-spacing: 4px;">
                  ${resetCode}
                </div>
              </div>

              <!-- Telemetry -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin: 20px 0;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 12px; color: #64748B; line-height: 1.6;">
                    <strong>Dispatch Telemetry:</strong><br>
                    • Requested Time: <span style="color: #334155;">${requestTime}</span><br>
                    • Location: <span style="color: #334155;">${requestLocation}</span><br>
                    • Terminal IP: <span style="font-family: monospace; color: #334155;">${requestIp}</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: #A0AEC0;">
                🔒 If you did not make this request, you can safely ignore this email. This link expires in <strong>30 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F6; padding: 28px 36px; border-top: 1px solid #EFEAE8; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #A0AEC0; line-height: 1.5;">
                BloodMatch Transfusion Network • Dispatched to <span style="color: #4A5568;">${userEmail}</span>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #A0AEC0;">
                © 2026 BloodMatch Clinical Network. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 3. Generates the Welcome & Thank You Email HTML
 */
export function generateThankYouEmailHtml(options: ThankYouEmailOptions): string {
  const {
    userName,
    userEmail,
    userRole = 'Verified Voluntary Donor / Clinician',
    userFacility = 'Metro Transfusion Center',
    userPhone = '+91 98765 43210',
    portalUrl = 'https://blood-match-software.bloodmatch-support.workers.dev',
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BloodMatch — Thank You for Registering</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EF; color: #1A1D20; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F5F1EF;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D9C7C2; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #7A0C17 0%, #D72638 100%); padding: 36px 36px 32px 36px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 44px; height: 44px; background-color: #FFFFFF; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 44px; color: #D72638;">🩸</span>
                        </td>
                        <td style="padding-left: 14px;">
                          <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.1;">
                            Blood<span style="color: #FFB3BA;">Match</span>
                          </div>
                          <div style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">
                            Emergency Transfusion Network
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); border-radius: 100px; font-size: 11px; font-weight: 600; color: #FFFFFF;">
                      ✨ Verified Member
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 36px 32px 36px; text-align: left;">
              <div style="display: inline-block; padding: 5px 12px; background-color: #FDF2F4; border: 1px solid rgba(215, 38, 56, 0.25); border-radius: 100px; font-size: 11px; font-weight: 700; color: #D72638; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                Registration Confirmed
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; color: #1A1D20; letter-spacing: -0.5px; line-height: 1.3;">
                Thank You for Joining BloodMatch!
              </h1>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4A5568;">
                Welcome <strong style="color: #1A1D20;">${userName}</strong>! Your enrollment in the emergency blood compatibility and voluntary mobilization ledger is now active.
              </p>

              <!-- Mission Box -->
              <div style="background: linear-gradient(135deg, #FFF5F5 0%, #FAF0EE 100%); border: 1px solid #F5C6CB; border-radius: 14px; padding: 20px 22px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 800; color: #7A0C17; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                  🌟 Every Drop Saves a Life
                </div>
                <div style="font-size: 13px; color: #4A5568; line-height: 1.5;">
                  Every certified donor and registered clinician bridges the gap in critical trauma cases, open-heart surgeries, and blood bank shortfalls.
                </div>
              </div>

              <!-- Profile Details -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F6; border: 1px solid #EFEAE8; border-radius: 12px; margin: 20px 0 28px 0;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #7A0C17; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                      Verified Profile Summary
                    </div>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #4A5568;">
                      <tr>
                        <td style="padding: 4px 0; width: 40%; color: #718096;">Role:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #1A1D20;">${userRole}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #718096;">Facility:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #1A1D20;">${userFacility}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #718096;">Contact:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #1A1D20;">${userPhone}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #718096;">Status:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #2E7D32;">● Active & Ready</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" style="background-color: #D72638; border-radius: 12px; color: #FFFFFF; display: inline-block; font-size: 15px; font-weight: 700; line-height: 50px; text-align: center; text-decoration: none; width: 280px; box-shadow: 0 6px 20px rgba(215, 38, 56, 0.35);">
                      Launch Transfusion Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F6; padding: 28px 36px; border-top: 1px solid #EFEAE8; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #A0AEC0; line-height: 1.5;">
                BloodMatch Transfusion Network • Dispatched to <span style="color: #4A5568;">${userEmail}</span>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #A0AEC0;">
                © 2026 BloodMatch Clinical Network. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 4. Generates the Password Changed Security Alert Email HTML
 */
export function generatePasswordChangedEmailHtml(options: PasswordChangedEmailOptions): string {
  const {
    userName,
    userEmail,
    changeTime = new Date().toUTCString(),
    changeIp = '127.0.0.1 (Authorized Terminal)',
    changeDevice = 'Secure Browser / Workstation',
    loginUrl = 'https://blood-match-software.bloodmatch-support.workers.dev/login',
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: Password Changed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EF; color: #1A1D20; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F5F1EF;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D9C7C2; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #7A0C17 0%, #D72638 100%); padding: 32px 36px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 44px; height: 44px; background-color: #FFFFFF; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 44px; color: #D72638;">🩸</span>
                        </td>
                        <td style="padding-left: 14px;">
                          <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.1;">
                            Blood<span style="color: #FFB3BA;">Match</span>
                          </div>
                          <div style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">
                            Security Audit & Operations
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); border-radius: 100px; font-size: 11px; font-weight: 600; color: #FFFFFF;">
                      🛡️ Security Notification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 36px 32px 36px; text-align: left;">
              <div style="display: inline-block; padding: 5px 12px; background-color: #E8F5E9; border: 1px solid rgba(46, 125, 50, 0.25); border-radius: 100px; font-size: 11px; font-weight: 700; color: #2E7D32; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                ✓ Credentials Updated Successfully
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #1A1D20; letter-spacing: -0.5px; line-height: 1.3;">
                Your Password Has Been Reset
              </h1>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4A5568;">
                Hello <strong style="color: #1A1D20;">${userName}</strong>, this message confirms that your BloodMatch security credentials were successfully updated on <strong>${changeTime}</strong>.
              </p>

              <!-- Telemetry -->
              <div style="background-color: #FAF7F6; border: 1px solid #EFEAE8; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #7A0C17; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Session Update Telemetry
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; color: #64748B;">
                  <tr>
                    <td style="padding: 3px 0; width: 35%;">IP Address:</td>
                    <td style="padding: 3px 0; font-family: monospace; color: #334155; font-weight: bold;">${changeIp}</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">Device / Client:</td>
                    <td style="padding: 3px 0; color: #334155;">${changeDevice}</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">Timestamp:</td>
                    <td style="padding: 3px 0; color: #334155;">${changeTime}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${loginUrl}" style="background-color: #F5F1EF; border: 1px solid #D9C7C2; border-radius: 12px; color: #1A1D20; display: inline-block; font-size: 14px; font-weight: 700; padding: 12px 28px; text-decoration: none;">
                  Sign In With New Password &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F6; padding: 28px 36px; border-top: 1px solid #EFEAE8; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #A0AEC0; line-height: 1.5;">
                BloodMatch Transfusion Network • Dispatched to <span style="color: #4A5568;">${userEmail}</span>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #A0AEC0;">
                © 2026 BloodMatch Clinical Network. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

