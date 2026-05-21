/** Post an activity event to the user's party feed (if they're in one) */
export async function postPartyEvent(
  supabase: any,
  userId: string,
  event: {
    event_type: string;
    summary: string;
    xp_value: number;
    metadata?: Record<string, any>;
  }
) {
  try {
    // Find user's group
    const { data: membership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!membership) return; // Not in a party

    // Insert event
    await supabase.from('party_events').insert({
      group_id: membership.group_id,
      user_id: userId,
      ...event,
    });

    // Add XP to party
    if (event.xp_value > 0) {
      await supabase.rpc('increment_party_xp', {
        group_id_input: membership.group_id,
        amount: event.xp_value,
      }).catch(() => {
        // RPC may not exist — fallback to direct update
        supabase.from('groups')
          .update({ party_xp: supabase.raw(`party_xp + ${event.xp_value}`) })
          .eq('id', membership.group_id);
      });
    }
  } catch {}
}
