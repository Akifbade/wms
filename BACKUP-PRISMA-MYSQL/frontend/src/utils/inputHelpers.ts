/**
 * Input Helper Functions
 * Solves the "0 stuck in input field" problem
 */

/**
 * Safely parse number input without forcing 0 for empty strings
 * Returns empty string if input is empty, otherwise returns the parsed number
 */
export const parseNumberInput = (value: string, isFloat: boolean = false): number | string => {
  // If empty or whitespace, return empty string (allows clearing the field)
  if (value === '' || value.trim() === '') {
    return '';
  }
  
  // Parse as number
  const parsed = isFloat ? parseFloat(value) : parseInt(value);
  
  // If invalid number (NaN), return empty string
  if (isNaN(parsed)) {
    return '';
  }
  
  return parsed;
};

/**
 * Get safe number value for form submission
 * Converts empty string to 0 or specified default
 */
export const getSafeNumber = (value: number | string | undefined, defaultValue: number = 0): number => {
  if (value === '' || value === undefined || value === null) {
    return defaultValue;
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? defaultValue : num;
};

/**
 * Handle number input change
 * Use in onChange handler to allow empty fields without forcing 0
 */
export const handleNumberChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  callback: (value: number | string) => void,
  isFloat: boolean = false
) => {
  const parsed = parseNumberInput(e.target.value, isFloat);
  callback(parsed);
};
