'use server';

import { translatePost } from '@/ai/flows/translate-post-flow';

/**
 * Server action to handle post translation requests.
 */
export async function translatePostAction(content: string, targetLanguage: string = 'English') {
  try {
    if (!content || !content.trim()) {
      return { success: false, error: 'Empty content' };
    }

    const result = await translatePost({
      content,
      targetLanguage,
    });

    return { 
      success: true, 
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage 
    };
  } catch (error: any) {
    console.error('Translation error:', error);
    return { success: false, error: error.message || 'Failed to translate' };
  }
}
