import { getDailySet } from '../data/exercises';
import type { Exercise } from '../data/exercises';
import type { Progress } from '../state/progress';

interface HomeProps {
  progress: Progress;
  onStart: (exercise: Exercise) => void;
}

export default function Home({ progress, onStart }: HomeProps) {
  const today = progress.days.find((d) => d.date === new Date().toISOString().slice(0, 10));
  const repsToday = today ? Object.values(today.reps).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">BackGuard</h1>
        <p className="screen__lede">Three minutes today. That is the whole ask.</p>
      </header>

      <section className="stat-row" aria-label="Your progress">
        <div className="stat">
          <span className="stat__value">{progress.currentStreak}</span>
          <span className="stat__label">day streak</span>
        </div>
        <div className="stat">
          <span className="stat__value">{progress.longestStreak}</span>
          <span className="stat__label">best streak</span>
        </div>
        <div className="stat">
          <span className="stat__value">{repsToday}</span>
          <span className="stat__label">reps today</span>
        </div>
      </section>

      <h2 className="section-heading">Today's set</h2>
      <ul className="exercise-list">
        {getDailySet().map((exercise) => (
          <li key={exercise.id}>
            <button className="exercise-row" onClick={() => onStart(exercise)}>
              <span className="exercise-row__main">
                <span className="exercise-row__name">{exercise.name}</span>
                <span className="exercise-row__summary">{exercise.summary}</span>
              </span>
              <DoseLabel exercise={exercise} />
            </button>
          </li>
        ))}
      </ul>

      <p className="section-note">
        Most people at risk feel nothing at first. The point of these exercises is to keep the
        movement habit going before problems start, and to manage things if they already have.
      </p>
    </div>
  );
}

function DoseLabel({ exercise }: { exercise: Exercise }) {
  const parts: string[] = [];
  if (exercise.reps !== undefined) {
    parts.push(`${exercise.reps} reps${exercise.sides === 2 ? ' each side' : ''}`);
  }
  if (exercise.holdSeconds !== undefined) {
    parts.push(`${exercise.holdSeconds}s hold${exercise.sides === 2 ? ' each side' : ''}`);
  }
  return <span className="exercise-row__dose">{parts.join(' · ')}</span>;
}