/** Normalises the various "is this field invalid" shapes (string message, boolean flag). */
export function hasFieldError(error?: string | boolean | null): boolean {
  if (typeof error === "string") return error.trim().length > 0;
  return error === true;
}

export function fieldErrorText(error?: string | boolean | null): string | undefined {
  return typeof error === "string" && error.trim() ? error : undefined;
}
