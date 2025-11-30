import { useState, useCallback } from 'react';

interface CopyResult {
  success: boolean;
  error?: Error;
}

/**
 * useCopyToClipboard Hook
 * Provides a simple way to copy text to clipboard with status tracking
 * 
 * @returns [copiedText, copyToClipboard, resetCopied]
 * - copiedText: The text that was last copied (null if nothing copied yet)
 * - copyToClipboard: Function to copy text, returns success status
 * - resetCopied: Function to reset the copied state
 * 
 * @example
 * const [copiedText, copyToClipboard, resetCopied] = useCopyToClipboard();
 * 
 * const handleCopy = async () => {
 *   const result = await copyToClipboard('Hello World');
 *   if (result.success) {
 *     toast.success('Copied to clipboard!');
 *   }
 * };
 * 
 * // Auto-reset after 2 seconds
 * useEffect(() => {
 *   if (copiedText) {
 *     const timer = setTimeout(resetCopied, 2000);
 *     return () => clearTimeout(timer);
 *   }
 * }, [copiedText, resetCopied]);
 */
function useCopyToClipboard(): [
  string | null,
  (text: string) => Promise<CopyResult>,
  () => void
] {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string): Promise<CopyResult> => {
    // Check if Clipboard API is available
    if (!navigator?.clipboard) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopiedText(text);
          return { success: true };
        } else {
          return { success: false, error: new Error('Copy command failed') };
        }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error : new Error('Failed to copy') 
        };
      }
    }

    // Modern Clipboard API
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      return { success: true };
    } catch (error) {
      setCopiedText(null);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to copy') 
      };
    }
  }, []);

  const resetCopied = useCallback(() => {
    setCopiedText(null);
  }, []);

  return [copiedText, copyToClipboard, resetCopied];
}

export default useCopyToClipboard;
