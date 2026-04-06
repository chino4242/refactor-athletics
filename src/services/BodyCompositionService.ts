import { createClient } from '@/utils/supabase/client';
import { logBodyMeasurementAction } from '@/app/actions';

export interface BodyCompositionEntry {
    date: string;
    weight?: number;
    waist?: number;
    arms?: number;
    chest?: number;
    legs?: number;
    shoulders?: number;
    left_arm_muscle?: number;
    right_arm_muscle?: number;
    trunk_muscle?: number;
    left_leg_muscle?: number;
    right_leg_muscle?: number;
    measurement_mode?: string;
    [key: string]: string | number | undefined;
}

export const BodyCompositionService = {
    getHistory: async (userId: string): Promise<BodyCompositionEntry[]> => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('body_measurements')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error("Error fetching body composition history:", error);
            return [];
        }

        return data.map(row => ({
            date: row.date,
            weight: row.weight,
            waist: row.waist,
            arms: row.arms,
            chest: row.chest,
            legs: row.legs,
            shoulders: row.shoulders,
            left_arm_muscle: row.left_arm_muscle,
            right_arm_muscle: row.right_arm_muscle,
            trunk_muscle: row.trunk_muscle,
            left_leg_muscle: row.left_leg_muscle,
            right_leg_muscle: row.right_leg_muscle,
            measurement_mode: row.measurement_mode,
        }));
    },

    logMeasurements: async (userId: string, date: string, measurements: Partial<BodyCompositionEntry>): Promise<void> => {
        const { date: _, ...measurementData } = measurements;
        await logBodyMeasurementAction(userId, measurementData);
    }
};
