// Strength path key exercises (continued)
export const STRENGTH_STANDARDS_2 = [
  {
    exercise_id: 'dip',
    standards: {
      unit: 'Reps', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [5, 12, 20, 33, 47] },
          { min: 25, max: 34, levels: [5, 12, 21, 34, 49] },
          { min: 35, max: 44, levels: [5, 11, 20, 32, 46] },
          { min: 45, max: 54, levels: [3, 9, 16, 28, 40] },
          { min: 55, max: 100, levels: [2, 6, 12, 22, 35] },
        ],
        female: [
          { min: 18, max: 24, levels: [1, 4, 10, 21, 34] },
          { min: 25, max: 34, levels: [1, 4, 10, 22, 35] },
          { min: 35, max: 44, levels: [1, 4, 9, 20, 33] },
          { min: 45, max: 54, levels: [1, 3, 7, 16, 28] },
          { min: 55, max: 100, levels: [1, 2, 5, 13, 24] },
        ],
      },
    },
  },
  {
    exercise_id: 'rdl',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.67, 0.96, 1.30, 1.68, 2.02] },
          { min: 25, max: 34, levels: [0.70, 1.00, 1.35, 1.75, 2.10] },
          { min: 35, max: 44, levels: [0.66, 0.94, 1.27, 1.65, 1.97] },
          { min: 45, max: 54, levels: [0.61, 0.87, 1.17, 1.52, 1.83] },
          { min: 55, max: 100, levels: [0.55, 0.78, 1.05, 1.37, 1.64] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.48, 0.72, 0.96, 1.30, 1.58] },
          { min: 25, max: 34, levels: [0.50, 0.75, 1.00, 1.35, 1.65] },
          { min: 35, max: 44, levels: [0.47, 0.71, 0.94, 1.27, 1.55] },
          { min: 45, max: 54, levels: [0.44, 0.65, 0.87, 1.17, 1.44] },
          { min: 55, max: 100, levels: [0.39, 0.59, 0.78, 1.05, 1.29] },
        ],
      },
    },
  },
  {
    exercise_id: 'incline_bench',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.42, 0.72, 0.98, 1.30, 1.59] },
          { min: 25, max: 34, levels: [0.44, 0.75, 1.02, 1.35, 1.65] },
          { min: 35, max: 44, levels: [0.41, 0.71, 0.96, 1.27, 1.55] },
          { min: 45, max: 54, levels: [0.38, 0.65, 0.89, 1.17, 1.44] },
          { min: 55, max: 100, levels: [0.34, 0.59, 0.80, 1.05, 1.29] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.21, 0.42, 0.61, 0.82, 1.03] },
          { min: 25, max: 34, levels: [0.22, 0.44, 0.64, 0.85, 1.07] },
          { min: 35, max: 44, levels: [0.21, 0.41, 0.60, 0.80, 1.01] },
          { min: 45, max: 54, levels: [0.19, 0.38, 0.56, 0.74, 0.93] },
          { min: 55, max: 100, levels: [0.17, 0.34, 0.50, 0.66, 0.83] },
        ],
      },
    },
  },
  {
    exercise_id: 'bulgarian_split_squat',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.29, 0.48, 0.67, 0.91, 1.15] },
          { min: 25, max: 34, levels: [0.30, 0.50, 0.70, 0.95, 1.20] },
          { min: 35, max: 44, levels: [0.28, 0.47, 0.66, 0.89, 1.13] },
          { min: 45, max: 54, levels: [0.26, 0.44, 0.61, 0.83, 1.04] },
          { min: 55, max: 100, levels: [0.23, 0.39, 0.55, 0.74, 0.94] },
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
    exercise_id: 'barbell_bicep_curl',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.19, 0.34, 0.48, 0.62, 0.77] },
          { min: 25, max: 34, levels: [0.20, 0.35, 0.50, 0.65, 0.80] },
          { min: 35, max: 44, levels: [0.19, 0.33, 0.47, 0.61, 0.75] },
          { min: 45, max: 54, levels: [0.17, 0.30, 0.44, 0.57, 0.70] },
          { min: 55, max: 100, levels: [0.16, 0.27, 0.39, 0.51, 0.62] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.10, 0.19, 0.29, 0.38, 0.48] },
          { min: 25, max: 34, levels: [0.10, 0.20, 0.30, 0.40, 0.50] },
          { min: 35, max: 44, levels: [0.09, 0.19, 0.28, 0.38, 0.47] },
          { min: 45, max: 54, levels: [0.09, 0.17, 0.26, 0.35, 0.44] },
          { min: 55, max: 100, levels: [0.08, 0.16, 0.23, 0.31, 0.39] },
        ],
      },
    },
  },
  {
    exercise_id: 'plank',
    standards: {
      unit: 'Sec', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [30, 60, 120, 210, 300] },
          { min: 25, max: 34, levels: [30, 60, 120, 210, 300] },
          { min: 35, max: 44, levels: [25, 55, 110, 195, 280] },
          { min: 45, max: 54, levels: [20, 45, 95, 170, 250] },
          { min: 55, max: 100, levels: [15, 35, 75, 140, 210] },
        ],
        female: [
          { min: 18, max: 24, levels: [20, 45, 90, 170, 260] },
          { min: 25, max: 34, levels: [20, 45, 90, 170, 260] },
          { min: 35, max: 44, levels: [18, 40, 85, 160, 245] },
          { min: 45, max: 54, levels: [15, 35, 75, 140, 215] },
          { min: 55, max: 100, levels: [10, 25, 60, 115, 180] },
        ],
      },
    },
  },
];
