/**
 * Hardening for the operational workspaces: each one is its own code-split chunk (apps/demo/build.mjs, ESM splitting), loaded when its
 * address is opened. Three things can go wrong, and none of them may leave a blank page or a silent console error:
 *   1. the chunk does not arrive (network hiccup, a new version published while the page was open) → a named alert ("The Dispatch board
 *      could not load"), what it means, and Try again, which imports the chunk again; after a second failure it also offers a reload;
 *   2. the workspace throws while rendering → the same named alert, with Try again re-mounting it (the workspace data is untouched);
 *   3. the chunk is slow → a labelled loading state with the workspace's name, announced politely, never a spinner alone.
 * A module that loaded once is kept, so going back to a workspace is instant.
 */
import { Component, useEffect, useState, type ReactElement, type ReactNode } from 'react';
type ComponentType<P> = (props: P) => ReactElement | null;

export interface WorkspaceProps { perspective: string; hash: string }
/** Loads the workspace module; `attempt` > 0 is a retry and must use a fresh URL (a failed module fetch is remembered by the page). */
type Loader = (attempt: number) => Promise<{ default: ComponentType<WorkspaceProps> }>;
const loaded = new Map<string, ComponentType<WorkspaceProps>>();

/** A named failure: the workspace that failed, why in plain words, Try again, and the way back to the start. */
export function WorkspaceFailure({ name, kind, attempts, onRetry }: { name: string; kind: 'load' | 'render'; attempts: number; onRetry: () => void }) {
  return (
    <section className="hz-fail" data-testid="workspace-failure" data-workspace={name} data-kind={kind}>
      <div role="alert" aria-labelledby="hz-fail-h">
        <h1 id="hz-fail-h">{kind === 'load' ? `${name} could not load` : `${name} stopped working`}</h1>
        <p>{kind === 'load'
          ? <>This part of the demonstration did not arrive in your browser. That is usually a brief network interruption, or a new version was published while this page was open. Nothing you did here was lost.</>
          : <>Something in this workspace failed while it was drawing the page. Your demonstration workspace (incidents, decisions, lab results) is kept in this browser and is unchanged.</>}</p>
        {attempts > 1 && kind === 'load' && <p className="ui-muted">Tried {attempts} times. If it keeps failing, reloading the page fetches the current version of the whole demonstration.</p>}
      </div>
      <div className="hz-fail__acts">
        <button type="button" className="ui-btn ui-btn--primary" data-testid="workspace-retry" onClick={onRetry}>Try again</button>
        {attempts > 1 && kind === 'load' && <button type="button" className="ui-btn" onClick={() => location.reload()}>Reload the page</button>}
        <a className="ui-btn ui-btn--quiet" href="#/investor">Back to the start</a>
      </div>
    </section>
  );
}

function Loading({ name }: { name: string }) {
  return (
    <section className="hz-load" aria-busy="true" data-testid="workspace-loading">
      <h1>{name}</h1>
      <p role="status" aria-live="polite">Loading the {name} workspace of this interactive demonstration…</p>
    </section>
  );
}

class RenderGuard extends Component<{ name: string; children: ReactNode; onReset: () => void }, { failed: boolean; n: number }> {
  state = { failed: false, n: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* the failure is shown in the page as a named alert; the workspace data is not touched */ }
  render() {
    if (this.state.failed) return <WorkspaceFailure name={this.props.name} kind="render" attempts={this.state.n + 1} onRetry={() => { this.setState((s) => ({ failed: false, n: s.n + 1 })); this.props.onReset(); }} />;
    return this.props.children;
  }
}

/** A code-split workspace with a name: loading state, named load failure with Try again, and a render guard. */
export function lazyWorkspace(name: string, load: Loader): ComponentType<WorkspaceProps> {
  function Lazy(props: WorkspaceProps) {
    const [Comp, setComp] = useState<ComponentType<WorkspaceProps> | null>(() => loaded.get(name) || null);
    const [failed, setFailed] = useState(0);
    const [tries, setTries] = useState(0);
    const [epoch, setEpoch] = useState(0);
    useEffect(() => {
      if (Comp) return;
      let live = true;
      load(tries).then((m) => { loaded.set(name, m.default); if (live) setComp(() => m.default); }, () => { if (live) setFailed((n) => n + 1); });
      return () => { live = false; };
    }, [tries]);   // eslint-disable-line react-hooks/exhaustive-deps
    if (!Comp && failed > tries) return <WorkspaceFailure name={name} kind="load" attempts={failed} onRetry={() => setTries(failed)} />;
    if (!Comp) return <Loading name={name} />;
    return <RenderGuard key={epoch} name={name} onReset={() => setEpoch((e) => e + 1)}><Comp {...props} /></RenderGuard>;
  }
  Lazy.displayName = `Workspace(${name})`;
  return Lazy;
}
