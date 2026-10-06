import { EXERCISES, type EvidenceStrength } from '../data/exercises';
import Disclaimer from '../components/Disclaimer';

const EVIDENCE_COPY: Record<EvidenceStrength, string> = {
  strong: 'Good evidence',
  moderate: 'Moderate evidence',
  emerging: 'Limited evidence',
};

interface LearnProps {
  onBack: () => void;
}

/**
 * The "why" screen. Deliberately honest about where the evidence is thin, which
 * is the opposite of what a fitness app usually does.
 */
export default function Learn({ onBack }: LearnProps) {
  return (
    <div className="page">
      <header className="page__bar">
        <button className="icon-button" onClick={onBack} aria-label="Back to town">
          ←
        </button>
        <h1 className="page__title">Why these exercises</h1>
      </header>

      <p className="lede">
        Each one says how strong the evidence actually is, including where it is thin. You can
        skip an exercise you have a reason to avoid.
      </p>

      <ul className="learn-list">
        {EXERCISES.map((exercise) => (
          <li key={exercise.id} className="learn-card">
            <div className="learn-card__head">
              <h2 className="learn-card__name">{exercise.name}</h2>
              <span className={`badge badge--${exercise.evidence}`}>{EVIDENCE_COPY[exercise.evidence]}</span>
            </div>
            <p className="learn-card__summary">{exercise.summary}</p>

            <h3 className="learn-card__sub">How to do it</h3>
            <ol className="learn-card__list">
              {exercise.cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ol>

            <h3 className="learn-card__sub">What the evidence says</h3>
            <p className="learn-card__evidence">{exercise.evidenceNote}</p>

            {exercise.contraindications.length > 0 && (
              <>
                <h3 className="learn-card__sub">Skip this if</h3>
                <ul className="learn-card__list learn-card__list--contra">
                  {exercise.contraindications.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>

      <section className="honesty">
        <h2 className="honesty__title">The uncomfortable part</h2>
        <p>
          This programme has the strongest evidence for people who already have low-back pain, and
          for stopping it coming back. The evidence that it prevents a first episode in people who
          feel completely fine is weaker. Advice about how often to break up sitting is weaker still.
        </p>
        <p>
          So why build it? Because the habit is cheap, takes three minutes, and works for the case
          where the evidence is good. We would rather tell you that than imply a stronger claim than
          the research supports.
        </p>
      </section>

      <Disclaimer />
    </div>
  );
}
