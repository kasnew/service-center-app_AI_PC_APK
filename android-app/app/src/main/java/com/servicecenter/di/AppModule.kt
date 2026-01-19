package com.servicecenter.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.room.Room
import com.servicecenter.data.api.ApiClient
import com.servicecenter.data.api.ApiService
import com.servicecenter.data.local.database.AppDatabase
import com.servicecenter.data.repository.RepairRepository
import com.servicecenter.data.repository.TransactionRepository
import com.servicecenter.data.repository.WarehouseRepository
import com.servicecenter.data.sync.SyncManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        val dbBuilder = Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "service_center_db"
        )
        
        // Try to load pre-populated database from assets if it exists
        // The database file should be placed in: app/src/main/assets/databases/service_center_db
        try {
            // Check if pre-populated database exists in assets
            val assetPath = "databases/service_center_db"
            context.assets.open(assetPath).use {
                // File exists, configure Room to use it
                dbBuilder.createFromAsset(assetPath)
                android.util.Log.d("AppModule", "Using pre-populated database from assets: $assetPath")
            }
        } catch (e: java.io.FileNotFoundException) {
            // Pre-populated database not found in assets, will create empty database
            android.util.Log.d("AppModule", "Pre-populated database not found in assets, will create empty database")
        } catch (e: Exception) {
            // Other error, log and continue without pre-populated database
            android.util.Log.w("AppModule", "Error checking for pre-populated database: ${e.message}, will create empty database")
        }
        
        return dbBuilder
            .fallbackToDestructiveMigration() // For development - will recreate DB on schema change
            .build()
    }
    
    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return context.dataStore
    }
    
    @Provides
    @Singleton
    fun provideApiClient(): com.servicecenter.data.api.ApiClient {
        return com.servicecenter.data.api.ApiClient()
    }
    
    @Provides
    @Singleton
    fun provideRepairRepository(
        apiClient: ApiClient,
        database: AppDatabase
    ): RepairRepository {
        return RepairRepository(
            apiClient = apiClient,
            repairDao = database.repairDao()
        )
    }
    
    @Provides
    @Singleton
    fun provideWarehouseRepository(
        apiClient: ApiClient,
        database: AppDatabase
    ): WarehouseRepository {
        return WarehouseRepository(
            apiClient = apiClient,
            warehouseDao = database.warehouseItemDao()
        )
    }
    
    @Provides
    @Singleton
    fun provideTransactionRepository(
        apiClient: ApiClient,
        database: AppDatabase
    ): TransactionRepository {
        return TransactionRepository(
            apiClient = apiClient,
            transactionDao = database.transactionDao()
        )
    }
    
    @Provides
    @Singleton
    fun provideSyncManager(
        @ApplicationContext context: Context,
        repairRepository: RepairRepository,
        warehouseRepository: WarehouseRepository,
        transactionRepository: TransactionRepository,
        dataStore: DataStore<Preferences>
    ): SyncManager {
        return SyncManager(
            context = context,
            repairRepository = repairRepository,
            warehouseRepository = warehouseRepository,
            transactionRepository = transactionRepository,
            dataStore = dataStore
        )
    }
}


