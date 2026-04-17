// Mobility path key exercises
export const MOBILITY_STANDARDS = [
  {
    exercise_id: 'deep_squat_hold',
    standards: { unit: 'Sec', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [15, 45, 90, 150, 240] },
        { min: 25, max: 34, levels: [15, 45, 90, 155, 245] },
        { min: 35, max: 44, levels: [15, 43, 86, 147, 233] },
        { min: 45, max: 54, levels: [12, 40, 79, 136, 216] },
        { min: 55, max: 100, levels: [10, 35, 70, 121, 191] },
      ],
      female: [
        { min: 18, max: 24, levels: [15, 42, 85, 140, 225] },
        { min: 25, max: 34, levels: [15, 43, 87, 145, 230] },
        { min: 35, max: 44, levels: [14, 41, 83, 138, 219] },
        { min: 45, max: 54, levels: [12, 38, 77, 128, 202] },
        { min: 55, max: 100, levels: [10, 34, 68, 113, 179] },
      ],
    }},
  },
  {
    exercise_id: 'active_hang',
    standards: { unit: 'Sec', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [10, 30, 60, 120, 210] },
        { min: 25, max: 34, levels: [10, 30, 60, 120, 210] },
        { min: 35, max: 44, levels: [10, 29, 57, 114, 200] },
        { min: 45, max: 54, levels: [8, 26, 53, 106, 185] },
        { min: 55, max: 100, levels: [7, 23, 47, 94, 164] },
      ],
      female: [
        { min: 18, max: 24, levels: [7, 20, 42, 85, 150] },
        { min: 25, max: 34, levels: [7, 20, 43, 87, 155] },
        { min: 35, max: 44, levels: [7, 19, 41, 83, 147] },
        { min: 45, max: 54, levels: [6, 18, 38, 77, 136] },
        { min: 55, max: 100, levels: [5, 16, 34, 68, 121] },
      ],
    }},
  },
  {
    exercise_id: 'overhead_squat_hold',
    standards: { unit: 'Sec', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [10, 30, 65, 110, 180] },
        { min: 25, max: 34, levels: [10, 30, 67, 115, 185] },
        { min: 35, max: 44, levels: [10, 29, 64, 109, 176] },
        { min: 45, max: 54, levels: [8, 26, 59, 101, 163] },
        { min: 55, max: 100, levels: [7, 23, 52, 90, 144] },
      ],
      female: [
        { min: 18, max: 24, levels: [10, 28, 60, 105, 170] },
        { min: 25, max: 34, levels: [10, 29, 62, 108, 175] },
        { min: 35, max: 44, levels: [10, 28, 59, 103, 166] },
        { min: 45, max: 54, levels: [8, 26, 55, 95, 154] },
        { min: 55, max: 100, levels: [7, 23, 48, 84, 137] },
      ],
    }},
  },
  {
    exercise_id: 'cossack_squat',
    standards: { unit: 'Reps', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [3, 6, 10, 16, 25] },
        { min: 25, max: 34, levels: [3, 6, 10, 16, 25] },
        { min: 35, max: 44, levels: [3, 6, 10, 15, 24] },
        { min: 45, max: 54, levels: [2, 5, 9, 14, 22] },
        { min: 55, max: 100, levels: [2, 5, 8, 12, 20] },
      ],
      female: [
        { min: 18, max: 24, levels: [3, 6, 10, 15, 23] },
        { min: 25, max: 34, levels: [3, 6, 10, 15, 24] },
        { min: 35, max: 44, levels: [3, 6, 10, 14, 23] },
        { min: 45, max: 54, levels: [2, 5, 9, 13, 21] },
        { min: 55, max: 100, levels: [2, 5, 8, 12, 19] },
      ],
    }},
  },
  {
    exercise_id: 'wall_slide',
    standards: { unit: 'Reps', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [5, 10, 18, 28, 40] },
        { min: 25, max: 34, levels: [5, 10, 18, 28, 40] },
        { min: 35, max: 44, levels: [5, 10, 17, 27, 38] },
        { min: 45, max: 54, levels: [4, 9, 16, 25, 35] },
        { min: 55, max: 100, levels: [4, 8, 14, 22, 31] },
      ],
      female: [
        { min: 18, max: 24, levels: [5, 10, 17, 26, 38] },
        { min: 25, max: 34, levels: [5, 10, 17, 27, 39] },
        { min: 35, max: 44, levels: [5, 10, 16, 26, 37] },
        { min: 45, max: 54, levels: [4, 9, 15, 24, 34] },
        { min: 55, max: 100, levels: [4, 8, 13, 21, 30] },
      ],
    }},
  },
  {
    exercise_id: 'shoulder_dislocate',
    standards: { unit: 'Reps', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [5, 10, 18, 28, 40] },
        { min: 25, max: 34, levels: [5, 10, 18, 28, 40] },
        { min: 35, max: 44, levels: [5, 10, 17, 27, 38] },
        { min: 45, max: 54, levels: [4, 9, 16, 25, 35] },
        { min: 55, max: 100, levels: [4, 8, 14, 22, 31] },
      ],
      female: [
        { min: 18, max: 24, levels: [5, 10, 18, 27, 39] },
        { min: 25, max: 34, levels: [5, 10, 18, 28, 40] },
        { min: 35, max: 44, levels: [5, 10, 17, 27, 38] },
        { min: 45, max: 54, levels: [4, 9, 16, 25, 35] },
        { min: 55, max: 100, levels: [4, 8, 14, 22, 31] },
      ],
    }},
  },
  {
    exercise_id: 'plank',
    standards: { unit: 'Sec', scoring: 'higher_is_better', brackets: {
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
    }},
  },
  {
    exercise_id: 'push_ups',
    standards: { unit: 'Reps', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [20, 35, 50, 65, 80] },
        { min: 25, max: 34, levels: [20, 35, 50, 65, 80] },
        { min: 35, max: 44, levels: [15, 28, 42, 56, 70] },
        { min: 45, max: 54, levels: [12, 22, 35, 48, 60] },
        { min: 55, max: 100, levels: [8, 16, 28, 40, 50] },
      ],
      female: [
        { min: 18, max: 24, levels: [12, 22, 32, 42, 52] },
        { min: 25, max: 34, levels: [12, 22, 32, 42, 52] },
        { min: 35, max: 44, levels: [10, 18, 27, 36, 45] },
        { min: 45, max: 54, levels: [7, 14, 22, 30, 38] },
        { min: 55, max: 100, levels: [5, 10, 18, 25, 32] },
      ],
    }},
  },
  {
    exercise_id: 'body_weight_squat',
    standards: { unit: 'Reps', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [10, 25, 50, 80, 130] },
        { min: 25, max: 34, levels: [10, 25, 50, 80, 130] },
        { min: 35, max: 44, levels: [10, 24, 48, 76, 124] },
        { min: 45, max: 54, levels: [8, 22, 44, 70, 114] },
        { min: 55, max: 100, levels: [7, 20, 39, 62, 101] },
      ],
      female: [
        { min: 18, max: 24, levels: [8, 18, 38, 62, 100] },
        { min: 25, max: 34, levels: [8, 18, 38, 63, 102] },
        { min: 35, max: 44, levels: [8, 17, 36, 60, 97] },
        { min: 45, max: 54, levels: [7, 16, 33, 55, 90] },
        { min: 55, max: 100, levels: [6, 14, 30, 49, 80] },
      ],
    }},
  },
  {
    exercise_id: 'pull_up',
    standards: { unit: 'Reps', scoring: 'higher_is_better', brackets: {
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
    }},
  },
  {
    exercise_id: 'goblet_squat',
    standards: { unit: 'xBW', scoring: 'higher_is_better', brackets: {
      male: [
        { min: 18, max: 24, levels: [0.15, 0.25, 0.40, 0.65, 0.90] },
        { min: 25, max: 34, levels: [0.15, 0.25, 0.40, 0.65, 0.90] },
        { min: 35, max: 44, levels: [0.14, 0.24, 0.38, 0.62, 0.86] },
        { min: 45, max: 54, levels: [0.13, 0.22, 0.35, 0.57, 0.79] },
        { min: 55, max: 100, levels: [0.12, 0.20, 0.31, 0.51, 0.70] },
      ],
      female: [
        { min: 18, max: 24, levels: [0.10, 0.18, 0.30, 0.48, 0.68] },
        { min: 25, max: 34, levels: [0.10, 0.18, 0.30, 0.48, 0.68] },
        { min: 35, max: 44, levels: [0.10, 0.17, 0.29, 0.46, 0.65] },
        { min: 45, max: 54, levels: [0.09, 0.16, 0.26, 0.42, 0.60] },
        { min: 55, max: 100, levels: [0.08, 0.14, 0.23, 0.37, 0.53] },
      ],
    }},
  },
  {
    exercise_id: 'rdl',
    standards: { unit: 'xBW', scoring: 'higher_is_better', brackets: {
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
    }},
  },
];
