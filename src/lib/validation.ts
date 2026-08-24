const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "Email is required.";
  if (trimmed.length > 255) return "Email is too long.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return "Invalid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Display name is required.";
  if (trimmed.length < 2) return "Display name must be at least 2 characters.";
  if (trimmed.length > 255) return "Display name is too long.";
  return null;
}

export function validateListingTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Title is required.";
  if (trimmed.length < 3) return "Title must be at least 3 characters.";
  if (trimmed.length > 255) return "Title is too long.";
  return null;
}

export function validateListingDescription(description: string): string | null {
  if (!description.trim()) return null; // optional
  if (description.length > 5000) return "Description is too long (max 5000 characters).";
  return null;
}

const MIN_BID_CENTS = 100; // $1.00 minimum bid

export function validateBidAmount(amount: unknown): string | null {
  if (amount === undefined || amount === null) return "Bid amount is required.";
  const num = Number(amount);
  if (!Number.isFinite(num)) return "Bid amount must be a number.";
  if (!Number.isInteger(num)) return "Bid amount must be a whole number (in cents).";
  if (num < MIN_BID_CENTS) return `Minimum bid is ₹${(MIN_BID_CENTS / 100).toFixed(2)}.`;
  if (num > 100_000_000) return "Bid amount is too large."; // $1M cap
  return null;
}

export { MIN_BID_CENTS };

export function validateUrl(url: string): string | null {
  if (!url) return null; // optional
  if (url.length > 512) return "URL is too long.";
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL.";
  }
}
