import { NextRequest, NextResponse } from 'next/server';

export interface FoodResult {
  id: string;
  name: string;
  brand?: string;
  source: 'usda' | 'off';
  servingSize?: string;
  servingLabel?: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
}

const USDA_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';

// Extract nutrient value from USDA foodNutrients array
function usdaNutrient(nutrients: any[], name: string, unit?: string): number {
  const n = nutrients.find((n: any) => n.nutrientName === name && (!unit || n.unitName === unit));
  return n?.value || 0;
}

async function searchUSDA(query: string): Promise<FoodResult[]> {
  // Search branded and foundation separately — branded gets priority
  const [brandedRes, foundationRes] = await Promise.all([
    fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + USDA_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, dataType: ['Branded'], pageSize: 10 }),
    }),
    fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + USDA_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, dataType: ['Foundation', 'SR Legacy'], pageSize: 5 }),
    }),
  ]);
  const branded = brandedRes.ok ? (await brandedRes.json()).foods || [] : [];
  const foundation = foundationRes.ok ? (await foundationRes.json()).foods || [] : [];
  return [...branded, ...foundation].map((f: any) => ({
    id: `usda_${f.fdcId}`,
    name: f.description,
    brand: f.brandName || f.brandOwner || undefined,
    source: 'usda' as const,
    servingSize: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : undefined,
    servingLabel: f.householdServingFullText || undefined,
    per100g: {
      calories: Math.round(usdaNutrient(f.foodNutrients, 'Energy', 'KCAL')),
      protein: Math.round(usdaNutrient(f.foodNutrients, 'Protein') * 10) / 10,
      carbs: Math.round(usdaNutrient(f.foodNutrients, 'Carbohydrate, by difference') * 10) / 10,
      fat: Math.round(usdaNutrient(f.foodNutrients, 'Total lipid (fat)') * 10) / 10,
    },
  }));
}

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID || '';
const NUTRITIONIX_API_KEY = process.env.NUTRITIONIX_API_KEY || '';

