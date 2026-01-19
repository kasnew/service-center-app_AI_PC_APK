package com.servicecenter.data.local.dao

import androidx.room.*
import com.servicecenter.data.models.WarehouseItem
import kotlinx.coroutines.flow.Flow

@Dao
interface WarehouseItemDao {
    @Query("SELECT * FROM warehouse_items WHERE inStock = 1 ORDER BY dateArrival DESC")
    fun getInStockItems(): Flow<List<WarehouseItem>>
    
    @Query("SELECT * FROM warehouse_items WHERE id = :id")
    suspend fun getItemById(id: Int): WarehouseItem?
    
    @Query("SELECT * FROM warehouse_items WHERE name LIKE '%' || :query || '%' OR productCode LIKE '%' || :query || '%'")
    fun searchItems(query: String): Flow<List<WarehouseItem>>
    
    @Query("SELECT * FROM warehouse_items WHERE barcode = :barcode AND inStock = 1 LIMIT 1")
    suspend fun getItemByBarcode(barcode: String): WarehouseItem?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: WarehouseItem): Long
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<WarehouseItem>)
    
    @Update
    suspend fun updateItem(item: WarehouseItem)
    
    @Query("UPDATE warehouse_items SET barcode = :barcode WHERE id = :itemId")
    suspend fun updateBarcode(itemId: Int, barcode: String?)
    
    @Query("DELETE FROM warehouse_items")
    suspend fun deleteAll()
}


