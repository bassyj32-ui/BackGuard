export const DISCLAIMER =
  'Educational tool, not medical advice. Stop if you feel pain, and see a clinician for pain, numbness, or weakness.';

export default function Disclaimer() {
  return (
    <p className="disclaimer" role="note">
      {DISCLAIMER}
    </p>
  );
}
