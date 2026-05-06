type ShareLinkResult = 'shared' | 'copied' | 'unavailable' | 'cancelled';

function fallbackCopyTextToClipboard(text: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const selection = window.getSelection();
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);

    if (selection) {
      selection.removeAllRanges();
      if (previousRange) {
        selection.addRange(previousRange);
      }
    }

    activeElement?.focus();
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text.trim()) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopyTextToClipboard(text);
    }
  }

  return fallbackCopyTextToClipboard(text);
}

export async function shareLink(
  url: string,
  data?: { title?: string; text?: string }
): Promise<ShareLinkResult> {
  if (!url.trim()) {
    return 'unavailable';
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        url,
        title: data?.title,
        text: data?.text,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  return (await copyTextToClipboard(url)) ? 'copied' : 'unavailable';
}
