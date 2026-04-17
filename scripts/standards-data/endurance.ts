// Endurance path key exercises
export const ENDURANCE_STANDARDS = [
  {
    exercise_id: 'run_1_mile',
    standards: {
      unit: 'Sec', scoring: 'lower_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [570, 468, 398, 330, 300] },
          { min: 25, max: 34, levels: [565, 468, 398, 330, 308] },
          { min: 35, max: 44, levels: [595, 496, 420, 352, 325] },
          { min: 45, max: 54, levels: [642, 531, 451, 378, 350] },
          { min: 55, max: 100, levels: [700, 573, 489, 409, 375] },
        ],
        female: [
          { min: 18, max: 24, levels: [640, 540, 464, 408, 366] },
          { min: 25, max: 34, levels: [640, 540, 464, 408, 366] },
          { min: 35, max: 44, levels: [670, 562, 484, 425, 382] },
          { min: 45, max: 54, levels: [716, 604, 520, 456, 409] },
          { min: 55, max: 100, levels: [780, 660, 570, 502, 450] },
        ],
      },
    },
  },
  {
    exercise_id: 'run_400m',
    standards: {
      unit: 'Sec', scoring: 'lower_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [99, 82, 68, 55, 47] },
          { min: 25, max: 34, levels: [99, 82, 68, 55, 47] },
          { min: 35, max: 44, levels: [105, 87, 72, 59, 51] },
          { min: 45, max: 54, levels: [113, 94, 78, 65, 56] },
          { min: 55, max: 100, levels: [122, 102, 85, 71, 61] },
        ],
        female: [
          { min: 18, max: 24, levels: [109, 92, 77, 63, 53] },
          { min: 25, max: 34, levels: [109, 92, 77, 63, 53] },
          { min: 35, max: 44, levels: [116, 98, 82, 68, 57] },
          { min: 45, max: 54, levels: [125, 106, 89, 74, 63] },
          { min: 55, max: 100, levels: [136, 115, 97, 81, 69] },
        ],
      },
    },
  },
  {
    exercise_id: 'row_6min',
    standards: {
      unit: 'Meters', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [1150, 1350, 1550, 1720, 1880] },
          { min: 25, max: 34, levels: [1200, 1400, 1600, 1780, 1920] },
          { min: 35, max: 44, levels: [1120, 1310, 1500, 1670, 1810] },
          { min: 45, max: 54, levels: [1040, 1220, 1400, 1560, 1700] },
          { min: 55, max: 100, levels: [940, 1100, 1270, 1420, 1560] },
        ],
        female: [
          { min: 18, max: 24, levels: [850, 1020, 1200, 1370, 1520] },
          { min: 25, max: 34, levels: [880, 1060, 1240, 1410, 1560] },
          { min: 35, max: 44, levels: [820, 990, 1160, 1320, 1460] },
          { min: 45, max: 54, levels: [770, 930, 1090, 1240, 1380] },
          { min: 55, max: 100, levels: [700, 840, 990, 1130, 1260] },
        ],
      },
    },
  },
  {
    exercise_id: 'dead_hang',
    standards: {
      unit: 'Sec', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [20, 45, 75, 110, 150] },
          { min: 25, max: 34, levels: [25, 50, 80, 120, 160] },
          { min: 35, max: 44, levels: [20, 42, 70, 105, 140] },
          { min: 45, max: 54, levels: [15, 35, 58, 88, 120] },
          { min: 55, max: 100, levels: [10, 25, 45, 70, 100] },
        ],
        female: [
          { min: 18, max: 24, levels: [10, 28, 50, 75, 105] },
          { min: 25, max: 34, levels: [12, 30, 55, 80, 110] },
          { min: 35, max: 44, levels: [10, 25, 45, 68, 95] },
          { min: 45, max: 54, levels: [7, 20, 38, 58, 80] },
          { min: 55, max: 100, levels: [5, 15, 28, 45, 65] },
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
  {
    exercise_id: 'burpees',
    standards: {
      unit: 'Reps', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [12, 17, 22, 27, 32] },
          { min: 25, max: 34, levels: [12, 17, 22, 27, 32] },
          { min: 35, max: 44, levels: [10, 15, 20, 25, 29] },
          { min: 45, max: 54, levels: [8, 13, 18, 22, 26] },
          { min: 55, max: 100, levels: [6, 10, 15, 19, 23] },
        ],
        female: [
          { min: 18, max: 24, levels: [8, 13, 18, 23, 28] },
          { min: 25, max: 34, levels: [8, 13, 18, 23, 28] },
          { min: 35, max: 44, levels: [7, 11, 16, 21, 25] },
          { min: 45, max: 54, levels: [5, 9, 14, 18, 22] },
          { min: 55, max: 100, levels: [4, 7, 11, 15, 19] },
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
    exercise_id: 'push_ups',
    standards: {
      unit: 'Reps', scoring: 'higher_is_better',
      brackets: {
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
    exercise_id: 'calf_raises',
    standards: {
      unit: 'xBW', scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 18, max: 24, levels: [0.55, 0.95, 1.45, 2.10, 2.85] },
          { min: 25, max: 34, levels: [0.60, 1.00, 1.55, 2.25, 3.00] },
          { min: 35, max: 44, levels: [0.55, 0.95, 1.45, 2.10, 2.85] },
          { min: 45, max: 54, levels: [0.50, 0.85, 1.30, 1.90, 2.60] },
          { min: 55, max: 100, levels: [0.40, 0.75, 1.15, 1.70, 2.35] },
        ],
        female: [
          { min: 18, max: 24, levels: [0.25, 0.60, 1.10, 1.75, 2.50] },
          { min: 25, max: 34, levels: [0.30, 0.65, 1.18, 1.85, 2.65] },
          { min: 35, max: 44, levels: [0.25, 0.60, 1.10, 1.75, 2.50] },
          { min: 45, max: 54, levels: [0.22, 0.55, 1.00, 1.60, 2.30] },
          { min: 55, max: 100, levels: [0.18, 0.45, 0.85, 1.40, 2.05] },
        ],
      },
    },
  },
];
