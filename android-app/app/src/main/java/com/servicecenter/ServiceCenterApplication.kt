package com.servicecenter

import android.app.Application
import com.servicecenter.data.sync.SyncManager
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class ServiceCenterApplication : Application() {
    
    @Inject
    lateinit var syncManager: SyncManager
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize sync manager after dependency injection is ready
        // We need to do this in a post-injection callback
        // For now, we'll start it manually in MainActivity after Hilt injection
    }
}


