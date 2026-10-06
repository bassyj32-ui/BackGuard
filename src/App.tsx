import { useCallback, useMemo, useRef, useState } from 'react';
import type { Exercise } from './data/exercises';
import { EXERCISES } from './data/exercises';
import TownView, { goalFor } from './game/TownView';
import Play from './game/Play';
import History from './game/History';
import Learn from './game/Learn';
import Safety from './game/Safety';
import { playDayComplete, unlockAudio } from './game/audio';
import { loadProgress, markDayComplete, recordRep, todayIso } from './state/progress';
import type { Progress } from './state/progress';
import { useSound } from './game/useSound';

type Route = 'town' | 'play' | 'history' | 'learn' | 'safety';

export default function App() {
  const [route, setRoute] = useState<Route>('town');
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [active, setActive] = useState<Exercise | null>(null);
  const [externalRep, setExternalRep] = useState<{ exerciseId: string; count: number } | null>(null);
  const sound = useSound();

  const today = progress.days.find((d) => d.date === todayIso());
  const dailySet = useMemo(() => EXERCISES, []);

  const repsToday = today ? Object.values(today.reps).reduce((a, b) => a + b, 0) : 0;

  const builtToday = useMemo(() => {
    if (!today) return 0;
    return dailySet.filter((e) => (today.reps[e.id] ?? 0) >= goalFor(e)).length;
  }, [today, dailySet]);

  const allBuilt = builtToday === dailySet.length && dailySet.length > 0;

  const handleRep = useCallback((exerciseId: string) => {
    const next = recordRep(exerciseId);
    setProgress(next);
  }, []);

  const handleExternalRepHandled = useCallback(() => setExternalRep(null), []);

  const handleSelect = useCallback((exercise: Exercise) => {
    unlockAudio();
    setActive(exercise);
    setRoute('play');
  }, []);

  const handleFinish = useCallback(() => {
    if (allBuilt) markDayComplete();
    const next = loadProgress();
    setProgress(next);
    setActive(null);
    setRoute('town');
  }, [allBuilt]);

  const handleExit = useCallback(() => {
    setActive(null);
    setRoute('town');
  }, []);

  // Reaching a fully built town is the moment worth celebrating.
  const celebrated = useRef(false);
  if (allBuilt && !celebrated.current) {
    celebrated.current = true;
    playDayComplete();
  }
  if (!allBuilt) celebrated.current = false;

  return (
    <div className={`app${route === 'town' || route === 'play' ? ' app--fixed' : ' app--scroll'}`}>
      {route === 'town' && (
        <>
          <header className="masthead">
            <div className="masthead__brand">
              <h1 className="masthead__title">BackGuard</h1>
              <p className="masthead__sub">three minutes, every day</p>
            </div>
            <button
              className="icon-button icon-button--ghost"
              onClick={() => sound.toggle()}
              aria-label={sound.enabled ? 'Mute sound' : 'Unmute sound'}
              aria-pressed={sound.enabled}
            >
              {sound.enabled ? '♪' : '×'}
            </button>
          </header>

          <div className="town-frame">
            <TownView
              progress={progress}
              repsToday={repsToday}
              onRep={handleRep}
              onCoach={handleSelect}
              externalRep={externalRep}
              onExternalRepHandled={handleExternalRepHandled}
            />
            <p className="town-frame__hint">
              Tap a plot to do its reps. Each plot builds as you go.
            </p>
          </div>

          <ProgressStrip progress={progress} exercises={dailySet} repsToday={repsToday} />

          {allBuilt && (
            <p className="town-frame__complete" role="status">
              Every plot is built. That is the whole day done.
            </p>
          )}
        </>
      )}

      {route === 'play' && active && (
        <Play
          exercise={active}
          repsDone={today?.reps[active.id] ?? 0}
          onRep={handleRep}
          onFinish={handleFinish}
          onExit={handleExit}
        />
      )}

      {route === 'history' && <History progress={progress} onBack={() => setRoute('town')} />}

      {route === 'learn' && <Learn onBack={() => setRoute('town')} />}

      {route === 'safety' && <Safety onBack={() => setRoute('town')} />}

      {route !== 'play' && (
        <nav className="tabs" aria-label="Main">
          <Tab route="town" current={route} onSelect={setRoute} label="Town" />
          <Tab route="history" current={route} onSelect={setRoute} label="Streaks" />
          <Tab route="learn" current={route} onSelect={setRoute} label="Why" />
          <Tab route="safety" current={route} onSelect={setRoute} label="Safety" />
        </nav>
      )}
    </div>
  );
}

function Tab({
  route,
  current,
  onSelect,
  label,
}: {
  route: Route;
  current: Route;
  onSelect: (r: Route) => void;
  label: string;
}) {
  return (
    <button
      className={`tabs__button${current === route ? ' tabs__button--active' : ''}`}
      onClick={() => onSelect(route)}
      aria-current={current === route ? 'page' : undefined}
    >
      {label}
    </button>
  );
}

/** Seven pips, one per plot. Fills as the town builds. */
function ProgressStrip({
  progress,
  exercises,
  repsToday,
}: {
  progress: Progress;
  exercises: Exercise[];
  repsToday: number;
}) {
  const today = progress.days[0];
  return (
    <div className="strip">
      <div className="strip__row" role="img" aria-label={`${repsToday} reps done today`}>
        {exercises.map((exercise) => {
          const done = today?.reps[exercise.id] ?? 0;
          const goal = goalFor(exercise);
          const pct = goal > 0 ? Math.min(1, done / goal) : 0;
          return (
            <span key={exercise.id} className="pip" title={exercise.name}>
              <span
                className={`pip__fill${pct >= 1 ? ' pip__fill--full' : ''}`}
                style={{ width: `${pct * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <div className="strip__meta">
        <span>
          <strong>{repsToday}</strong> reps today
        </span>
        <span>
          streak <strong>{progress.currentStreak}</strong>
        </span>
        <span>
          best <strong>{progress.longestStreak}</strong>
        </span>
      </div>
    </div>
  );
}
