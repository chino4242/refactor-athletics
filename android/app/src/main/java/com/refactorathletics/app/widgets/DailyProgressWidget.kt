package com.refactorathletics.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.refactorathletics.app.MainActivity
import com.refactorathletics.app.R
import org.json.JSONObject

class DailyProgressWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_daily_progress)

            // Read cached data from SharedPreferences (written by Capacitor bridge)
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val raw = prefs.getString("widget_data", null)

            if (raw != null) {
                try {
                    val data = JSONObject(raw)
                    val streak = data.optInt("streak", 0)
                    val level = data.optInt("level", 1)
                    val xp = data.optInt("xp", 0)
                    val questsDone = data.optInt("questsDone", 0)
                    val questsTotal = data.optInt("questsTotal", 5)
                    val steps = data.optInt("steps", 0)
                    val sleep = data.optDouble("sleep", 0.0)
                    val protein = data.optInt("protein", 0)

                    views.setTextViewText(R.id.streak_text, "🔥 Day $streak")
                    views.setTextViewText(R.id.level_text, "Lv $level")
                    views.setTextViewText(R.id.xp_text, "+$xp XP")
                    views.setTextViewText(R.id.quest_count, "$questsDone/$questsTotal")
                    views.setProgressBar(R.id.quest_progress, 100,
                        if (questsTotal > 0) (questsDone * 100 / questsTotal) else 0, false)
                    views.setTextViewText(R.id.habit_steps, "👟 ${formatSteps(steps)}")
                    views.setTextViewText(R.id.habit_sleep, "😴 ${sleep}h")
                    views.setTextViewText(R.id.habit_protein, "🥩 ${protein}g")
                } catch (_: Exception) {}
            }

            // Tap widget → open app
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun formatSteps(steps: Int): String {
            return if (steps >= 1000) "${steps / 1000}.${(steps % 1000) / 100}k" else "$steps"
        }
    }
}
