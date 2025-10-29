// Utility functions for handling number inputs without stuck "0"

/**
 * Parse number input value without forcing 0 fallback
 * Returns empty string if invalid instead of 0
 */
export const parseNumberInput = (value: string): number | '' => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? '' : parsed;
};

/**
 * Parse integer input value without forcing 0 fallback
 * Returns empty string if invalid instead of 0
 */
export const parseIntInput = (value: string): number | '' => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? '' : parsed;
};

/**
 * Get number value for form submission
 * Converts empty string to 0 only when submitting
 */
export const getNumberValue = (value: number | '' | undefined): number => {
  return typeof value === 'number' ? value : 0;
};
