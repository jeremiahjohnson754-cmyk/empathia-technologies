/**
 * OFFLINE TYPE SHIM — used only because this build environment cannot download @types/react.
 * It types the React APIs the Founder Studio, packages/ui and apps/enterprise-web use, loosely for JSX (intrinsic elements accept
 * any props). On a connected machine, `pnpm install` brings @types/react and this folder can be deleted (each tsconfig's typeRoots
 * then falls back to node_modules/@types). Shared from tooling/types so there is one shim, not one per app.
 */
declare module 'react' {
  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
  export interface ReactElement { type: unknown; props: unknown; key: string | null }
  export interface RefObject<T> { current: T }
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useRef<T>(initial: T): RefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T | null>;
  export function useSyncExternalStore<T>(subscribe: (cb: () => void) => () => void, get: () => T, getServer?: () => T): T;
  export function useCallback<T extends (...args: never[]) => unknown>(fn: T, deps: readonly unknown[]): T;
  export function useId(): string;
  export interface Context<T> { Provider: (props: { value: T; children?: ReactNode }) => ReactElement; _t?: T }
  export function createContext<T>(initial: T): Context<T>;
  export function useContext<T>(c: Context<T>): T;
  export const Fragment: (props: { children?: ReactNode }) => ReactElement;
  export const StrictMode: (props: { children?: ReactNode }) => ReactElement;
  export type FC<P = {}> = (props: P) => ReactElement | null;
  /** Class components exist only for error boundaries (apps/enterprise-web/src/components/ErrorBoundary.tsx); hooks cannot catch render errors. */
  export class Component<P = {}, S = {}> {
    constructor(props: P);
    props: Readonly<P>; state: Readonly<S>;
    setState(s: Partial<S> | ((prev: Readonly<S>) => Partial<S>)): void;
    render(): ReactNode;
    componentDidCatch?(error: Error, info: { componentStack?: string | null }): void;
  }
}
declare module 'react/jsx-runtime' {
  export const jsx: unknown; export const jsxs: unknown; export const Fragment: unknown;
}
declare module 'react-dom/client' {
  export function createRoot(el: Element): { render(node: unknown): void };
}
declare module '*.css';
declare namespace JSX {
  type Element = import('react').ReactElement;
  /** Event handlers get a contextual type so callbacks are checked; other props are open in the shim. */
  interface ShimEvent { target: any; currentTarget: any; key: string; clientX: number; clientY: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; preventDefault(): void; stopPropagation(): void }
  interface ShimProps { onChange?: (e: ShimEvent) => void; onClick?: (e: ShimEvent) => void; onKeyDown?: (e: ShimEvent) => void; onMouseDown?: (e: ShimEvent) => void; onMouseEnter?: (e: ShimEvent) => void; onError?: (e: ShimEvent) => void; onSubmit?: (e: ShimEvent) => void; [prop: string]: any }
  interface IntrinsicElements { [tag: string]: ShimProps }
  interface IntrinsicAttributes { key?: string | number | null }
  interface ElementChildrenAttribute { children: {} }
}
declare module 'react-dom/server' {
  import type { ReactNode } from 'react';
  export function renderToStaticMarkup(node: ReactNode): string;
  export function renderToString(node: ReactNode): string;
}
