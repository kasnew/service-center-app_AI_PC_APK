package com.servicecenter.ui.screens.scanner

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servicecenter.data.local.PreferencesKeys
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.data.repository.WarehouseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ScannerViewModel @Inject constructor(
    private val warehouseRepository: WarehouseRepository,
    private val dataStore: DataStore<Preferences>
) : ViewModel() {
    
    private suspend fun getServerUrl(): String? {
        return dataStore.data.map { preferences ->
            preferences[PreferencesKeys.SERVER_URL]
        }.first()
    }
    
    private val _scannedItem = MutableStateFlow<WarehouseItem?>(null)
    val scannedItem: StateFlow<WarehouseItem?> = _scannedItem.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val _showAssignDialog = MutableStateFlow(false)
    val showAssignDialog: StateFlow<Boolean> = _showAssignDialog.asStateFlow()
    
    private val _scannedBarcode = MutableStateFlow<String?>(null)
    val scannedBarcode: StateFlow<String?> = _scannedBarcode.asStateFlow()
    
    private val _showSellDialog = MutableStateFlow(false)
    val showSellDialog: StateFlow<Boolean> = _showSellDialog.asStateFlow()
    
    private val _sellItem = MutableStateFlow<WarehouseItem?>(null)
    val sellItem: StateFlow<WarehouseItem?> = _sellItem.asStateFlow()
    
    fun scanBarcode(barcode: String) {
        android.util.Log.d("ScannerViewModel", "scanBarcode called with: $barcode")
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            _scannedBarcode.value = barcode
            
            try {
                android.util.Log.d("ScannerViewModel", "Getting server URL...")
                val serverUrl = getServerUrl()
                android.util.Log.d("ScannerViewModel", "Server URL: $serverUrl")
                
                android.util.Log.d("ScannerViewModel", "Searching for item with barcode: $barcode")
                val item = warehouseRepository.getWarehouseItemByBarcode(barcode, serverUrl)
                
                if (item != null) {
                    android.util.Log.d("ScannerViewModel", "Item found: ${item.name}")
                    _scannedItem.value = item
                    _showAssignDialog.value = false
                } else {
                    android.util.Log.d("ScannerViewModel", "Item not found, showing assign dialog")
                    _scannedItem.value = null
                    _showAssignDialog.value = true
                }
            } catch (e: Exception) {
                android.util.Log.e("ScannerViewModel", "Error scanning barcode: ${e.message}", e)
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
                val item = warehouseRepository.getItemById(itemId)
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
                
                val serverUrl = getServerUrl()
                android.util.Log.d("ScannerViewModel", "Assigning barcode '$barcode' to item $itemId")
                val success = warehouseRepository.updateWarehouseItemBarcode(itemId, barcode.trim(), serverUrl)
                
                if (success) {
                    android.util.Log.d("ScannerViewModel", "Barcode assigned successfully (locally), reloading item...")
                    // Reload the item - first try by barcode, if not found try by ID
                    var item = warehouseRepository.getWarehouseItemByBarcode(barcode.trim(), serverUrl)
                    if (item == null) {
                        // If not found by barcode, get by ID (item might not be synced yet)
                        item = warehouseRepository.getItemById(itemId)
                        if (item != null) {
                            android.util.Log.d("ScannerViewModel", "Item found by ID: ${item.name}")
                        }
                    } else {
                        android.util.Log.d("ScannerViewModel", "Item found by barcode: ${item.name}")
                    }
                    
                    if (item != null) {
                        _scannedItem.value = item
                        _showAssignDialog.value = false
                        android.util.Log.d("ScannerViewModel", "Item reloaded: ${item.name}")
                        
                        // Show info message if server sync failed
                        if (serverUrl == null || serverUrl.isEmpty()) {
                            android.util.Log.d("ScannerViewModel", "Barcode saved locally, will sync when server is available")
                        }
                    } else {
                        android.util.Log.w("ScannerViewModel", "Item not found after barcode assignment")
                        _error.value = "Штрих-код призначено локально, але не вдалося завантажити товар"
                    }
                } else {
                    android.util.Log.e("ScannerViewModel", "Failed to assign barcode")
                    _error.value = "Не вдалося призначити штрих-код"
                }
            } catch (e: Exception) {
                android.util.Log.e("ScannerViewModel", "Error assigning barcode: ${e.message}", e)
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
        _showAssignDialog.value = false
    }
    
    fun dismissAssignDialog() {
        _showAssignDialog.value = false
    }
    
    fun startSellingItem(item: WarehouseItem) {
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
                val serverUrl = getServerUrl()
                val success = warehouseRepository.sellItem(_sellItem.value!!, price, paymentType, serverUrl)
                
                if (success) {
                    // Reload the item to show updated status
                    val item = warehouseRepository.getWarehouseItemByBarcode(
                        _scannedBarcode.value ?: "",
                        serverUrl
                    )
                    _scannedItem.value = item
                    _showSellDialog.value = false
                    _sellItem.value = null
                } else {
                    _error.value = "Не вдалося реалізувати товар"
                }
            } catch (e: Exception) {
                android.util.Log.e("ScannerViewModel", "Error selling item: ${e.message}", e)
                _error.value = e.message ?: "Помилка реалізації товару"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun processImageFromGallery(uri: android.net.Uri, context: android.content.Context) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
                inputStream?.close()
                
                if (bitmap == null) {
                    _error.value = "Не вдалося завантажити зображення"
                    _isLoading.value = false
                    return@launch
                }
                
                // Process image with OCR
                val image = com.google.mlkit.vision.common.InputImage.fromBitmap(bitmap, 0)
                val textRecognizer = com.google.mlkit.vision.text.TextRecognition.getClient(
                    com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS
                )
                
                textRecognizer.process(image)
                    .addOnSuccessListener { visionText ->
                        // Extract potential barcode from OCR text
                        val text = visionText.text
                        android.util.Log.d("ScannerViewModel", "OCR recognized text: $text")
                        
                        // Try to find barcode-like patterns (alphanumeric codes)
                        val barcodePattern = Regex("""[A-Z0-9]{8,}""")
                        val matches = barcodePattern.findAll(text)
                        
                        val bestMatch = matches.map { it.value }.firstOrNull()
                        
                        if (bestMatch != null) {
                            android.util.Log.d("ScannerViewModel", "Found potential barcode: $bestMatch")
                            scanBarcode(bestMatch)
                        } else {
                            // Try to extract any alphanumeric sequence
                            val cleanedText = text.replace(Regex("""[^A-Z0-9]"""), "")
                            if (cleanedText.length >= 8) {
                                android.util.Log.d("ScannerViewModel", "Using cleaned text as barcode: $cleanedText")
                                scanBarcode(cleanedText)
                            } else {
                                _error.value = "Штрих-код не знайдено на зображенні"
                                _isLoading.value = false
                            }
                        }
                    }
                    .addOnFailureListener { e ->
                        android.util.Log.e("ScannerViewModel", "OCR failed: ${e.message}", e)
                        _error.value = "Помилка розпізнавання тексту: ${e.message}"
                        _isLoading.value = false
                    }
            } catch (e: Exception) {
                android.util.Log.e("ScannerViewModel", "Error processing image: ${e.message}", e)
                _error.value = "Помилка обробки зображення: ${e.message}"
                _isLoading.value = false
            }
        }
    }
}

