/**
 * Simple profanity filter
 * Uses a basic word list to detect offensive content
 */

const PROFANITY_WORDS = [
  // Common offensive terms (sample list - expand as needed)
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'damn',
  'bastard',
  'cunt',
  'dick',
  'piss',
  'cock',
  'pussy',
  'slut',
  'whore',
  // Add more as needed
];

/**
 * Check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase();
  
  return PROFANITY_WORDS.some(word => {
    // Check for exact word match with word boundaries
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(normalized);
  });
}

/**
 * Get list of profane words found in text
 */
export function findProfanity(text: string): string[] {
  const normalized = text.toLowerCase();
  const found: string[] = [];
  
  for (const word of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(normalized)) {
      found.push(word);
    }
  }
  
  return found;
}
