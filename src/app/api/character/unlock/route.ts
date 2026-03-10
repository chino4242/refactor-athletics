import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { gearId } = await request.json();
    
    if (!gearId) {
        return NextResponse.json({ error: 'Gear ID required' }, { status: 400 });
    }
    
    // Get gear details
    const { data: gear, error: gearError } = await supabase
        .from('gear_catalog')
        .select('*')
        .eq('id', gearId)
        .single();
    
    if (gearError || !gear) {
        return NextResponse.json({ error: 'Gear not found' }, { status: 404 });
    }
    
    // Get user's current XP and power level
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('career_xp, power_level')
        .eq('id', user.id)
        .single();
    
    if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user has enough XP
    if (userData.career_xp < gear.xp_cost) {
        return NextResponse.json({ 
            error: 'Insufficient XP',
            required: gear.xp_cost,
            current: userData.career_xp
        }, { status: 400 });
    }
    
    // Check if user meets power level requirement
    if (userData.power_level < gear.min_power_level) {
        return NextResponse.json({ 
            error: 'Power Level too low',
            required: gear.min_power_level,
            current: userData.power_level
        }, { status: 400 });
    }
    
    // Check if already unlocked
    const { data: existing } = await supabase
        .from('user_gear')
        .select('*')
        .eq('user_id', user.id)
        .eq('gear_id', gearId)
        .single();
    
    if (existing) {
        return NextResponse.json({ error: 'Gear already unlocked' }, { status: 400 });
    }
    
    // Deduct XP
    const { error: xpError } = await supabase
        .from('users')
        .update({ career_xp: userData.career_xp - gear.xp_cost })
        .eq('id', user.id);
    
    if (xpError) {
        return NextResponse.json({ error: 'Failed to deduct XP' }, { status: 500 });
    }
    
    // Unlock gear
    const { error: unlockError } = await supabase
        .from('user_gear')
        .insert({ user_id: user.id, gear_id: gearId });
    
    if (unlockError) {
        // Rollback XP deduction
        await supabase
            .from('users')
            .update({ career_xp: userData.career_xp })
            .eq('id', user.id);
        
        return NextResponse.json({ error: 'Failed to unlock gear' }, { status: 500 });
    }
    
    return NextResponse.json({ 
        success: true,
        gear,
        newXp: userData.career_xp - gear.xp_cost
    });
}
