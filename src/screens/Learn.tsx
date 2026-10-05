import { EXERCISES, type EvidenceStrength } from '../data/exercises';
import Disclaimer from '../components/Disclaimer';

const EVIDENCE_COPY: Record<EvidenceStrength, string> = {
  strong: 'Good evidence',
  moderate: 'Moderate evidence',
  emerging: 'Limited evidence',
};

export default function Learn() {
  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">Why these exercises</h1>
        <p className="screen__lede">
          Each entry says how strong the evidence actually is, including where it is thin.
        </p>
      </header>

      <ul className="learn-list">
        {EXERCISES.map((exercise) => (
          <li key={exercise.id} className="learn-card">
            <div className="learn-card__head">
              <h2 className="learn-card__name">{exercise.name}</h2>
              <span className={`badge badge--${exercise.evidence}`}>{EVIDENCE_COPY[exercise.evidence]}</span>
            </div>
            <p className="learn-card__summary">{exercise.summary}</p>

            <h3 className="learn-card__sub">How to do it</h3>
            <ol className="learn-card__cues">
              {exercise.cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ol>

            <h3 className="learn-card__sub">What the evidence says</h3>
            <p className="learn-card__evidence">{exercise.evidenceNote}</p>

            {exercise.contraindications.length > 0 && (
              <>
                <h3 className="learn-card__sub">Skip this if</h3>
                <ul className="learn-card__contra">
                  {exercise.contraindications.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>

      <p className="section-note">
        To be straight with you: this exercise programme has the strongest evidence for people who
        already have low-back pain, and for stopping it coming back. The evidence that it prevents a
        first episode in people who feel fine is weaker. Break-frequency advice is softer still.
        Doing it daily is a low-cost habit either way, which is why we suggest it.
      </p>

      <Disclaimer />
    </div>
  );
}