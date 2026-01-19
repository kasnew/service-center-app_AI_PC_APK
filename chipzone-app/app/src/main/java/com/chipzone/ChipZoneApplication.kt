package com.chipzone

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class ChipZoneApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Load SQLCipher native library
        try {
            System.loadLibrary("sqlcipher")
            android.util.Log.d("ChipZoneApplication", "SQLCipher library loaded successfully")
        } catch (e: UnsatisfiedLinkError) {
            android.util.Log.e("ChipZoneApplication", "Failed to load SQLCipher library: ${e.message}", e)
        }
    }
}

