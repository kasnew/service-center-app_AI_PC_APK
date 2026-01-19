package com.servicecenter.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.servicecenter.data.models.Repair
import com.servicecenter.data.models.Transaction
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.data.local.dao.RepairDao
import com.servicecenter.data.local.dao.TransactionDao
import com.servicecenter.data.local.dao.WarehouseItemDao

@Database(
    entities = [Repair::class, WarehouseItem::class, Transaction::class],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun repairDao(): RepairDao
    abstract fun warehouseItemDao(): WarehouseItemDao
    abstract fun transactionDao(): TransactionDao
}


