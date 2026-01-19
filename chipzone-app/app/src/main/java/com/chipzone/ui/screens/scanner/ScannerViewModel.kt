package com.chipzone.ui.screens.scanner

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.data.models.Product
import com.chipzone.data.repositories.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import javax.inject.Inject

@HiltViewModel
class ScannerViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {
    
    private val _scannedItem = MutableStateFlow<Product?>(null)
    val scannedItem: StateFlow<Product?> = _scannedItem.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val _scannedBarcode = MutableStateFlow<String?>(null)
    val scannedBarcode: StateFlow<String?> = _scannedBarcode.asStateFlow()
    
    private val _showSellDialog = MutableStateFlow(false)
    val showSellDialog: StateFlow<Boolean> = _showSellDialog.asStateFlow()
    
    private val _sellItem = MutableStateFlow<Product?>(null)
    val sellItem: StateFlow<Product?> = _sellItem.asStateFlow()
    
    fun scanBarcode(barcode: String) {
        Log.d("ScannerViewModel", "scanBarcode called with: $barcode")
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            _scannedBarcode.value = barcode
            
            try {
                Log.d("ScannerViewModel", "Searching for product with barcode: $barcode")
                val product = productRepository.getProductByBarcode(barcode)
                
                if (product != null) {
                    Log.d("ScannerViewModel", "Product found: ${product.name}")
                    _scannedItem.value = product
                } else {
                    Log.d("ScannerViewModel", "Product not found")
                    _scannedItem.value = null
                }
            } catch (e: Exception) {
                Log.e("ScannerViewModel", "Error scanning barcode: ${e.message}", e)
                _error.value = e.message ?: "Помилка сканування"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun assignBarcodeToItem(itemId: Int, barcode: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                // Validate barcode
                if (barcode.isBlank()) {
                    _error.value = "Штрих-код не може бути порожнім"
                    _isLoading.value = false
                    return@launch
                }
                
                // Check if item exists and is in stock
                val item = productRepository.getProductById(itemId)
                if (item == null) {
                    _error.value = "Товар не знайдено"
                    _isLoading.value = false
                    return@launch
                }
                
                if (!item.inStock) {
                    _error.value = "Штрих-код можна призначати тільки товарам в наявності"
                    _isLoading.value = false
                    return@launch
                }
                
                Log.d("ScannerViewModel", "Assigning barcode '$barcode' to item $itemId")
                productRepository.updateBarcode(itemId, barcode.trim())
                
                // Reload the item
                val updatedItem = productRepository.getProductByBarcode(barcode.trim())
                if (updatedItem != null) {
                    _scannedItem.value = updatedItem
                    Log.d("ScannerViewModel", "Item reloaded: ${updatedItem.name}")
                } else {
                    // If not found by barcode, get by ID
                    val itemById = productRepository.getProductById(itemId)
                    if (itemById != null) {
                        _scannedItem.value = itemById
                        Log.d("ScannerViewModel", "Item found by ID: ${itemById.name}")
                    } else {
                        Log.w("ScannerViewModel", "Item not found after barcode assignment")
                        _error.value = "Штрих-код призначено, але не вдалося завантажити товар"
                    }
                }
            } catch (e: Exception) {
                Log.e("ScannerViewModel", "Error assigning barcode: ${e.message}", e)
                _error.value = e.message ?: "Помилка призначення штрих-коду: ${e.javaClass.simpleName}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun clearScannedData() {
        _scannedItem.value = null
        _scannedBarcode.value = null
        _error.value = null
    }
    
    fun startSellingItem(item: Product) {
        _sellItem.value = item
        _showSellDialog.value = true
    }
    
    fun cancelSelling() {
        _showSellDialog.value = false
        _sellItem.value = null
    }
    
    fun sellItem(price: Double, paymentType: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                val item = _sellItem.value ?: return@launch
                
                // Update product: mark as sold, set price, date, etc.
                val updatedProduct = item.copy(
                    inStock = false,
                    sellPrice = price,
                    dateSold = java.time.LocalDate.now().toString()
                )
                
                productRepository.updateProduct(updatedProduct)
                
                // Reload the item
                val reloadedItem = productRepository.getProductByBarcode(
                    _scannedBarcode.value ?: ""
                )
                _scannedItem.value = reloadedItem
                _showSellDialog.value = false
                _sellItem.value = null
            } catch (e: Exception) {
                Log.e("ScannerViewModel", "Error selling item: ${e.message}", e)
                _error.value = e.message ?: "Помилка реалізації товару"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun processImageFromGallery(uri: Uri, context: Context) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream?.close()
                
                if (bitmap == null) {
                    _error.value = "Не вдалося завантажити зображення"
                    _isLoading.value = false
                    return@launch
                }
                
                // Process image with OCR
                val image = InputImage.fromBitmap(bitmap, 0)
                val textRecognizer = TextRecognition.getClient(
                    TextRecognizerOptions.DEFAULT_OPTIONS
                )
                
                textRecognizer.process(image)
                    .addOnSuccessListener { visionText ->
                        // Extract potential barcode from OCR text
                        val text = visionText.text
                        Log.d("ScannerViewModel", "OCR recognized text: $text")
                        
                        // Try to find barcode-like patterns (alphanumeric codes)
                        val barcodePattern = Regex("""[A-Z0-9]{8,}""")
                        val matches = barcodePattern.findAll(text)
                        
                        val bestMatch = matches.map { it.value }.firstOrNull()
                        
                        if (bestMatch != null) {
                            Log.d("ScannerViewModel", "Found potential barcode: $bestMatch")
                            scanBarcode(bestMatch)
                        } else {
                            // Try to extract any alphanumeric sequence
                            val cleanedText = text.replace(Regex("""[^A-Z0-9]"""), "")
                            if (cleanedText.length >= 8) {
                                Log.d("ScannerViewModel", "Using cleaned text as barcode: $cleanedText")
                                scanBarcode(cleanedText)
                            } else {
                                _error.value = "Штрих-код не знайдено на зображенні"
                                _isLoading.value = false
                            }
                        }
                    }
                    .addOnFailureListener { e ->
                        Log.e("ScannerViewModel", "OCR failed: ${e.message}", e)
                        _error.value = "Помилка розпізнавання тексту: ${e.message}"
                        _isLoading.value = false
                    }
            } catch (e: Exception) {
                Log.e("ScannerViewModel", "Error processing image: ${e.message}", e)
                _error.value = "Помилка обробки зображення: ${e.message}"
                _isLoading.value = false
            }
        }
    }
}

