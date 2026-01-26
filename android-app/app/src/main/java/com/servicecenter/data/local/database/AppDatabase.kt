package com.servicecenter.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.servicecenter.data.models.Repair
import com.servicecenter.data.models.Transaction
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.data.local.dao.RepairDao
import com.servicecenter.data.local.dao.TransactionDao
import com.servicecenter.data.local.dao.WarehouseItemDao

@Database(
    entities = [Repair::class, WarehouseItem::class, Transaction::class],
    version = 3,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun repairDao(): RepairDao
    abstract fun warehouseItemDao(): WarehouseItemDao
    abstract fun transactionDao(): TransactionDao

    companion object {
        // Migration from version 2 to 3: Add minQuantity column to warehouse_items
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE warehouse_items ADD COLUMN minQuantity INTEGER DEFAULT NULL")
            }
        }
    }
}
