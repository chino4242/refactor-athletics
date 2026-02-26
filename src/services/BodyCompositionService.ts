import { createClient } from '@/utils/supabase/client';

export interface BodyCompositionEntry {
    date: string;
    weight?: number;
    waist?: number;
    arms?: number;
    chest?: number;
    legs?: number;
    shoulders?: number;
    [key: string]: string | number | undefined;
}

export const BodyCompositionService = {
    getHistory: async (userId: string): Promise<BodyCompositionEntry[]> => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('history')
            .select('*')
            .in('exercise_id', [
                'habit_weigh_in',
                'habit_measure_waist',
                'habit_measure_arms',
                'habit_measure_legs',
                'habit_measure_chest',
                'habit_measure_shoulders'
            ])
            .eq('user_id', userId)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error("Error fetching body composition history:", error);
            return [];
        }

        const grouped: Record<string, BodyCompositionEntry> = {};
        for (const row of data) {
            const date = row.date;
            if (!grouped[date]) {
                grouped[date] = { date };
            }

            const val = Number(row.raw_value);
            switch (row.exercise_id) {
                case 'habit_weigh_in': grouped[date].weight = val; break;
                case 'habit_measure_waist': grouped[date].waist = val; break;
                case 'habit_measure_arms': grouped[date].arms = val; break;
                case 'habit_measure_legs': grouped[date].legs = val; break;
                case 'habit_measure_chest': grouped[date].chest = val; break;
                case 'habit_measure_shoulders': grouped[date].shoulders = val; break;
            }
        }

        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    },

    logMeasurements: async (userId: string, date: string, measurements: Partial<BodyCompositionEntry>): Promise<void> => {
        // In the new architecture, BodyCompositionModal also calls handleLog() directly.
        // So we don't need to double-log here! 
        // Returning seamlessly.
        return Promise.resolve();
    }
};
