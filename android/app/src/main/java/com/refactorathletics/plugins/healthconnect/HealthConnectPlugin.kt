package com.refactorathletics.plugins.healthconnect

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

@CapacitorPlugin(name = "Health")
class HealthConnectPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var client: HealthConnectClient? = null

    override fun load() {
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) {
            client = HealthConnectClient.getOrCreate(context)
        }
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        val ret = JSObject()
        ret.put("available", status == HealthConnectClient.SDK_AVAILABLE)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestAuthorization(call: PluginCall) {
        val hc = client ?: run {
            call.resolve(JSObject().put("granted", false))
            return
        }
        val readTypes = call.getArray("read") ?: JSArray()
        val writeTypes = call.getArray("write") ?: JSArray()

        val permissions = mutableSetOf<String>()
        for (i in 0 until readTypes.length()) {
            mapToRecordClass(readTypes.getString(i))?.let {
                permissions.add(HealthPermission.getReadPermission(it))
            }
        }
        for (i in 0 until writeTypes.length()) {
            mapToRecordClass(writeTypes.getString(i))?.let {
                permissions.add(HealthPermission.getWritePermission(it))
            }
        }

        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                // If at least some permissions are granted, consider it successful
                if (granted.any { it in permissions }) {
                    call.resolve(JSObject().put("granted", true))
                } else {
                    // Try to launch HC permissions screen
                    try {
                        val intent = PermissionController.createRequestPermissionResultContract()
                            .createIntent(context, permissions)
                        activity.startActivity(intent)
                    } catch (_: Exception) {}
                    // Re-check after potential grant
                    val recheck = hc.permissionController.getGrantedPermissions()
                    call.resolve(JSObject().put("granted", recheck.isNotEmpty()))
                }
            } catch (e: Exception) {
                call.resolve(JSObject().put("granted", false))
            }
        }
    }

    @PluginMethod
    fun queryAggregated(call: PluginCall) {
        val hc = client ?: run {
            call.resolve(JSObject().put("value", 0))
            return
        }
        val dataType = call.getString("dataType") ?: ""
        val startDate = call.getString("startDate") ?: ""
        val endDate = call.getString("endDate") ?: ""

        scope.launch {
            try {
                val start = Instant.parse(startDate)
                val end = Instant.parse(endDate)
                val timeRange = TimeRangeFilter.between(start, end)

                val metric = when (dataType) {
                    "steps" -> StepsRecord.COUNT_TOTAL
                    "calories" -> ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
                    "totalCalories" -> TotalCaloriesBurnedRecord.ENERGY_TOTAL
                    "sleep" -> SleepSessionRecord.SLEEP_DURATION_TOTAL
                    else -> null
                }

                if (metric == null) {
                    call.resolve(JSObject().put("value", 0))
                    return@launch
                }

                val response = hc.aggregate(
                    AggregateRequest(setOf(metric), timeRange)
                )

                val value: Any? = when (dataType) {
                    "steps" -> response[StepsRecord.COUNT_TOTAL]
                    "calories" -> response[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories
                    "totalCalories" -> response[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories
                    "sleep" -> response[SleepSessionRecord.SLEEP_DURATION_TOTAL]?.toMinutes()
                    else -> 0
                }

                call.resolve(JSObject().put("value", value ?: 0))
            } catch (e: Exception) {
                call.resolve(JSObject().put("value", 0))
            }
        }
    }

    @PluginMethod
    fun readSamples(call: PluginCall) {
        // Delegate to query — same implementation, different JS method name
        val hc = client ?: run {
            call.resolve(JSObject().put("samples", JSArray()))
            return
        }
        val dataType = call.getString("dataType") ?: ""
        val startDate = call.getString("startDate") ?: ""
        val endDate = call.getString("endDate") ?: ""
        val limit = call.getInt("limit") ?: 10

        scope.launch {
            try {
                val start = Instant.parse(startDate)
                val end = Instant.parse(endDate)
                val timeRange = TimeRangeFilter.between(start, end)
                val samples = JSONArray()

                when (dataType) {
                    "weight" -> {
                        val records = hc.readRecords(ReadRecordsRequest(WeightRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            samples.put(JSONObject().put("value", r.weight.inKilograms))
                        }
                    }
                    "heartRateVariability" -> {
                        val records = hc.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            samples.put(JSONObject().put("value", r.heartRateVariabilityMillis))
                        }
                    }
                    "heartRate" -> {
                        val records = hc.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            val avg = r.samples.map { it.beatsPerMinute }.average()
                            samples.put(JSONObject().put("value", avg))
                        }
                    }
                    "bodyFat" -> {
                        val records = hc.readRecords(ReadRecordsRequest(BodyFatRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            samples.put(JSONObject().put("value", r.percentage.value))
                        }
                    }
                }

                call.resolve(JSObject().put("samples", samples))
            } catch (e: Exception) {
                call.resolve(JSObject().put("samples", JSArray()))
            }
        }
    }

    @PluginMethod
    fun query(call: PluginCall) {
        val hc = client ?: run {
            call.resolve(JSObject().put("results", JSArray()))
            return
        }
        val dataType = call.getString("dataType") ?: ""
        val startDate = call.getString("startDate") ?: ""
        val endDate = call.getString("endDate") ?: ""
        val limit = call.getInt("limit") ?: 10

        scope.launch {
            try {
                val start = Instant.parse(startDate)
                val end = Instant.parse(endDate)
                val timeRange = TimeRangeFilter.between(start, end)
                val results = JSONArray()

                when (dataType) {
                    "weight" -> {
                        val records = hc.readRecords(ReadRecordsRequest(WeightRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            results.put(JSONObject().put("value", r.weight.inKilograms * 2.20462))
                        }
                    }
                    "heart_rate" -> {
                        val records = hc.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            val avg = r.samples.map { it.beatsPerMinute }.average()
                            results.put(JSONObject().put("value", avg))
                        }
                    }
                    "heart_rate_variability" -> {
                        val records = hc.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            results.put(JSONObject().put("value", r.heartRateVariabilityMillis))
                        }
                    }
                    "body_fat_percentage" -> {
                        val records = hc.readRecords(ReadRecordsRequest(BodyFatRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            results.put(JSONObject().put("value", r.percentage.value))
                        }
                    }
                    "lean_body_mass" -> {
                        val records = hc.readRecords(ReadRecordsRequest(LeanBodyMassRecord::class, timeRange))
                        records.records.takeLast(limit).forEach { r ->
                            results.put(JSONObject().put("value", r.mass.inKilograms * 2.20462))
                        }
                    }
                }

                call.resolve(JSObject().put("results", results))
            } catch (e: Exception) {
                call.resolve(JSObject().put("results", JSArray()))
            }
        }
    }

    @PluginMethod
    fun queryWorkouts(call: PluginCall) {
        val hc = client ?: run {
            call.resolve(JSObject().put("workouts", JSArray()))
            return
        }
        val startDate = call.getString("startDate") ?: ""
        val endDate = call.getString("endDate") ?: ""
        val limit = call.getInt("limit") ?: 20

        scope.launch {
            try {
                val start = Instant.parse(startDate)
                val end = Instant.parse(endDate)
                val timeRange = TimeRangeFilter.between(start, end)
                val records = hc.readRecords(
                    ReadRecordsRequest(ExerciseSessionRecord::class, timeRange)
                )
                val workouts = JSONArray()
                records.records.takeLast(limit).forEach { r ->
                    val dur = java.time.Duration.between(r.startTime, r.endTime).seconds
                    workouts.put(JSONObject().apply {
                        put("type", r.exerciseType.toString())
                        put("exerciseType", r.exerciseType.toString())
                        put("duration", dur)
                        put("duration_seconds", dur)
                        put("start_time", r.startTime.toString())
                        put("end_time", r.endTime.toString())
                    })
                }
                call.resolve(JSObject().put("workouts", workouts))
            } catch (e: Exception) {
                call.resolve(JSObject().put("workouts", JSArray()))
            }
        }
    }

    private fun mapToRecordClass(type: String): kotlin.reflect.KClass<out Record>? {
        return when (type) {
            "steps" -> StepsRecord::class
            "calories" -> ActiveCaloriesBurnedRecord::class
            "totalCalories" -> TotalCaloriesBurnedRecord::class
            "sleep" -> SleepSessionRecord::class
            "weight" -> WeightRecord::class
            "heart_rate" -> HeartRateRecord::class
            "heart_rate_variability" -> HeartRateVariabilityRmssdRecord::class
            "body_fat_percentage" -> BodyFatRecord::class
            "lean_body_mass" -> LeanBodyMassRecord::class
            "exercise" -> ExerciseSessionRecord::class
            "workouts" -> ExerciseSessionRecord::class
            else -> null
        }
    }
}
