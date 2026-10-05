import { useCallback, useState } from 'react';
import Home from './screens/Home';
import Session from './screens/Session';
import ProgressScreen from './screens/Progress';
import Learn from './screens/Learn';
import Safety from './screens/Safety';
import type { Exercise } from './data/exercises';
import { loadProgress, markDayComplete, type Progress } from './state/progress';

type Route = 'home' | 'progress' | 'learn' | 'safety' | 'session';

const TABS: ReadonlyArray<{ route: Exclude<Route, 'session'>; label: string }> = [
  { route: 'home', label: 'Today' },
  { route: 'progress', label: 'Progress' },
  { route: 'learn', label: 'Why' },
  { route: 'safety', label: 'Safety' },
];

export default function App() {
  const [route, setRoute] = useState<Route>('home');
  const [active, setActive] = useState<Exercise | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  const start = useCallback((exercise: Exercise) => {
    setActive(exercise);
    setRoute('session');
  }, []);

  const finish = useCallback(
    () => {
      const next = markDayComplete();
      setProgress(next);
      setActive(null);
      setRoute('progress');
    },
    [],
  );

  const abort = useCallback(() => {
    setProgress(loadProgress());
    setActive(null);
    setRoute('home');
  }, []);

  return (
    <div className="app">
      {route === 'session' && active ? (
        <Session exercise={active} onExit={abort} onFinished={() => finish()} />
      ) : (
        <>
          {route === 'home' && <Home progress={progress} onStart={start} />}
          {route === 'progress' && <ProgressScreen progress={progress} onBack={() => setRoute('home')} />}
          {route === 'learn' && <Learn />}
          {route === 'safety' && <Safety />}

          <nav className="tabs" aria-label="Main">
            {TABS.map((tab) => (
              <button
                key={tab.route}
                className={`tabs__button${route === tab.route ? ' tabs__button--active' : ''}`}
                onClick={() => setRoute(tab.route)}
                aria-current={route === tab.route ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

