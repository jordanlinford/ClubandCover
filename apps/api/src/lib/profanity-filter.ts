/**
 * Basic profanity filter for display names
 * Uses a simple blocklist approach
 */

const BLOCKED_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'damn',
  'crap',
  'bastard',
  'dick',
  'cock',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
];

export function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const word of BLOCKED_WORDS) {
    if (normalized.includes(word)) {
      return true;
    }
  }
  
  return false;
}

export function validateDisplayName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters' };
  }
  
  if (name.length > 50) {
    return { valid: false, error: 'Display name must be 50 characters or less' };
  }
  
  if (!/^[a-zA-Z0-9\s._-]+$/.test(name)) {
    return { valid: false, error: 'Display name can only contain letters, numbers, spaces, dots, underscores, and hyphens' };
  }
  
  if (containsProfanity(name)) {
    return { valid: false, error: 'Display name contains inappropriate language' };
  }
  
  return { valid: true };
}
