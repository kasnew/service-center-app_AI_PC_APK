package com.chipzone.data.repositories

import androidx.room.*
import com.chipzone.data.models.Product
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
    fun getAllProducts(): Flow<List<Product>>
    
    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: Int): Product?
    
    @Query("SELECT * FROM products WHERE inStock = 1 ORDER BY name ASC")
    fun getInStockProducts(): Flow<List<Product>>
    
    @Query("SELECT * FROM products WHERE name LIKE :search OR barcode = :search")
    fun searchProducts(search: String): Flow<List<Product>>
    
    @Query("SELECT * FROM products WHERE barcode = :barcode AND inStock = 1 LIMIT 1")
    suspend fun getProductByBarcode(barcode: String): Product?
    
    @Query("SELECT * FROM products WHERE repairId = :repairId")
    fun getProductsByRepair(repairId: Int): Flow<List<Product>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: Product): Long
    
    @Update
    suspend fun updateProduct(product: Product)
    
    @Delete
    suspend fun deleteProduct(product: Product)
    
    @Query("UPDATE products SET quantity = quantity - 1 WHERE id = :id AND quantity > 0")
    suspend fun decreaseQuantity(id: Int)
    
    @Query("UPDATE products SET barcode = :barcode WHERE id = :id")
    suspend fun updateBarcode(id: Int, barcode: String?)
}

