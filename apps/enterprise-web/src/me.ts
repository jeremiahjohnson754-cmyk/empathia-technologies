import { createContext, useContext } from 'react';
import type { Me } from '@empathia/api-client';
export const MeContext = createContext<{ me: Me; can: (a: string | string[]) => boolean } | null>(null);
export function useMe() { const v = useContext(MeContext); if (!v) throw new Error('useMe outside the signed-in shell'); return v; }
