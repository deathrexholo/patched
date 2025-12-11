import { Post } from '../../../types/models';
import { User } from 'firebase/auth';

interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'fallback';
}

export const sharePost = async (
  postId: string,
  postData: Post,
  trackInteraction: (type: string, id: string, data: any) => void,
  currentUser: User | null
): Promise<ShareResult> => {
  const shareUrl = `${window.location.origin}/post/${postId}`;
  const shareText = `Check out this post by ${postData.userDisplayName}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'AmaPlayer Post',
        text: shareText,
        url: shareUrl
      });
      
      trackInteraction('share', postId, {
        postId,
        method: 'native',
        userId: currentUser?.uid
      });
      return { success: true, method: 'native' };
    } catch (error) {
      // Fall back to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    trackInteraction('share', postId, {
      postId,
      method: 'clipboard',
      userId: currentUser?.uid
    });
    return { success: true, method: 'clipboard' };
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return { success: true, method: 'fallback' };
  }
};
