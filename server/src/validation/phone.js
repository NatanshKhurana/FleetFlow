// Preserve local/international formatting without assuming a country or digit count.
// Each parenthesized group contains digits; letters and misplaced plus signs fail.
export const phonePattern = /^\+?(?:[0-9]|\([0-9]+\))(?:[ .-]*(?:[0-9]|\([0-9]+\)))*$/;
export const phoneMessage = 'Enter a phone number using digits, an optional leading +, spaces, hyphens, dots, or parentheses.';
