import Disclaimer from '../components/Disclaimer';

const RED_FLAGS = [
  'Pain travelling down your leg, especially past the knee',
  'Numbness or tingling in your leg, foot, or groin area',
  'Weakness in a leg, or difficulty lifting your foot',
  'Loss of bladder or bowel control, or numbness around your groin',
  'Back pain after a significant fall, crash, or impact',
  'Pain that wakes you at night, or comes with fever or unexplained weight loss',
];

/**
 * Red-flag screening routes to a clinician. It is never an exercise prompt, and
 * it never offers a diagnosis.
 */
export default function Safety() {
  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">Safety</h1>
        <p className="screen__lede">Read this once, then forget it and get moving.</p>
      </header>

      <section className="panel panel--alert">
        <h2 className="panel__title">See a clinician, do not exercise, if you have:</h2>
        <ul className="red-flags">
          {RED_FLAGS.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
        <p className="panel__note">
          BackGuard cannot diagnose anything. If any of these apply, a physiotherapist, doctor, or
          other qualified clinician is the right next step.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">During any exercise</h2>
        <ul className="plain-list">
          <li>Stop immediately if you feel pain. Sharp, shooting, or radiating pain is a stop signal, not something to push through.</li>
          <li>Keep breathing. Holding your breath raises blood pressure and makes form harder to hold.</li>
          <li>Start with less than you think you can do. Consistency beats intensity for a daily habit.</li>
          <li>Build from knees up for side plank. A shorter, cleaner hold beats a long, collapsing one.</li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel__title">Your camera and your data</h2>
        <ul className="plain-list">
          <li>Video is processed in your browser, on your device.</li>
          <li>Nothing is recorded, stored, or uploaded. There is no server to send it to.</li>
          <li>The pose model downloads once and then caches locally.</li>
          <li>Your streak and reps live in this browser only. Clearing site data resets them, and there is no way to recover them.</li>
        </ul>
      </section>

      <Disclaimer />
    </div>
  );
}