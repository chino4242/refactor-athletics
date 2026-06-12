package com.refactorathletics.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.refactorathletics.plugins.healthconnect.HealthConnectPlugin;
import com.refactorathletics.app.workers.HealthSyncWorker;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class);
        super.onCreate(savedInstanceState);

        // Schedule background health sync (WorkManager — every 1 hour, requires network)
        HealthSyncWorker.Companion.schedule(this);
    }
}