async function searchNutritionix(query: string): Promise<FoodResult[]> {
  if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_API_KEY) return [];
  try {
    const res = await fetch('https://trackapi.nutritionix.com/v2/search/instant?query=' + encodeURIComponent(query), {
      headers: { 'x-app-id': NUTRITIONIX_APP_ID, 'x-app-key': NUTRITIONIX_API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = [...(data.branded || []).slice(0, 5), ...(data.common || []).slice(0, 5)];
    return items.map((item: any) => ({
      id: `nx_${item.nix_item_id || item.food_name}`,
      name: item.food_name || item.brand_name_item_name || '',
      brand: item.brand_name || undefined,
      source: 'usda' as const, // reuse type for simplicity
      servingSize: item.serving_qty && item.serving_unit ? `${item.serving_qty} ${item.serving_unit}` : '1 serving',
      per100g: {
        calories: Math.round(item.nf_calories || 0),
        protein: Math.round((item.nf_protein || 0) * 10) / 10,
        carbs: Math.round((item.nf_total_carbohydrate || 0) * 10) / 10,
        fat: Math.round((item.nf_total_fat || 0) * 10) / 10,
      },
    }));
  } catch { return []; }
}

// Common foods fallback for when APIs return poor results
const COMMON_FOODS: FoodResult[] = [
  { id: 'common_chicken_breast', name: 'Chicken Breast (grilled)', source: 'usda', per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
  { id: 'common_eggs', name: 'Eggs (large, whole)', source: 'usda', servingSize: '50g', per100g: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } },
  { id: 'common_rice_white', name: 'White Rice (cooked)', source: 'usda', per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
  { id: 'common_rice_brown', name: 'Brown Rice (cooked)', source: 'usda', per100g: { calories: 123, protein: 2.7, carbs: 26, fat: 1 } },
  { id: 'common_banana', name: 'Banana', source: 'usda', servingSize: '118g', per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  { id: 'common_oatmeal', name: 'Oatmeal (cooked)', source: 'usda', per100g: { calories: 68, protein: 2.4, carbs: 12, fat: 1.4 } },
  { id: 'common_greek_yogurt', name: 'Greek Yogurt (plain, nonfat)', source: 'usda', servingSize: '170g', per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.7 } },
  { id: 'common_salmon', name: 'Salmon (baked)', source: 'usda', per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
  { id: 'common_ground_beef', name: 'Ground Beef (90% lean)', source: 'usda', per100g: { calories: 176, protein: 20, carbs: 0, fat: 10 } },
  { id: 'common_avocado', name: 'Avocado', source: 'usda', per100g: { calories: 160, protein: 2, carbs: 9, fat: 15 } },
  { id: 'common_sweet_potato', name: 'Sweet Potato (baked)', source: 'usda', per100g: { calories: 90, protein: 2, carbs: 21, fat: 0.1 } },
  { id: 'common_broccoli', name: 'Broccoli (steamed)', source: 'usda', per100g: { calories: 35, protein: 2.4, carbs: 7, fat: 0.4 } },
  { id: 'common_peanut_butter', name: 'Peanut Butter', source: 'usda', servingSize: '32g', per100g: { calories: 588, protein: 25, carbs: 20, fat: 50 } },
  { id: 'common_whole_milk', name: 'Whole Milk', source: 'usda', servingSize: '244g', per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
  { id: 'common_protein_shake', name: 'Whey Protein Shake (1 scoop)', source: 'usda', servingSize: '31g', per100g: { calories: 387, protein: 80, carbs: 6.5, fat: 3.2 } },
];

async function searchOFF(query: string): Promise<FoodResult[]> {
  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=true&page_size=10&fields=code,product_name,brands,nutriments,serving_size`,
    { headers: { 'User-Agent': 'RefactorAthletics/1.0 (contact@refactorathletics.com)' } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products || [])
    .filter((p: any) => p.product_name && p.nutriments)
    .map((p: any) => ({
      id: `off_${p.code}`,
      name: p.product_name,
      brand: p.brands,
      source: 'off' as const,
      servingSize: p.serving_size || '100g',
      per100g: {
        calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
        protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
      },
    }));
}

async function lookupBarcode(barcode: string): Promise<FoodResult | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,nutriments,serving_size`,
    { headers: { 'User-Agent': 'RefactorAthletics/1.0' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  return {
    id: `off_${barcode}`,
    name: p.product_name || 'Unknown Product',
    brand: p.brands,
    source: 'off',
    servingSize: p.serving_size || '100g',
    per100g: {
      calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
      protein: Math.round((p.nutriments?.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((p.nutriments?.fat_100g || 0) * 10) / 10,
    },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const barcode = searchParams.get('barcode');

  if (barcode) {
    const result = await lookupBarcode(barcode);
    return NextResponse.json(result ? { results: [result] } : { results: [] });
  }

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Search all sources in parallel
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const [usda, off, nx] = await Promise.all([searchUSDA(query), searchOFF(query), searchNutritionix(query)]);

  // Include matching common foods
  const commonMatches = COMMON_FOODS.filter(f => f.name.toLowerCase().includes(q) || words.some(w => f.name.toLowerCase().includes(w)));

  // Score and rank results by relevance
  const score = (r: FoodResult) => {
    const name = r.name.toLowerCase();
    const brand = (r.brand || '').toLowerCase();
    let s = 0;
    // Penalize bad data (0 calories usually means incomplete)
    if (r.per100g.calories === 0) s -= 50;
    // Exact full query match in name or brand
    if (name.includes(q)) s += 100;
    if (brand.includes(q)) s += 80;
    // Name starts with query
    if (name.startsWith(q)) s += 50;
    // Individual word matches
    for (const w of words) {
      if (brand.includes(w)) s += 15;
      if (name.includes(w)) s += 10;
    }
    // Boost branded/recognizable items
    if (r.brand) s += 10;
    // Boost common foods
    if (r.id.startsWith('common_')) s += 30;
    // Boost Nutritionix (better restaurant data)
    if (r.id.startsWith('nx_')) s += 20;
    // Penalize very long names (usually less relevant)
    if (name.length > 80) s -= 10;
    return s;
  };

  const all = [...nx, ...commonMatches, ...usda, ...off];
  all.sort((a, b) => score(b) - score(a));

  return NextResponse.json({ results: all.slice(0, 20) });
}
