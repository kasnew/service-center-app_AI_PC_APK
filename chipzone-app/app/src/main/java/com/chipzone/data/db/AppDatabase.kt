package com.chipzone.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.chipzone.data.models.Client
import com.chipzone.data.models.Repair
import com.chipzone.data.models.Product
import com.chipzone.data.models.Finance
import com.chipzone.data.models.Executor
import com.chipzone.data.models.Counterparty
import com.chipzone.data.repositories.ClientDao
import com.chipzone.data.repositories.RepairDao
import com.chipzone.data.repositories.ProductDao
import com.chipzone.data.repositories.FinanceDao
import com.chipzone.data.repositories.ExecutorDao
import com.chipzone.data.repositories.CounterpartyDao
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import javax.inject.Inject
import javax.inject.Singleton

@Database(
    entities = [Client::class, Repair::class, Product::class, Finance::class, Executor::class, Counterparty::class],
    version = 3,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun clientDao(): ClientDao
    abstract fun repairDao(): RepairDao
    abstract fun productDao(): ProductDao
    abstract fun financeDao(): FinanceDao
    abstract fun executorDao(): ExecutorDao
    abstract fun counterpartyDao(): CounterpartyDao
}

@Singleton
class DatabaseFactory @Inject constructor(
    private val context: Context,
    private val keystoreManager: com.chipzone.security.KeystoreManager
) {
    
    fun createDatabase(): AppDatabase {
        val encryptionKey = keystoreManager.getDatabaseKey()
        val factory = SupportOpenHelperFactory(encryptionKey)
        
        val database = Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "service_center.db"
        )
            .openHelperFactory(factory)
            .fallbackToDestructiveMigration()
            .build()
        
        // Initialize default executors if database is empty
        initializeDefaultExecutors(database)
        
        return database
    }
    
    private fun initializeDefaultExecutors(database: AppDatabase) {
        // Run in background thread
        Thread {
            try {
                val executorDao = database.executorDao()
                
                // Check if executors table is empty
                kotlinx.coroutines.runBlocking {
                    val count = executorDao.getExecutorCount()
                    if (count == 0) {
                        // Insert default executors
                        executorDao.insertExecutor(
                            Executor(
                                name = "Андрій",
                                workPercent = 100.0,
                                productPercent = 100.0
                            )
                        )
                        executorDao.insertExecutor(
                            Executor(
                                name = "Микита",
                                workPercent = 50.0,
                                productPercent = 0.0
                            )
                        )
                        android.util.Log.d("DatabaseFactory", "Default executors initialized")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("DatabaseFactory", "Error initializing executors: ${e.message}", e)
            }
        }.start()
    }
}

