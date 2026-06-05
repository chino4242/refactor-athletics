package com.refactorathletics.app;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Required by Health Connect / Google Play.
 * Displays a rationale for why the app requests health permissions.
 * The actual permission request is handled by the Capacitor Health plugin.
 */
public class HealthConnectPermissionsRationale extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Redirect to the app — the WebView handles the rationale UI
        finish();
    }
}
