package com.chipzone.di

import android.content.Context
import com.chipzone.data.db.AppDatabase
import com.chipzone.data.db.DatabaseFactory
import com.chipzone.data.repositories.*
import com.chipzone.data.backup.BackupManager
import com.chipzone.security.KeystoreManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    @Provides
    @Singleton
    fun provideContext(@ApplicationContext context: Context): Context {
        return context
    }
    
    @Provides
    @Singleton
    fun provideKeystoreManager(@ApplicationContext context: Context): KeystoreManager {
        return KeystoreManager(context)
    }
    
    @Provides
    @Singleton
    fun provideDatabase(
        databaseFactory: DatabaseFactory
    ): AppDatabase {
        return databaseFactory.createDatabase()
    }
    
    @Provides
    @Singleton
    fun provideDatabaseFactory(
        @ApplicationContext context: Context,
        keystoreManager: KeystoreManager
    ): DatabaseFactory {
        return DatabaseFactory(context, keystoreManager)
    }
    
    @Provides
    fun provideClientDao(database: AppDatabase): ClientDao {
        return database.clientDao()
    }
    
    @Provides
    fun provideRepairDao(database: AppDatabase): RepairDao {
        return database.repairDao()
    }
    
    @Provides
    fun provideProductDao(database: AppDatabase): ProductDao {
        return database.productDao()
    }
    
    @Provides
    fun provideFinanceDao(database: AppDatabase): FinanceDao {
        return database.financeDao()
    }
    
    @Provides
    fun provideExecutorDao(database: AppDatabase): ExecutorDao {
        return database.executorDao()
    }
    
    @Provides
    fun provideCounterpartyDao(database: AppDatabase): CounterpartyDao {
        return database.counterpartyDao()
    }
    
    @Provides
    @Singleton
    fun provideBackupManager(@ApplicationContext context: Context): BackupManager {
        return BackupManager(context)
    }
}

