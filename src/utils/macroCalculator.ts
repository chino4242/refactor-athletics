// Macro calculator: BMR → TDEE → macro split by goal

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MacroGoal = 'lose' | 'maintain' | 'gain';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very Active (2x/day, physical job)',
};

export const GOAL_LABELS: Record<MacroGoal, string> = {
  lose: 'Lose Fat',
  maintain: 'Maintain',
  gain: 'Build Muscle',
};

interface MacroInput {
  weightLbs: number;
  age: number;
  sex: string; // 'male' | 'female' | 'prefer_not_to_say'
  activityLevel: ActivityLevel;
  goal: MacroGoal;
}

export interface MacroResult {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Mifflin-St Jeor (most accurate for general population)
function calcBMR(weightLbs: number, age: number, sex: string): number {
  const weightKg = weightLbs * 0.453592;
  // Estimate height — use average if unknown (5'5" female, 5'10" male)
  const heightCm = sex === 'male' ? 177.8 : 165.1;
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  // Female or prefer_not_to_say (use female as conservative estimate)
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateMacros(input: MacroInput): MacroResult {
  const bmr = calcBMR(input.weightLbs, input.age, input.sex);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];

  // Calorie adjustment by goal
  let calories: number;
  if (input.goal === 'lose') {
    calories = tdee - 500; // ~1 lb/week loss
  } else if (input.goal === 'gain') {
    calories = tdee + 300; // lean bulk
  } else {
    calories = tdee;
  }
  calories = Math.round(Math.max(calories, 1200)); // safety floor

  // Protein: 1g per lb bodyweight (standard for active individuals)
  const protein = Math.round(input.weightLbs * 1.0);

  // Fat: 25-30% of calories (25% for cut, 30% for bulk, 27.5% maintain)
  const fatPct = input.goal === 'lose' ? 0.25 : input.goal === 'gain' ? 0.30 : 0.275;
  const fat = Math.round((calories * fatPct) / 9);

  // Carbs: remainder
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs: Math.max(carbs, 50), fat };
}
