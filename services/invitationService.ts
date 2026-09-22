const AUTH_API_URL = (process.env.NEXT_PUBLIC_AUTH_API_URL ?? "").replace(/\/$/, "");
const ACCOUNT_TYPE = process.env.NEXT_PUBLIC_X_ACCOUNT_TYPE || "duluin_invoice";

export interface InvitationValidationResult {
  valid: boolean;
  message?: string;
}

/** Is the SSO activation token in the email still usable? (Same SSO endpoint acc-frontend calls.)
 *  Only a definite "no" blocks the page; a network hiccup lets the visitor continue, because the
 *  activation call itself rejects a bad token. */
export async function validateInvitationToken(token: string, email?: string | null): Promise<InvitationValidationResult> {
  if (!token) return { valid: false, message: "Invitation token is missing." };
  if (!AUTH_API_URL) return { valid: true };
  try {
    const res = await fetch(`${AUTH_API_URL}/validate-invitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Account-Type": ACCOUNT_TYPE },
      body: JSON.stringify({ token, ...(email ? { email } : {}), account_type: ACCOUNT_TYPE }),
    });
    if (res.status === 404) return { valid: true };
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.valid === false || data?.success === false) {
      return { valid: false, message: data?.message };
    }
    return { valid: true };
  } catch {
    return { valid: true };
  }
}

export interface ActivateInput {
  token: string;
  name: string;
  phone: string;
  password: string;
  password_confirmation: string;
}

/** Register a brand-new invitee: sets their name, phone and password and activates the SSO account. */
export async function activateInvitee(input: ActivateInput): Promise<void> {
  const res = await fetch(`${AUTH_API_URL}/activate_and_setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Account-Type": ACCOUNT_TYPE },
    body: JSON.stringify({ ...input, account_type: ACCOUNT_TYPE }),
  });
  const data = await res.json().catch(() => ({}));
  const payload = data?.result || data?.data || data;
  if (!res.ok || !payload?.activated) {
    const errors = data?.errors;
    const first = Array.isArray(errors) ? errors[0] : errors && typeof errors === "object" ? Object.values(errors)[0] : errors;
    throw new Error(String(Array.isArray(first) ? first[0] : first || data?.message || "Activation failed"));
  }
}
