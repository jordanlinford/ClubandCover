import OpenAI from 'openai';

// Initialize OpenAI client (will be null if OPENAI_API_KEY not set)
let openai: OpenAI | null = null;

export function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('[AI] OPENAI_API_KEY not configured - AI features disabled');
    return false;
  }
  
  openai = new OpenAI({ apiKey });
  console.log('[AI] OpenAI client initialized');
  return true;
}

export function isAIEnabled(): boolean {
  return openai !== null;
}

// Profanity filter helper (basic check)
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|damn|bitch|ass(?:hole)?|crap)\b/gi,
  // Add more patterns as needed
];

export function containsProfanity(text: string): boolean {
  return PROFANITY_PATTERNS.some(pattern => pattern.test(text));
}

export function sanitizeInput(text: string): string {
  // Remove potentially harmful content
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s.,!?'-]/g, '') // Keep only safe characters
    .trim();
}

// Generate a book blurb using OpenAI
export async function generateBlurb(params: {
  title: string;
  author: string;
  genres?: string[];
  subtitle?: string;
  currentBlurb?: string;
}): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI not initialized');
  }

  const { title, author, genres = [], subtitle, currentBlurb } = params;

  // Build context for the prompt
  const genresText = genres.length > 0 ? genres.join(', ') : 'General Fiction';
  const subtitleText = subtitle ? `\nSubtitle: ${subtitle}` : '';
  const currentBlurbText = currentBlurb ? `\n\nCurrent description: ${currentBlurb}` : '';

  const prompt = `Write a compelling, PG-13 book blurb for:

Title: ${title}
Author: ${author}${subtitleText}
Genres: ${genresText}${currentBlurbText}

Requirements:
- Maximum 120 words
- Engaging and professional tone
- No explicit content
- Focus on plot intrigue and themes
- Don't reveal major spoilers

Blurb:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a professional book marketer who writes compelling, concise book descriptions.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const blurb = response.choices[0]?.message?.content?.trim() || '';

  // Validate length and content
  const wordCount = blurb.split(/\s+/).length;
  if (wordCount > 130) {
    // Truncate if too long
    const words = blurb.split(/\s+/).slice(0, 120);
    return words.join(' ') + '...';
  }

  return blurb;
}

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI not initialized');
  }

  // Sanitize and truncate input
  const sanitized = sanitizeInput(text);
  const truncated = sanitized.slice(0, 8000); // OpenAI embedding limit

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated,
  });

  return response.data[0].embedding;
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

// Calculate genre overlap score
export function genreOverlapScore(genres1: string[], genres2: string[]): number {
  if (genres1.length === 0 || genres2.length === 0) {
    return 0;
  }

  const set1 = new Set(genres1.map(g => g.toLowerCase()));
  const set2 = new Set(genres2.map(g => g.toLowerCase()));
  
  let intersection = 0;
  set1.forEach(genre => {
    if (set2.has(genre)) {
      intersection++;
    }
  });

  const union = new Set([...set1, ...set2]).size;
  return intersection / union; // Jaccard similarity
}

// Generate text for embedding from entity
export function getEmbeddingText(entity: {
  name?: string;
  title?: string;
  author?: string;
  description?: string;
  genres?: string[];
  subtitle?: string;
}): string {
  const parts: string[] = [];

  if (entity.title) parts.push(entity.title);
  if (entity.name) parts.push(entity.name);
  if (entity.author) parts.push(`by ${entity.author}`);
  if (entity.subtitle) parts.push(entity.subtitle);
  if (entity.genres && entity.genres.length > 0) {
    parts.push(`Genres: ${entity.genres.join(', ')}`);
  }
  if (entity.description) parts.push(entity.description);

  return parts.join('. ');
}

/**
 * Check if content is toxic using AI moderation
 * Returns { safe: boolean, reason?: string }
 */
export async function checkToxicity(
  content: string
): Promise<{ safe: boolean; reason?: string }> {
  if (!openai) {
    throw new Error('OpenAI not initialized');
  }

  const prompt = `Analyze this message for toxicity, harassment, hate speech, or harmful content:

"${content}"

Respond with ONLY "SAFE" or "UNSAFE: [brief reason]"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content moderation assistant. Analyze messages for toxicity, harassment, hate speech, and harmful content. Be strict but fair.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content?.trim() || 'SAFE';

    if (result.startsWith('UNSAFE')) {
      const reason = result.replace('UNSAFE:', '').trim();
      return {
        safe: false,
        reason: reason || 'Content flagged as potentially toxic',
      };
    }

    return { safe: true };
  } catch (error) {
    // If AI check fails, default to safe (profanity filter is primary defense)
    console.error('AI toxicity check failed:', error);
    return { safe: true };
  }
}
