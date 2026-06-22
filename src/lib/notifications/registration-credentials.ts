function buildRegistrationEmailHtml(params: {
  companyName: string;
  employeeName: string;
  mobileNumber: string;
  email: string;
  password: string;
}): string {
  const { companyName, employeeName, mobileNumber, email, password } = params;
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; color: #0f172a;">
      <p>Hello <strong>${employeeName}</strong>,</p>
      <p>Welcome to <strong>${companyName}</strong> on AURA. Your account has been created successfully.</p>
      <p style="margin: 20px 0 8px; font-weight: 600;">Please save these sign-in credentials:</p>
      <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;">Username</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
            Mobile: <strong>${mobileNumber}</strong><br/>
            Email: <strong>${email}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #64748b;">Password</td>
          <td style="padding: 12px 16px;">
            The password you chose during registration. For security it is not included in this email.
          </td>
        </tr>
      </table>
      <p style="margin-top: 16px; font-size: 14px; color: #64748b;">
        Use your <strong>mobile number</strong> or <strong>email</strong> with the password you set during
        registration. Keep your password private and do not share it.
      </p>
    </div>
  `.trim();
}

export async function sendRegistrationCredentialsEmail(params: {
  companyName: string;
  employeeName: string;
  mobileNumber: string;
  email: string;
  password: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "AURA <onboarding@resend.dev>";
  if (!apiKey || !params.email.trim()) {
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.email.trim()],
      subject: `${params.companyName} — Your AURA sign-in credentials`,
      html: buildRegistrationEmailHtml(params),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Resend registration credentials failed]", res.status, errText.slice(0, 300));
    return false;
  }

  return true;
}
