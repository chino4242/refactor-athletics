# Spec: Custom Capacitor Health Connect Plugin (Kotlin)

## Problem Statement
The third-party `@capgo/capacitor-health` plugin has unresolvable AGP version incompatibilities that prevent it from working with any available Android Studio version. A custom plugin, maintained in-repo, eliminates this dependency and gives full control over Gradle compatibility.

## Goal
Build a minimal Capacitor plugin in Kotlin that reads Health Connect data on Android and exposes it to the WebView via the Capacitor bridge. It replaces `@capgo/capacitor-health` for the Android side only (iOS continues using the same plugin for HealthKit, or a similar custom approach).

## Scope
The plugin needs to support exactly what `nativeHealth.ts` calls:
- `isAvailable()` → boolean (is Health Connect installed?)
- `requestAuthorization({ read: [...], write: [...] })` → { granted: boolean }
- `queryAggregated({ dataType, startDate, endDate })` → { value: number }
- `query({ dataType, startDate, endDate, limit })` → { results: [{value, startDate, endDate}] }

### Data Types (matching existing nativeHealth.ts)
| JS name | Health Connect type |
|---------|-------------------|
| steps | StepsRecord |
| calories | ActiveCaloriesBurnedRecord |
| sleep | SleepSessionRecord |
| weight | WeightRecord |
| heart_rate | HeartRateRecord |
| heart_rate_variability | HeartRateVariabilityRmssdRecord |
| body_fat_percentage | BodyFatRecord |
| lean_body_mass | LeanBodyMassRecord |
| exercise | ExerciseSessionRecord |

## Architecture

### File Structure
```
android/app/src/main/java/com/refactorathletics/plugins/healthconnect/
├── HealthConnectPlugin.kt          # Capacitor plugin class (@CapacitorPlugin)
├── HealthConnectManager.kt         # Health Connect SDK calls
└── DataTypeMapper.kt               # Maps JS string names → HC record types
```

### Registration
Register in `MainActivity.java`:
```java
import com.refactorathletics.plugins.healthconnect.HealthConnectPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### Plugin Class (HealthConnectPlugin.kt)
```kotlin
@CapacitorPlugin(name = "Health")  // Must match JS import name
class HealthConnectPlugin : Plugin() {
    @PluginMethod
    fun isAvailable(call: PluginCall) { ... }

    @PluginMethod
    fun requestAuthorization(call: PluginCall) { ... }

    @PluginMethod
    fun queryAggregated(call: PluginCall) { ... }

    @PluginMethod
    fun query(call: PluginCall) { ... }
}
```

### Key Design Decisions
1. **Plugin name = "Health"** — matches what the deployed JS (`nativeHealth.ts`) already imports. Zero web code changes needed.
2. **No Gradle buildscript block** — the plugin lives inside the app module, not as a separate library. Avoids all AGP version conflicts.
3. **Direct Health Connect SDK** — use `androidx.health.connect:connect-client` directly (the official Google library).
4. **Coroutines** — Health Connect APIs are suspend functions; use `kotlinx-coroutines` with `CoroutineScope` tied to the plugin lifecycle.

## Dependencies (add to android/app/build.gradle)
```groovy
dependencies {
    implementation "androidx.health.connect:connect-client:1.1.0"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0"
}
```

## Removing @capgo/capacitor-health
Once the custom plugin is built:
1. `npm uninstall @capgo/capacitor-health`
2. Remove from `capacitor.plugins.json` (or it'll auto-remove on `cap sync`)
3. The `nativeHealth.ts` JS code stays unchanged — it calls `Health` plugin by name

## AGP Compatibility
Since the plugin lives inside `android/app/` (not a separate library module), it's compiled as part of the app. No library variant issues, no `newDsl` conflicts, no separate `build.gradle`. It'll work with whatever AGP version Android Studio ships.

## Effort Estimate
- Plugin skeleton + registration: 1 hour
- isAvailable + requestAuthorization: 1 hour  
- queryAggregated (steps, calories, sleep): 2 hours
- query (weight, HR, HRV, body fat, lean mass): 2 hours
- Testing on device: 1 hour
- **Total: ~7 hours / 1 day**

## Success Criteria
- `syncTodayHealth()` in DashboardClient returns real steps/calories/sleep data
- Health Connect permission dialog appears on first run
- No third-party Health Connect dependencies in package.json
- Builds with whatever AGP ships in current Android Studio

## Risks
- Health Connect requires the HC app installed on Android 13 and below (handle gracefully)
- Permission model is per-data-type (user can deny individual types)
- No background sync (read on app open only — matches current pattern)

## Future Considerations
- Could eventually replace HealthKit plugin on iOS with a similar approach
- Could add WRITE support (write workouts to HC) as a v2
- Plugin could be extracted to its own npm package if useful to others
