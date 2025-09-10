/**
 * Runtime validation schemas using Zod
 */
import { z } from 'zod';

/**
 * Business Card validation schema
 */
export const BusinessCardSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  companyName: z.string().min(1, '会社名は必須です').max(200, '会社名は200文字以内で入力してください'),
  title: z.string().max(100, '役職は100文字以内で入力してください').optional(),
  urls: z.array(z.string().url('有効なURLを入力してください')).max(10, 'URLは最大10個まで登録できます'),
  emails: z.array(z.string().email('有効なメールアドレスを入力してください')).max(5, 'メールアドレスは最大5個まで登録できます'),
  phones: z.array(z.string().regex(/^[\d\-\+\(\)\s]+$/, '有効な電話番号を入力してください')).max(5, '電話番号は最大5個まで登録できます'),
  line_ids: z.array(z.string().max(50)).max(3, 'LINE IDは最大3個まで登録できます'),
  businessContent: z.string().max(5000, '事業内容は5000文字以内で入力してください').optional(),
  exchangeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください').optional(),
  notes: z.string().max(10000, 'メモは10000文字以内で入力してください').optional(),
  frontImageBase64: z.string().optional(),
  backImageBase64: z.string().optional(),
  tags: z.array(z.string().max(30, 'タグは30文字以内で入力してください')).max(20, 'タグは最大20個まで登録できます').optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ValidatedBusinessCard = z.infer<typeof BusinessCardSchema>;

/**
 * Partial schema for updates
 */
export const BusinessCardUpdateSchema = BusinessCardSchema.partial();

/**
 * URL fetch request schema
 */
export const URLFetchRequestSchema = z.object({
  url: z.string().url('有効なURLを入力してください').max(2048, 'URLが長すぎます'),
});

/**
 * Multiple URLs analysis request schema
 */
export const URLsAnalysisRequestSchema = z.object({
  urls: z.array(z.string().url('有効なURLを入力してください'))
    .min(1, 'URLを少なくとも1つ指定してください')
    .max(20, 'URLは最大20個まで指定できます'),
});

/**
 * Validate and sanitize business card data
 */
export function validateBusinessCard(data: unknown): ValidatedBusinessCard {
  try {
    return BusinessCardSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`検証エラー: ${messages}`);
    }
    throw error;
  }
}

/**
 * Validate partial business card data for updates
 */
export function validateBusinessCardUpdate(data: unknown): Partial<ValidatedBusinessCard> {
  try {
    return BusinessCardUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`検証エラー: ${messages}`);
    }
    throw error;
  }
}

/**
 * Safe parse with error details
 */
export function safeParseBusinessCard(data: unknown): {
  success: boolean;
  data?: ValidatedBusinessCard;
  error?: string;
} {
  const result = BusinessCardSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const messages = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { success: false, error: messages };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  // Remove control characters except newlines and tabs
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(
  input: string[], 
  maxItems: number = 10, 
  maxItemLength: number = 200
): string[] {
  return input
    .slice(0, maxItems)
    .map(item => sanitizeString(item, maxItemLength))
    .filter(item => item.length > 0);
}