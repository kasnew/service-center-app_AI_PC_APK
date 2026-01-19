package com.chipzone.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.data.models.Product
import com.chipzone.data.repositories.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductsViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {
    
    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()
    
    init {
        loadProducts()
    }
    
    private fun loadProducts() {
        viewModelScope.launch {
            productRepository.getAllProducts().collect { productList ->
                _products.value = productList
            }
        }
    }
    
    fun searchProducts(query: String) {
        viewModelScope.launch {
            if (query.isBlank()) {
                loadProducts()
            } else {
                productRepository.searchProducts(query).collect { productList ->
                    _products.value = productList
                }
            }
        }
    }
    
    fun getProductByBarcode(barcode: String, onResult: (Product?) -> Unit) {
        viewModelScope.launch {
            val product = productRepository.getProductByBarcode(barcode)
            onResult(product)
        }
    }
    
    fun updateProduct(product: Product) {
        viewModelScope.launch {
            productRepository.updateProduct(product)
        }
    }

    fun createProduct(product: Product) {
        viewModelScope.launch {
            productRepository.insertProduct(product)
        }
    }
    
    fun updateBarcode(productId: Int, barcode: String?) {
        viewModelScope.launch {
            productRepository.updateBarcode(productId, barcode)
        }
    }
    
    suspend fun checkBarcodeUnique(barcode: String, excludeProductId: Int): Boolean {
        val existingProduct = productRepository.getProductByBarcode(barcode)
        return existingProduct == null || existingProduct.id == excludeProductId
    }
}

