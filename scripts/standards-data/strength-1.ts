// Strength path key exercises with standards
export const STRENGTH_STANDARDS = [
  {
    exercise_id: 'bench_press',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.50, 0.85, 1.15, 1.50, 1.85] },
          { min: 25, max: 34, levels: [0.50, 0.85, 1.20, 1.55, 1.90] },
          { min: 35, max: 44, levels: [0.47, 0.80, 1.13, 1.46, 1.79] },
          { min: 45, max: 54, levels: [0.44, 0.74, 1.04, 1.35, 1.65] },
          { min: 55, max: 100, levels: [0.39, 0.66, 0.94, 1.21, 1.48] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.25, 0.50, 0.72, 0.96, 1.20] },
          { min: 25, max: 34, levels: [0.25, 0.50, 0.75, 1.00, 1.25] },
          { min: 35, max: 44, levels: [0.24, 0.47, 0.71, 0.94, 1.18] },
          { min: 45, max: 54, levels: [0.22, 0.44, 0.65, 0.87, 1.09] },
          { min: 55, max: 100, levels: [0.20, 0.39, 0.59, 0.78, 0.98] },
        ],
      },
    },
  },
  {
    exercise_id: 'back_squat',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.72, 1.10, 1.44, 1.92, 2.40] },
          { min: 25, max: 34, levels: [0.75, 1.15, 1.50, 2.00, 2.50] },
          { min: 35, max: 44, levels: [0.71, 1.08, 1.41, 1.88, 2.35] },
          { min: 45, max: 54, levels: [0.65, 1.00, 1.31, 1.74, 2.18] },
          { min: 55, max: 100, levels: [0.59, 0.90, 1.17, 1.56, 1.95] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.48, 0.82, 1.10, 1.54, 1.92] },
          { min: 25, max: 34, levels: [0.50, 0.85, 1.15, 1.60, 2.00] },
          { min: 35, max: 44, levels: [0.47, 0.80, 1.08, 1.50, 1.88] },
          { min: 45, max: 54, levels: [0.44, 0.74, 1.00, 1.39, 1.74] },
          { min: 55, max: 100, levels: [0.39, 0.66, 0.90, 1.25, 1.56] },
        ],
      },
    },
  },
  {
    exercise_id: 'deadlift',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.96, 1.34, 1.78, 2.26, 2.64] },
          { min: 25, max: 34, levels: [1.00, 1.40, 1.85, 2.35, 2.75] },
          { min: 35, max: 44, levels: [0.94, 1.32, 1.74, 2.21, 2.59] },
          { min: 45, max: 54, levels: [0.87, 1.22, 1.61, 2.04, 2.39] },
          { min: 55, max: 100, levels: [0.78, 1.09, 1.44, 1.83, 2.15] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.72, 1.06, 1.34, 1.78, 2.16] },
          { min: 25, max: 34, levels: [0.75, 1.10, 1.40, 1.85, 2.25] },
          { min: 35, max: 44, levels: [0.71, 1.03, 1.32, 1.74, 2.12] },
          { min: 45, max: 54, levels: [0.65, 0.96, 1.22, 1.61, 1.96] },
          { min: 55, max: 100, levels: [0.59, 0.86, 1.09, 1.44, 1.76] },
        ],
      },
    },
  },
  {
    exercise_id: 'overhead_press',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.34, 0.53, 0.72, 0.96, 1.20] },
          { min: 25, max: 34, levels: [0.35, 0.55, 0.75, 1.00, 1.25] },
          { min: 35, max: 44, levels: [0.33, 0.52, 0.71, 0.94, 1.18] },
          { min: 45, max: 54, levels: [0.30, 0.48, 0.65, 0.87, 1.09] },
          { min: 55, max: 100, levels: [0.27, 0.43, 0.59, 0.78, 0.98] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.19, 0.34, 0.48, 0.67, 0.86] },
          { min: 25, max: 34, levels: [0.20, 0.35, 0.50, 0.70, 0.90] },
          { min: 35, max: 44, levels: [0.19, 0.33, 0.47, 0.66, 0.85] },
          { min: 45, max: 54, levels: [0.17, 0.30, 0.44, 0.61, 0.78] },
          { min: 55, max: 100, levels: [0.16, 0.27, 0.39, 0.55, 0.70] },
        ],
      },
    },
  },
  {
    exercise_id: 'barbell_row',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.43, 0.67, 0.91, 1.20, 1.49] },
          { min: 25, max: 34, levels: [0.45, 0.70, 0.95, 1.25, 1.55] },
          { min: 35, max: 44, levels: [0.42, 0.66, 0.89, 1.18, 1.46] },
          { min: 45, max: 54, levels: [0.39, 0.61, 0.83, 1.09, 1.35] },
          { min: 55, max: 100, levels: [0.35, 0.55, 0.74, 0.98, 1.21] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.24, 0.41, 0.58, 0.77, 0.96] },
          { min: 25, max: 34, levels: [0.25, 0.43, 0.60, 0.80, 1.00] },
          { min: 35, max: 44, levels: [0.24, 0.40, 0.56, 0.75, 0.94] },
          { min: 45, max: 54, levels: [0.22, 0.37, 0.52, 0.70, 0.87] },
          { min: 55, max: 100, levels: [0.20, 0.34, 0.47, 0.62, 0.78] },
        ],
      },
    },
  },
  {
    exercise_id: 'pull_up',
    standards: {
      unit: 'Reps', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [3, 8, 15, 24, 35] },
          { min: 25, max: 34, levels: [3, 8, 15, 25, 37] },
          { min: 35, max: 44, levels: [3, 8, 14, 24, 35] },
          { min: 45, max: 54, levels: [2, 6, 12, 20, 30] },
          { min: 55, max: 100, levels: [1, 4, 8, 15, 25] },
        ],
        female: [
          { min: 18, max: 24, levels: [1, 3, 7, 14, 24] },
          { min: 25, max: 34, levels: [1, 3, 7, 15, 26] },
          { min: 35, max: 44, levels: [1, 3, 6, 14, 24] },
          { min: 45, max: 54, levels: [1, 2, 5, 11, 19] },
          { min: 55, max: 100, levels: [1, 1, 3, 8, 15] },
        ],
      },
    },
  },
];
