/**
 * OFFLINE TYPE SHIM — used only because this build environment cannot download @types/react.
 * It types the React APIs the studio uses, loosely for JSX (intrinsic elements accept any props). On a connected machine,
 * `pnpm install` brings @types/react and this folder can be deleted (tsconfig typeRoots then falls back to node_modules/@types).
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
  export const StrictMode: (props: { children?: ReactNode }) => ReactElement;
  export type FC<P = {}> = (props: P) => ReactElement | null;
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
  interface ShimEvent { target: any; currentTarget: any; key: string; metaKey: boolean; ctrlKey: boolean; preventDefault(): void }
  interface ShimProps { onChange?: (e: ShimEvent) => void; onClick?: (e: ShimEvent) => void; onKeyDown?: (e: ShimEvent) => void; onMouseDown?: (e: ShimEvent) => void; onMouseEnter?: (e: ShimEvent) => void; onError?: (e: ShimEvent) => void; [prop: string]: any }
  interface IntrinsicElements { [tag: string]: ShimProps }
  interface IntrinsicAttributes { key?: string | number | null }
  interface ElementChildrenAttribute { children: {} }
}
