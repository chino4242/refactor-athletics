package com.refactorathletics.app.workers

import android.content.Context
import android.content.SharedPreferences
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit

class HealthSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val supabaseUrl = prefs.getString("supabase_url", null) ?: return Result.retry()
        val authToken = prefs.getString("auth_token", null) ?: return Result.retry()
        val userId = prefs.getString("user_id", null) ?: return Result.retry()
        val timezone = prefs.getString("user_timezone", "America/New_York") ?: "America/New_York"

        val healthClient = try {
            HealthConnectClient.getOrCreate(applicationContext)
        } catch (e: Exception) {
            return Result.failure()
        }

        val zone = ZoneId.of(timezone)
        val today = LocalDate.now(zone)

        // Sync today and yesterday
        for (daysBack in 0..1) {
            val date = today.minusDays(daysBack.toLong())
            val start = date.atStartOfDay(zone).toInstant()
            val end = if (daysBack == 0) Instant.now() else date.plusDays(1).atStartOfDay(zone).toInstant()
            val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)

            try {
                val stepsResult = healthClient.aggregate(
                    AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(start, end)
                    )
                )
                val steps = stepsResult[StepsRecord.COUNT_TOTAL] ?: 0L

                val calResult = healthClient.aggregate(
                    AggregateRequest(
                        metrics = setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(start, end)
                    )
                )
                val calories = calResult[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories?.toLong() ?: 0L

                // Write to Supabase via REST (only if value > 0 and > existing)
                if (steps > 0) {
                    writeToSupabase(supabaseUrl, authToken, userId, "habit_steps", steps, dateStr)
                }
                if (calories > 0) {
                    writeToSupabase(supabaseUrl, authToken, userId, "macro_calories_burned", calories, dateStr)
                }
            } catch (e: Exception) {
                // Individual day failure — continue to next day
            }
        }

        return Result.success()
    }

    private suspend fun writeToSupabase(
        supabaseUrl: String, token: String, userId: String,
        habitId: String, value: Long, date: String
    ) = withContext(Dispatchers.IO) {
        // Check existing value first — only write if new value is higher
        val checkUrl = URL("$supabaseUrl/rest/v1/habit_logs?user_id=eq.$userId&habit_id=eq.$habitId&date=eq.$date&select=value&order=value.desc&limit=1")
        val checkConn = (checkUrl.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("apikey", getAnonKey())
            setRequestProperty("Authorization", "Bearer $token")
        }
        try {
            if (checkConn.responseCode == 200) {
                val body = checkConn.inputStream.bufferedReader().readText()
                // Simple parse: [{"value":12345}] or []
                val existingMatch = Regex(""""value"\s*:\s*(\d+)""").find(body)
                val existing = existingMatch?.groupValues?.get(1)?.toLongOrNull() ?: 0
                if (existing >= value) return@withContext // Don't overwrite higher value
            }
        } finally { checkConn.disconnect() }

        // Delete existing for this date (set-mode)
        val deleteUrl = URL("$supabaseUrl/rest/v1/habit_logs?user_id=eq.$userId&habit_id=eq.$habitId&date=eq.$date")
        val deleteConn = (deleteUrl.openConnection() as HttpURLConnection).apply {
            requestMethod = "DELETE"
            setRequestProperty("apikey", getAnonKey())
            setRequestProperty("Authorization", "Bearer $token")
        }
        try { deleteConn.responseCode } finally { deleteConn.disconnect() }

        // Insert new value
        val insertUrl = URL("$supabaseUrl/rest/v1/habit_logs")
        val insertConn = (insertUrl.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("apikey", getAnonKey())
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
        }
        val noon = "${date}T12:00:00"
        val json = """{"user_id":"$userId","habit_id":"$habitId","date":"$date","value":$value,"xp":0,"timestamp":${Instant.parse("${noon}Z").epochSecond}}"""
        try {
            insertConn.outputStream.write(json.toByteArray())
            insertConn.responseCode
        } finally { insertConn.disconnect() }
    }

    private fun getAnonKey(): String {
        val prefs = applicationContext.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        return prefs.getString("supabase_anon_key", "") ?: ""
    }

    companion object {
        private const val WORK_NAME = "health_sync_periodic"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<HealthSyncWorker>(1, TimeUnit.HOURS)
                .setConstraints(constraints)
                .setInitialDelay(15, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }
}
