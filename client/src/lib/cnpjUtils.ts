/**
 * Formats a CNPJ string with the standard mask (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(value: string): string {
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 14 digits
  const limited = numbers.slice(0, 14);
  
  // Apply mask
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 5) {
    return limited.replace(/(\d{2})(\d+)/, '$1.$2');
  } else if (limited.length <= 8) {
    return limited.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
  } else if (limited.length <= 12) {
    return limited.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
  } else {
    return limited.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
  }
}

/**
 * Removes CNPJ formatting, returning only digits
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Validates a CNPJ number using the official algorithm
 */
export function isValidCNPJ(cnpj: string): boolean {
  // Remove formatting
  const numbers = cleanCNPJ(cnpj);
  
  // Check length
  if (numbers.length !== 14) {
    return false;
  }
  
  // Check for known invalid patterns
  const invalidPatterns = [
    '00000000000000',
    '11111111111111',
    '22222222222222',
    '33333333333333',
    '44444444444444',
    '55555555555555',
    '66666666666666',
    '77777777777777',
    '88888888888888',
    '99999999999999'
  ];
  
  if (invalidPatterns.includes(numbers)) {
    return false;
  }
  
  // Calculate first check digit
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numbers[12]) !== firstDigit) {
    return false;
  }
  
  // Calculate second check digit
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(numbers[13]) === secondDigit;
}

/**
 * Checks if a string is a formatted CNPJ
 */
export function isFormattedCNPJ(value: string): boolean {
  const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
  return cnpjPattern.test(value);
}

/**
 * Gets a display-friendly CNPJ format
 */
export function getDisplayCNPJ(cnpj: string): string {
  const clean = cleanCNPJ(cnpj);
  return isValidCNPJ(clean) ? formatCNPJ(clean) : cnpj;
}
