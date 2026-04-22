import { NextRequest, NextResponse } from 'next/server';

export interface FoodResult {
  id: string;
  name: string;
  brand?: string;
  source: 'usda' | 'off';
  servingSize?: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
}

const USDA_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';

// Extract nutrient value from USDA foodNutrients array
function usdaNutrient(nutrients: any[], name: string, unit?: string): number {
  const n = nutrients.find((n: any) => n.nutrientName === name && (!unit || n.unitName === unit));
  return n?.value || 0;
}

async function searchUSDA(query: string): Promise<FoodResult[]> {
  const res = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + USDA_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      dataType: ['Branded', 'Foundation', 'SR Legacy'],
      pageSize: 15,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.foods || []).map((f: any) => ({
    id: `usda_${f.fdcId}`,
    name: f.description,
    brand: f.brandName || f.brandOwner || undefined,
    source: 'usda' as const,
    servingSize: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : '100g',
    per100g: {
      calories: Math.round(usdaNutrient(f.foodNutrients, 'Energy', 'KCAL')),
      protein: Math.round(usdaNutrient(f.foodNutrients, 'Protein') * 10) / 10,
      carbs: Math.round(usdaNutrient(f.foodNutrients, 'Carbohydrate, by difference') * 10) / 10,
      fat: Math.round(usdaNutrient(f.foodNutrients, 'Total lipid (fat)') * 10) / 10,
    },
  }));
}

async function searchOFF(query: string): Promise<FoodResult[]> {
  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,brands,nutriments,serving_size`,
    { headers: { 'User-Agent': 'RefactorAthletics/1.0' } }
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

  // Search both in parallel, USDA first (whole foods), OFF second (packaged)
  const [usda, off] = await Promise.all([searchUSDA(query), searchOFF(query)]);

  // Interleave: USDA results first, then OFF
  return NextResponse.json({ results: [...usda, ...off] });
}
