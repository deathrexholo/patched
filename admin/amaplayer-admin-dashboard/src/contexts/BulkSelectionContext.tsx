import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, Event } from '../types/models';
import { TalentVideo } from '../types/models/search';

export type BulkSelectableItem = User | TalentVideo | Event;

export interface BulkSelectionState {
  selectedItems: Map<string, BulkSelectableItem>;
  selectedCount: number;
  isAllSelected: boolean;
  currentPageItems: BulkSelectableItem[];
}

export interface BulkSelectionContextType {
  state: BulkSelectionState;
  selectItem: (item: BulkSelectableItem) => void;
  deselectItem: (itemId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelectAll: () => void;
  isItemSelected: (itemId: string) => boolean;
  setCurrentPageItems: (items: BulkSelectableItem[]) => void;
  getSelectedItems: () => BulkSelectableItem[];
  getSelectedItemsByType: <T extends BulkSelectableItem>(type: 'user' | 'video' | 'event') => T[];
}

const BulkSelectionContext = createContext<BulkSelectionContextType | undefined>(undefined);

export const useBulkSelection = (): BulkSelectionContextType => {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error('useBulkSelection must be used within a BulkSelectionProvider');
  }
  return context;
};

interface BulkSelectionProviderProps {
  children: ReactNode;
}

export const BulkSelectionProvider: React.FC<BulkSelectionProviderProps> = ({ children }) => {
  const [selectedItems, setSelectedItems] = useState<Map<string, BulkSelectableItem>>(new Map());
  const [currentPageItems, setCurrentPageItemsState] = useState<BulkSelectableItem[]>([]);

  const selectItem = useCallback((item: BulkSelectableItem) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      newMap.set(item.id, item);
      return newMap;
    });
  }, []);

  const deselectItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      currentPageItems.forEach(item => {
        newMap.set(item.id, item);
      });
      return newMap;
    });
  }, [currentPageItems]);

  const deselectAll = useCallback(() => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      currentPageItems.forEach(item => {
        newMap.delete(item.id);
      });
      return newMap;
    });
  }, [currentPageItems]);

  const toggleSelectAll = useCallback(() => {
    const allCurrentSelected = currentPageItems.every(item => selectedItems.has(item.id));
    if (allCurrentSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [currentPageItems, selectedItems, selectAll, deselectAll]);

  const isItemSelected = useCallback((itemId: string): boolean => {
    return selectedItems.has(itemId);
  }, [selectedItems]);

  const setCurrentPageItems = useCallback((items: BulkSelectableItem[]) => {
    setCurrentPageItemsState(items);
  }, []);

  const getSelectedItems = useCallback((): BulkSelectableItem[] => {
    return Array.from(selectedItems.values());
  }, [selectedItems]);

  const getSelectedItemsByType = useCallback(<T extends BulkSelectableItem>(
    type: 'user' | 'video' | 'event'
  ): T[] => {
    const items = Array.from(selectedItems.values());
    return items.filter(item => {
      if (type === 'user') return 'role' in item;
      if (type === 'video') return 'verificationStatus' in item;
      if (type === 'event') return 'title' in item && 'status' in item;
      return false;
    }) as T[];
  }, [selectedItems]);

  const selectedCount = selectedItems.size;
  const isAllSelected = currentPageItems.length > 0 && 
    currentPageItems.every(item => selectedItems.has(item.id));

  const state: BulkSelectionState = {
    selectedItems,
    selectedCount,
    isAllSelected,
    currentPageItems
  };

  const contextValue: BulkSelectionContextType = {
    state,
    selectItem,
    deselectItem,
    selectAll,
    deselectAll,
    toggleSelectAll,
    isItemSelected,
    setCurrentPageItems,
    getSelectedItems,
    getSelectedItemsByType
  };

  return (
    <BulkSelectionContext.Provider value={contextValue}>
      {children}
    </BulkSelectionContext.Provider>
  );
};