import type { UserProfileData } from '@/types';
import { createClient } from '@/utils/supabase/client';

export const getProfile = async (userId: string): Promise<UserProfileData | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error("Error fetching profile:", error);
        return null;
    }

    return {
        user_id: data.id,
        age: data.age,
        sex: data.sex,
        bodyweight: data.bodyweight,
        goal_weight: data.goal_weight,
        is_onboarded: data.is_onboarded,
        selected_theme: data.selected_theme,
        experience_mode: data.experience_mode,
        timezone: data.timezone,
        display_name: data.display_name,
        nutrition_targets: data.nutrition_targets,
        hidden_habits: data.hidden_habits,
        habit_targets: data.habit_targets,
        body_composition_goals: data.body_composition_goals,
        measurement_mode: data.measurement_mode,
        sync_token: data.sync_token,
        whoop_connected_at: data.whoop_connected_at,
        google_health_connected_at: data.google_health_connected_at,
    };
};

export const saveProfile = async (profile: Partial<UserProfileData> & { user_id: string }): Promise<any> => {
    const supabase = createClient();
    const payload: any = {
        id: profile.user_id,
    };
    
    // Only include defined fields
    if (profile.age !== undefined) payload.age = profile.age;
    if (profile.sex !== undefined) payload.sex = profile.sex;
    if (profile.bodyweight !== undefined) payload.bodyweight = profile.bodyweight;
    if (profile.is_onboarded !== undefined) payload.is_onboarded = profile.is_onboarded;
    if (profile.selected_theme !== undefined) payload.selected_theme = profile.selected_theme;
    if (profile.selected_path !== undefined) payload.selected_path = profile.selected_path;
    if (profile.experience_mode !== undefined) payload.experience_mode = profile.experience_mode;
    if (profile.waiver_accepted_at !== undefined) payload.waiver_accepted_at = profile.waiver_accepted_at;
    if (profile.timezone !== undefined) payload.timezone = profile.timezone;
    if (profile.display_name !== undefined) payload.display_name = profile.display_name;
    if (profile.nutrition_targets !== undefined) payload.nutrition_targets = profile.nutrition_targets;
    if (profile.hidden_habits !== undefined) payload.hidden_habits = profile.hidden_habits;
    if (profile.habit_targets !== undefined) payload.habit_targets = profile.habit_targets;
    if (profile.body_composition_goals !== undefined) payload.body_composition_goals = profile.body_composition_goals;
    if (profile.available_equipment !== undefined) payload.available_equipment = profile.available_equipment;
    if (profile.measurement_mode !== undefined) payload.measurement_mode = profile.measurement_mode;

    const { error } = await supabase
        .from('users')
        .upsert(payload);

    if (error) {
        console.error("Error saving profile:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
    }
    return { status: 'success' };
};
