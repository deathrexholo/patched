// PostInteractionsStore - Manages post-specific interaction state with selective subscriptions
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useCallback } from 'react';

/**
 * Store for managing post interaction state (comments visibility, menus, editing, etc.)
 * 
 * This store is designed for selective subscriptions to prevent unnecessary re-renders.
 * Components should subscribe only to the specific state slices they need using the
 * usePostInteraction helper hook or custom selectors.
 * 
 * Example:
 * ```typescript
 * // Subscribe only to a specific post's comment visibility
 * const showComments = usePostInteractionsStore(
 *   useCallback((state) => state.showComments[postId], [postId])
 * );
 * ```
 */
interface PostInteractionsStore {
  // State - keyed by postId for efficient lookups
  showComments: Record<string, boolean>;
  showMenus: Record<string, boolean>;
  editingPost: string | null;
  editText: string;
  commentText: Record<string, string>;
  shareSuccess: Record<string, boolean>;
  
  // Actions
  toggleComments: (postId: string) => void;
  toggleMenu: (postId: string) => void;
  closeAllMenus: () => void;
  startEditing: (postId: string, text: string) => void;
  cancelEditing: () => void;
  setEditText: (text: string) => void;
  setCommentText: (postId: string, text: string) => void;
  setShareSuccess: (postId: string, success: boolean) => void;
  reset: () => void;
}

export const usePostInteractionsStore = create<PostInteractionsStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    showComments: {},
    showMenus: {},
    editingPost: null,
    editText: '',
    commentText: {},
    shareSuccess: {},
    
    // Toggle comment visibility for a specific post
    toggleComments: (postId: string) => set((state) => ({
      showComments: {
        ...state.showComments,
        [postId]: !state.showComments[postId]
      }
    })),
    
    // Toggle menu visibility for a specific post
    toggleMenu: (postId: string) => set((state) => ({
      showMenus: {
        ...state.showMenus,
        [postId]: !state.showMenus[postId]
      }
    })),
    
    // Close all open menus (useful when opening a new menu or clicking outside)
    closeAllMenus: () => set({ showMenus: {} }),
    
    // Start editing a post (closes all menus and sets edit state)
    startEditing: (postId: string, text: string) => set({
      editingPost: postId,
      editText: text,
      showMenus: {} // Close all menus when starting to edit
    }),
    
    // Cancel editing (clears edit state)
    cancelEditing: () => set({
      editingPost: null,
      editText: ''
    }),
    
    // Update the edit text for the currently editing post
    setEditText: (text: string) => set({ editText: text }),
    
    // Update comment text for a specific post
    setCommentText: (postId: string, text: string) => set((state) => ({
      commentText: {
        ...state.commentText,
        [postId]: text
      }
    })),
    
    // Set share success state for a specific post
    setShareSuccess: (postId: string, success: boolean) => set((state) => ({
      shareSuccess: {
        ...state.shareSuccess,
        [postId]: success
      }
    })),
    
    // Reset all state (useful for cleanup or logout)
    reset: () => set({
      showComments: {},
      showMenus: {},
      editingPost: null,
      editText: '',
      commentText: {},
      shareSuccess: {}
    })
  }))
);

/**
 * Helper hook for selective subscriptions to post-specific interaction state.
 * 
 * This hook subscribes only to the state relevant to a specific post, preventing
 * unnecessary re-renders when other posts' state changes.
 * 
 * @param postId - The ID of the post to subscribe to
 * @returns Object containing the post's interaction state
 * 
 * @example
 * ```typescript
 * const { showComments, showMenu, isEditing, commentText } = usePostInteraction(post.id);
 * ```
 */
export const usePostInteraction = (postId: string) => {
  const showComments = usePostInteractionsStore(
    useCallback((state) => state.showComments[postId] || false, [postId])
  );
  
  const showMenu = usePostInteractionsStore(
    useCallback((state) => state.showMenus[postId] || false, [postId])
  );
  
  const isEditing = usePostInteractionsStore(
    useCallback((state) => state.editingPost === postId, [postId])
  );
  
  const commentText = usePostInteractionsStore(
    useCallback((state) => state.commentText[postId] || '', [postId])
  );
  
  const editText = usePostInteractionsStore(
    useCallback((state) => state.editingPost === postId ? state.editText : '', [postId])
  );
  
  const shareSuccess = usePostInteractionsStore(
    useCallback((state) => state.shareSuccess[postId] || false, [postId])
  );
  
  return {
    showComments,
    showMenu,
    isEditing,
    commentText,
    editText,
    shareSuccess
  };
};
