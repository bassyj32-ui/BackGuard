export type EvidenceStrength = 'strong' | 'moderate' | 'emerging';

export interface AngleTarget {
  /** Which measured angle this range applies to. */
  joint: 'spine' | 'hip' | 'knee' | 'shoulder';
  minDeg: number;
  maxDeg: number;
}

export interface Exercise {
  id: string;
  name: string;
  /** One-line summary shown on cards. */
  summary: string;
  reps?: number;
  holdSeconds?: number;
  sides?: 1 | 2;
  targets: AngleTarget[];
  /** Short plain-language coaching lines, shown live during the set. */
  cues: string[];
  /** Conditions under which this exercise should not be attempted. */
  contraindications: string[];
  evidence: EvidenceStrength;
  /** Plain-language note on how strong the evidence actually is. */
  evidenceNote: string;
}

export const EXERCISES: Exercise[] = [
  {
    id: 'curl-up',
    name: 'Curl-up',
    summary: 'Roll up one vertebra at a time, keeping the curve in your lower back.',
    reps: 10,
    targets: [{ joint: 'spine', minDeg: 40, maxDeg: 65 }],
    cues: [
      'Tuck your chin slightly.',
      'Roll up slowly, one vertebra at a time.',
      'Keep the low back still — do not arch.',
      'Lower yourself the same way you came up.',
    ],
    contraindications: [
      'Abdominal or inguinal hernia.',
      'Recent abdominal or back surgery.',
    ],
    evidence: 'strong',
    evidenceNote:
      'Part of the McGill programme. Strongest evidence is for managing existing low-back pain and reducing recurrence.',
  },
  {
    id: 'side-plank',
    name: 'Side plank',
    summary: 'Hold a straight line from your shoulder to your hip. Build from knees up.',
    holdSeconds: 20,
    sides: 2,
    targets: [{ joint: 'spine', minDeg: 160, maxDeg: 180 }],
    cues: [
      'Start on your forearms and knees.',
      'Lift your hips so your body is one straight line.',
      'Squeeze your stomach, do not hold your breath.',
      'If it is too hard, keep it on your knees and hold longer instead.',
    ],
    contraindications: ['Recent shoulder surgery or pain on the supporting arm.'],
    evidence: 'strong',
    evidenceNote:
      'Part of the McGill programme. Strongest evidence is for managing existing low-back pain and reducing recurrence.',
  },
  {
    id: 'bird-dog',
    name: 'Bird-dog',
    summary: 'From all fours, reach an opposite arm and leg out long without rotating.',
    reps: 8,
    sides: 2,
    targets: [{ joint: 'spine', minDeg: 165, maxDeg: 180 }],
    cues: [
      'Start on hands and knees, hands under shoulders.',
      'Reach one arm forward and the opposite leg back.',
      'Keep your hips level — do not rotate to reach higher.',
      'Hold steady, then lower with control.',
    ],
    contraindications: ['Wrist or shoulder pain that worsens when you push up.'],
    evidence: 'strong',
    evidenceNote:
      'Part of the McGill programme. Strongest evidence is for managing existing low-back pain and reducing recurrence.',
  },
  {
    id: 'chin-tuck',
    name: 'Chin tuck',
    summary: 'Slide your head straight back to line your ear up with your shoulder.',
    reps: 12,
    targets: [{ joint: 'spine', minDeg: 175, maxDeg: 195 }],
    cues: [
      'Sit or stand tall.',
      'Imagine making a double chin — slide straight back, not down.',
      'Hold for two seconds.',
      'Keep your shoulders relaxed and down.',
    ],
    contraindications: [],
    evidence: 'emerging',
    evidenceNote:
      'Common postural exercise. Evidence for preventing a first episode of low-back pain is weaker than for exercise programmes above.',
  },
  {
    id: 'thoracic-extension',
    name: 'Thoracic extension over chair',
    summary: 'Rest your arms on a chair back and let your upper back arch over it.',
    reps: 10,
    targets: [{ joint: 'spine', minDeg: 130, maxDeg: 165 }],
    cues: [
      'Sit sideways to a chair, back to the chair back.',
      'Rest your arms on the chair back and slump gently.',
      'Let your upper back round over the edge.',
      'Come back to tall slowly.',
    ],
    contraindications: ['Spinal stenosis symptoms that worsen with extension.', 'Recent spinal surgery.'],
    evidence: 'emerging',
    evidenceNote:
      'Common postural exercise. Evidence for preventing a first episode of low-back pain is weaker than for exercise programmes above.',
  },
  {
    id: 'hip-flexor-stretch',
    name: 'Standing hip flexor stretch',
    summary: 'Step one foot back and tuck your pelvis under to take the front of the hip open.',
    reps: 30,
    sides: 2,
    targets: [{ joint: 'hip', minDeg: 90, maxDeg: 130 }],
    cues: [
      'Step one foot back into a shallow lunge.',
      'Tuck your pelvis under — this is the part that matters.',
      'You should feel it at the front of your back hip.',
      'Hold, then change sides.',
    ],
    contraindications: ['Knee pain in the bent front leg.'],
    evidence: 'emerging',
    evidenceNote:
      'Addresses the tight-short-hip pattern associated with long sitting. Directly supporting evidence is limited.',
  },
  {
    id: 'hamstring-stretch',
    name: 'Seated hamstring reach',
    summary: 'Sit tall, hinge from the hips with a long spine, and reach toward your feet.',
    reps: 30,
    sides: 2,
    targets: [{ joint: 'knee', minDeg: 155, maxDeg: 185 }],
    cues: [
      'Sit on the edge of a chair, one foot forward.',
      'Keep your back long and hinge forward from the hips.',
      'Reach toward your toes, knees can stay slightly bent.',
      'Hold, then change sides.',
    ],
    contraindications: ['Hamstring injury or pain behind the knee.'],
    evidence: 'emerging',
    evidenceNote: 'Common mobility exercise. Directly supporting evidence is limited.',
  },
];

export const DAILY_SET_IDS = [
  'curl-up',
  'side-plank',
  'bird-dog',
  'chin-tuck',
  'thoracic-extension',
  'hip-flexor-stretch',
  'hamstring-stretch',
] as const;

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function getDailySet(): Exercise[] {
  return DAILY_SET_IDS.map((id) => getExercise(id)).filter((e): e is Exercise => Boolean(e));
}

/** Blocks raised per rep or per completed hold, used by the isometric grid. */
export function blocksPerExercise(exercise: Exercise): number {
  if (exercise.reps !== undefined) {
    return exercise.sides === 2 ? exercise.reps * 2 : exercise.reps;
  }
  return exercise.sides === 2 ? 2 : 1;
}