import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all gear from catalog
    const { data: allGear, error: gearError } = await supabase
        .from('gear_catalog')
        .select('*')
        .order('xp_cost', { ascending: true });
    
    if (gearError) {
        return NextResponse.json({ error: gearError.message }, { status: 500 });
    }
    
    // Get user's unlocked gear
    const { data: unlockedGear, error: unlockedError } = await supabase
        .from('user_gear')
        .select('gear_id')
        .eq('user_id', user.id);
    
    if (unlockedError) {
        return NextResponse.json({ error: unlockedError.message }, { status: 500 });
    }
    
    // Mark which gear is unlocked
    const gearWithStatus = allGear?.map(gear => ({
        ...gear,
        unlocked: unlockedGear?.some(ug => ug.gear_id === gear.id) || false
    })) || [];
    
    return NextResponse.json(gearWithStatus);
}
