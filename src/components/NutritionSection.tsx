'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { logHabitAction } from '@/app/actions';
import type { UserProfileData, NutritionTargets } from '@/types';
import type { FoodResult } from '@/app/api/food-search/route';
import NutritionInput from './nutrition/NutritionInput';
import MealCart, { cartItemFromFood, type CartItem } from './nutrition/MealCart';
import RecentFoods from './nutrition/RecentFoods';
import NutritionProgress from './nutrition/NutritionProgress';

interface NutritionSectionProps {
  userId: string;
  userProfile: UserProfileData;
  totals: Record<string, number>;
  onUpdate: () => void;
}

export default function NutritionSection({ userId, userProfile, totals, onUpdate }: NutritionSectionProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [logging, setLogging] = useState(false);

  const targets: NutritionTargets = userProfile.nutrition_targets?.protein
    ? { ...userProfile.nutrition_targets, water: userProfile.nutrition_targets.water || 100 }
    : { calories: 2000, protein: 150, carbs: 200, fat: 65, water: 100 };

  const handleFoodsFound = (foods: FoodResult[]) => {
    const items = foods.map(cartItemFromFood);
    setCart(prev => [...prev, ...items]);
    // Save to recents
    try {
      const saved = localStorage.getItem('recent_foods');
      const recents: FoodResult[] = saved ? JSON.parse(saved) : [];
      const updated = [...foods.filter(f => !recents.some(r => r.name === f.name)), ...recents].slice(0, 10);
      localStorage.setItem('recent_foods', JSON.stringify(updated));
    } catch {}
  };

  const handleInstantLog = async (food: FoodResult) => {
    const item = cartItemFromFood(food);
    setLogging(true);
    await logMealItems([item]);
    setLogging(false);
  };

  const handleLogMeal = async () => {
    if (cart.length === 0 || logging) return;
    setLogging(true);
    await logMealItems(cart);
    setCart([]);
    setLogging(false);
  };

  const logMealItems = async (items: CartItem[]) => {
    const supabase = createClient();
    const date = new Date().toLocaleDateString('en-CA');
    const ts = Math.floor(Date.now() / 1000);

    // Save each item to meal_entries
    for (const item of items) {
      await supabase.from('meal_entries').insert({
        user_id: userId, date, meal_type: 'meal', food_name: item.food.name,
        protein: item.p, carbs: item.c, fat: item.f,
        calories: item.p * 4 + item.c * 4 + item.f * 9,
        serving_size: `${item.servingGrams}g`, timestamp: ts,
      });
    }

    // Fetch fresh totals from meal_entries
    const { data: allMeals } = await supabase.from('meal_entries')
      .select('protein, carbs, fat').eq('user_id', userId).eq('date', date);
    const freshP = (allMeals || []).reduce((s: number, m: any) => s + (m.protein || 0), 0);
    const freshC = (allMeals || []).reduce((s: number, m: any) => s + (m.carbs || 0), 0);
    const freshF = (allMeals || []).reduce((s: number, m: any) => s + (m.fat || 0), 0);

    // Set totals via logHabitAction
    const promises = [];
    if (freshP > 0) promises.push(logHabitAction(userId, 'macro_protein', freshP, userProfile.bodyweight, 'Protein'));
    if (freshC > 0) promises.push(logHabitAction(userId, 'macro_carbs', freshC, userProfile.bodyweight, 'Carbs'));
    if (freshF > 0) promises.push(logHabitAction(userId, 'macro_fat', freshF, userProfile.bodyweight, 'Fat'));
    if (promises.length) await Promise.all(promises);
    onUpdate();
  };

  return (
    <div className="space-y-3">
      {/* AI Input — always first */}
      <NutritionInput onFoodsFound={handleFoodsFound} onPhotoFoods={handleFoodsFound} />

      {/* Meal Cart — appears when items added */}
      <MealCart
        items={cart}
        onRemove={i => setCart(prev => prev.filter((_, idx) => idx !== i))}
        onUpdateServing={(i, g) => setCart(prev => prev.map((item, idx) => {
          if (idx !== i) return item;
          const mult = g / 100;
          return { ...item, servingGrams: g, p: Math.round(item.food.per100g.protein * mult), c: Math.round(item.food.per100g.carbs * mult), f: Math.round(item.food.per100g.fat * mult) };
        }))}
        onLogMeal={handleLogMeal}
        logging={logging}
      />

      {/* Recents — one-tap logging */}
      <RecentFoods onInstantLog={handleInstantLog} />

      {/* Progress — collapsed by default */}
      <NutritionProgress totals={totals} targets={targets} userId={userId} />
    </div>
  );
}
