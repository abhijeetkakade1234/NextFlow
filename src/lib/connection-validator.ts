// src/lib/connection-validator.ts

export function isValidConnection(
  sourceType: string,
  targetType: string
): boolean {
  const RULES: Record<string, string[]> = {
    text:      ['text', 'system_prompt', 'user_message', 'number', 'timestamp'],
    image_url: ['image_url', 'images'],
    video_url: ['video_url'],
    number:    ['number', 'text'],
  }
  return RULES[sourceType]?.includes(targetType) ?? false
}
