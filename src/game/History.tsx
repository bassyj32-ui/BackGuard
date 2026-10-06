import type { Progress } from '../state/progress';

interface HistoryProps {
  progress: Progress;
  onBack: () => void;
}

/** Streak history as a calendar strip: recent weeks of completed days. */
export default function History({ progress, onBack }: HistoryProps) {
  const completed = new Set(progress.days.filter((d) => d.dayComplete).map((d) => d.date));
  const repsByDate = new Map(progress.days.map((d) => [d.date, Object.values(d.reps).reduce((a, b) => a + b, 0)]));

  // Six weeks ending today, oldest first.
  const weeks: Array<Array<string>> = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let w = 5; w >= 0; w--) {
    const week: string[] = [];
    for (let d = 6; d >= 0; d--) {
      const cell = new Date(today);
      cell.setDate(cell.getDate() - w * 7 - d);
      week.push(cell.toISOString().slice(0, 10));
    }
    weeks.push(week);
  }

  return (
    <div className="page">
      <header className="page__bar">
        <button className="icon-button" onClick={onBack} aria-label="Back to town">
          ←
        </button>
        <h1 className="page__title">Streaks</h1>
      </header>

      <section className="panel-row">
        <div className="panel">
          <span className="panel__value">{progress.currentStreak}</span>
          <span className="panel__label">current streak</span>
        </div>
        <div className="panel">
          <span className="panel__value">{progress.longestStreak}</span>
          <span className="panel__label">best streak</span>
        </div>
        <div className="panel">
          <span className="panel__value">{completed.size}</span>
          <span className="panel__label">days finished</span>
        </div>
      </section>

      <h2 className="section-heading">Last six weeks</h2>
      <div className="calendar" role="img" aria-label="Completed days over the last six weeks">
        {weeks.map((week) => (
          <div className="calendar__week" key={week[0]}>
            {week.map((date) => {
              const reps = repsByDate.get(date) ?? 0;
              const done = completed.has(date);
              const cls = done ? 'cell cell--done' : reps > 0 ? 'cell cell--partial' : 'cell';
              return <span key={date} className={cls} title={`${date}: ${reps} reps`} />;
            })}
          </div>
        ))}
      </div>
      <div className="calendar__legend">
        <span className="legend-item">
          <span className="cell cell--done" /> finished
        </span>
        <span className="legend-item">
          <span className="cell cell--partial" /> partial
        </span>
        <span className="legend-item">
          <span className="cell" /> none
        </span>
      </div>

      <h2 className="section-heading">Recent days</h2>
      {progress.days.length === 0 ? (
        <p className="muted">
          Nothing yet. Tap a plot in your town and its first rep will appear here.
        </p>
      ) : (
        <ul className="day-list">
          {progress.days.slice(0, 10).map((day) => (
            <li key={day.date} className="day-row">
              <span className="day-row__date">{day.date}</span>
              <span className="day-row__reps">
                {Object.values(day.reps).reduce((a, b) => a + b, 0)} reps
              </span>
              <span className={`day-row__flag${day.dayComplete ? ' day-row__flag--done' : ''}`}>
                {day.dayComplete ? 'finished' : 'partial'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
