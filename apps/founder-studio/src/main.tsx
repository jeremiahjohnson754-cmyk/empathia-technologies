import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Shell } from './components/Shell';
import { useRoute } from './lib/router';
import { DESTINATIONS } from './nav';
import { productBySlug } from './data/products';
import { MissionControl } from './pages/MissionControl';
import { EnterprisePlatform } from './pages/EnterprisePlatform';
import { BuildARoom } from './pages/BuildARoom';
import { ProductPage } from './pages/ProductPage';
import { Scenarios } from './pages/Scenarios';
import { MediaLibrary } from './pages/MediaLibrary';
import { Architecture } from './pages/Architecture';
import { Docs } from './pages/Docs';
import { Maturity } from './pages/Maturity';
import { Vault } from './pages/Vault';
import { Settings } from './pages/Settings';
import '@empathia/design-tokens/tokens.css';
import './styles/studio.css';

function Page() {
  const r = useRoute();
  switch (r.path) {
    case 'mission-control': return <MissionControl />;
    case 'enterprise-platform': return <EnterprisePlatform />;
    case 'build-a-room': return <BuildARoom />;
    case 'scenarios': return <Scenarios />;
    case 'media': return <MediaLibrary />;
    case 'architecture': return <Architecture />;
    case 'docs': return <Docs />;
    case 'maturity': return <Maturity />;
    case 'vault': return <Vault />;
    case 'settings': return <Settings />;
    default: {
      const d = DESTINATIONS.find((x) => x.path === r.path);
      const p = d?.product ? productBySlug(d.product) : undefined;
      if (p) return <ProductPage p={p} key={p.slug} />;
      return (
        <div className="stack">
          <h1>Nothing at “{r.path}”</h1>
          <p className="muted">That address is not one of the studio’s destinations. Use the list on the left, or search with Ctrl K.</p>
          <a className="btn" href="#/mission-control">Go to Mission Control</a>
        </div>
      );
    }
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><Shell><Page /></Shell></StrictMode>);
