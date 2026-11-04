/**
 * Adapter for page modules written before the page contract: wraps a named export that takes (perspective, hash, …) into a default
 * PageProps component, still loaded lazily. New pages export `default function Page(props: PageProps)` and need no adapter.
 */
import type { ComponentType, ReactElement } from 'react';
import type { PageProps } from './registry.types.js';

export const adapt = <M>(load: () => Promise<M>, render: (m: M, p: PageProps) => ReactElement) =>
  (): Promise<{ default: ComponentType<PageProps> }> => load().then((m) => ({ default: (p: PageProps) => render(m, p) }));
