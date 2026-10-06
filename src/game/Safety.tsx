import Disclaimer from '../components/Disclaimer';

const RED_FLAGS = [
  'Pain travelling down your leg, especially past the knee',
  'Numbness or tingling in your leg, foot, or groin area',
  'Weakness in a leg, or difficulty lifting your foot',
  'Loss of bladder or bowel control, or numbness around your groin',
  'Back pain after a significant fall, crash, or impact',
  'Pain that wakes you at night, or comes with fever or unexplained weight loss',
];

interface SafetyProps {
  onBack: () => void;
}

/**
 * Red-flag screening routes to a clinician. It is never an exercise prompt, and
 * it never offers a diagnosis. Shown as its own tab rather than buried, because
 * it is the screen that matters most.
 */
export default function Safety({ onBack }: SafetyProps) {
  return (
    <div className="page">
      <header className="page__bar">
        <button className="icon-button" onClick={onBack} aria-label="Back to town">
          ←
        </button>
        <h1 className="page__title">Safety</h1>
      </header>

      <section className="flags">
        <h2 className="flags__title">Do not exercise. See a clinician, if you have:</h2>
        <ul className="flags__list">
          {RED_FLAGS.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
        <p className="flags__note">
          BackGuard cannot diagnose anything. A physiotherapist, doctor, or other qualified
          clinician is the right next step for any of these.
        </p>
      </section>

      <section className="card">
        <h2 className="card__title">During any rep</h2>
        <ul className="card__list">
          <li>Stop immediately if you feel pain. Sharp, shooting, or radiating pain is a stop signal, not something to push through.</li>
          <li>Keep breathing. Holding your breath raises blood pressure and makes form harder to hold.</li>
          <li>Start with less than you think you can do. Consistency beats intensity for a daily habit.</li>
          <li>Build side plank from your knees. A shorter, cleaner hold beats a long, collapsing one.</li>
          <li>A missed day is not a reason to stop. Restart with the plot you left half-built.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="card__title">Your camera and your data</h2>
        <ul className="card__list">
          <li>Video is processed in your browser, on your device. Nothing is recorded or uploaded, because there is no server to send it to.</li>
          <li>The camera is entirely optional. Every exercise works by tapping, with no permissions at all.</li>
          <li>The pose model downloads once, about 3 MB, then caches locally.</li>
          <li>Your town and streak live in this browser only. Clearing site data resets them, and there is no way to recover them.</li>
        </ul>
      </section>

      <Disclaimer />
    </div>
  );
}
