package com.chipzone.data.repositories

import com.chipzone.data.models.Product
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepository @Inject constructor(
    private val productDao: ProductDao
) {
    fun getAllProducts(): Flow<List<Product>> = productDao.getAllProducts()
    
    suspend fun getProductById(id: Int): Product? = productDao.getProductById(id)
    
    fun getInStockProducts(): Flow<List<Product>> = productDao.getInStockProducts()
    
    fun searchProducts(search: String): Flow<List<Product>> = productDao.searchProducts("%$search%")
    
    suspend fun getProductByBarcode(barcode: String): Product? = productDao.getProductByBarcode(barcode)
    
    fun getProductsByRepair(repairId: Int): Flow<List<Product>> = productDao.getProductsByRepair(repairId)
    
    suspend fun insertProduct(product: Product): Long = productDao.insertProduct(product)
    
    suspend fun updateProduct(product: Product) = productDao.updateProduct(product)
    
    suspend fun deleteProduct(product: Product) = productDao.deleteProduct(product)
    
    suspend fun decreaseQuantity(id: Int) = productDao.decreaseQuantity(id)
    
    suspend fun updateBarcode(id: Int, barcode: String?) = productDao.updateBarcode(id, barcode)
}

