import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PUT(request: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { gear } = await request.json();
    
    // Get current character config
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('character_config')
        .eq('id', user.id)
        .single();
    
    if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update gear in character config
    const updatedConfig = {
        ...userData.character_config,
        gear
    };
    
    const { error: updateError } = await supabase
        .from('users')
        .update({ character_config: updatedConfig })
        .eq('id', user.id);
    
    if (updateError) {
        return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, character_config: updatedConfig });
}
