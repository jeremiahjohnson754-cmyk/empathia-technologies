/** View as, for any page that offers a way to switch (the investor start's shelf, the owl page): switch to a role or open the sheet. */
import { createContext, useContext } from 'react';
import type { RoleKey } from '../registry.types.js';
export const ViewAsContext = createContext<{ switchTo: (r: RoleKey) => void; open: () => void }>({ switchTo: () => undefined, open: () => undefined });
export const useViewAs = () => useContext(ViewAsContext);
