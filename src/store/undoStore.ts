import { create } from 'zustand';

/**
 * Holds the one thing a user might want back.
 *
 * Deletes happen inside a modal that closes immediately, so the toast has to
 * outlive the screen that triggered it — which is why this is a store and not
 * component state. Only the most recent delete is kept; a second delete
 * replaces the first.
 */
export type UndoAction = {
  /** shown in the toast, e.g. "Lunch deleted" */
  label: string;
  undo: () => Promise<void>;
};

type UndoState = {
  pending: UndoAction | null;
  offer: (action: UndoAction) => void;
  run: () => Promise<void>;
  dismiss: () => void;
};

export const useUndoStore = create<UndoState>((set, get) => ({
  pending: null,

  offer: (action) => set({ pending: action }),

  run: async () => {
    const { pending } = get();
    if (!pending) return;

    // Clear first: the toast should disappear the moment it is tapped, not
    // after the database write comes back.
    set({ pending: null });
    await pending.undo();
  },

  dismiss: () => set({ pending: null }),
}));
