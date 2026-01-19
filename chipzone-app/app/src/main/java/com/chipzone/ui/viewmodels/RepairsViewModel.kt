package com.chipzone.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.data.models.Client
import com.chipzone.data.models.Repair
import com.chipzone.data.models.Product
import com.chipzone.data.repositories.ClientRepository
import com.chipzone.data.repositories.RepairRepository
import com.chipzone.data.repositories.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class RepairDisplay(
    val repair: Repair,
    val clientName: String?,
    val clientPhone: String?
)

@HiltViewModel
class RepairsViewModel @Inject constructor(
    private val repairRepository: RepairRepository,
    private val clientRepository: ClientRepository,
    private val productRepository: ProductRepository
) : ViewModel() {
    
    private val _repairs = MutableStateFlow<List<RepairDisplay>>(emptyList())
    val repairs: StateFlow<List<RepairDisplay>> = _repairs.asStateFlow()
    
    private val _nextReceiptId = MutableStateFlow<Int?>(null)
    val nextReceiptId: StateFlow<Int?> = _nextReceiptId.asStateFlow()
    
    init {
        loadRepairs()
    }
    
    fun loadNextReceiptId() {
        viewModelScope.launch {
            try {
                val nextId = repairRepository.getNextReceiptId()
                _nextReceiptId.value = nextId
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error loading next receipt ID: ${e.message}", e)
                _nextReceiptId.value = 1
            }
        }
    }
    
    private fun loadRepairs() {
        viewModelScope.launch {
            try {
                android.util.Log.d("RepairsViewModel", "Loading repairs...")
                combine(
                    repairRepository.getAllRepairs(),
                    clientRepository.getAllClients()
                ) { repairs, clients ->
                    android.util.Log.d("RepairsViewModel", "Combining: ${repairs.size} repairs, ${clients.size} clients")
                    repairs.map { repair ->
                        val client = clients.find { it.id == repair.clientId }
                        RepairDisplay(
                            repair = repair,
                            clientName = client?.name,
                            clientPhone = client?.phone
                        )
                    }
                }
                .onStart { 
                    android.util.Log.d("RepairsViewModel", "Flow started")
                }
                .catch { e ->
                    android.util.Log.e("RepairsViewModel", "Flow error: ${e.message}", e)
                    _repairs.value = emptyList()
                }
                .collect { repairList ->
                    android.util.Log.d("RepairsViewModel", "Collected ${repairList.size} repair displays")
                    _repairs.value = repairList
                }
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error loading repairs: ${e.message}", e)
                e.printStackTrace()
                _repairs.value = emptyList()
            }
        }
    }
    
    fun searchRepairs(query: String, status: String? = null, executor: String? = null) {
        viewModelScope.launch {
            try {
                val lowerQuery = if (query.isBlank()) null else query.lowercase()
                val repairsFlow = if (status != null) {
                    repairRepository.getRepairsByStatus(status)
                } else {
                    repairRepository.getAllRepairs()
                }
                
                combine(
                    repairsFlow,
                    clientRepository.getAllClients()
                ) { repairs, clients ->
                    repairs.map { repair ->
                        val client = clients.find { it.id == repair.clientId }
                        RepairDisplay(
                            repair = repair,
                            clientName = client?.name,
                            clientPhone = client?.phone
                        )
                    }.filter { repairDisplay ->
                        // Filter by status if provided
                        if (status != null && repairDisplay.repair.status != status) {
                            return@filter false
                        }
                        
                        // Filter by executor if provided
                        if (executor != null && repairDisplay.repair.executor != executor) {
                            return@filter false
                        }
                        
                        // Filter by search query if provided
                        if (lowerQuery != null) {
                            val lowerName = repairDisplay.clientName?.lowercase() ?: ""
                            val lowerPhone = repairDisplay.clientPhone?.lowercase() ?: ""
                            val lowerDescription = (repairDisplay.repair.description ?: "").lowercase()
                            val lowerDeviceName = (repairDisplay.repair.deviceName ?: "").lowercase()
                            val receiptIdStr = repairDisplay.repair.receiptId?.toString() ?: ""
                            val totalCostStr = repairDisplay.repair.totalCost.toString()
                            
                            // Search in all fields (case-insensitive)
                            lowerName.contains(lowerQuery) ||
                            lowerPhone.contains(lowerQuery) ||
                            lowerDescription.contains(lowerQuery) ||
                            lowerDeviceName.contains(lowerQuery) ||
                            receiptIdStr.contains(query) ||
                            totalCostStr.contains(query)
                        } else {
                            true
                        }
                    }
                }.collect { repairList ->
                    _repairs.value = repairList
                }
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error searching repairs: ${e.message}", e)
                _repairs.value = emptyList()
            }
        }
    }
    
    fun createRepair(
        clientName: String,
        clientPhone: String,
        deviceName: String,
        faultDesc: String,
        note: String,
        status: String,
        executor: String,
        receiptId: Int,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                android.util.Log.d("RepairsViewModel", "Creating repair: clientName=$clientName, deviceName=$deviceName, receiptId=$receiptId")
                
                // Get or create client
                var client: Client? = null
                if (clientPhone.isNotBlank()) {
                    try {
                        client = clientRepository.getClientByPhone(clientPhone)
                        android.util.Log.d("RepairsViewModel", "Found existing client: ${client?.id}")
                    } catch (e: Exception) {
                        android.util.Log.e("RepairsViewModel", "Error getting client by phone: ${e.message}", e)
                    }
                }
                
                if (client == null) {
                    // Create new client
                    android.util.Log.d("RepairsViewModel", "Creating new client")
                    val currentDateTime = LocalDateTime.now()
                    val dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    
                    client = Client(
                        name = clientName,
                        phone = clientPhone.ifBlank { "" },
                        deviceInfo = null,
                        notes = null,
                        createdAt = currentDateTime.format(dateTimeFormatter)
                    )
                    val clientId = clientRepository.insertClient(client)
                    client = client.copy(id = clientId.toInt())
                    android.util.Log.d("RepairsViewModel", "Created client with ID: ${client.id}")
                }
                
                // Create repair
                android.util.Log.d("RepairsViewModel", "Creating repair for client ID: ${client.id}")
                val currentDateTime = LocalDateTime.now()
                val dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                val dateTimeString = currentDateTime.format(dateTimeFormatter)
                
                val repair = Repair(
                    clientId = client.id,
                    description = deviceName,
                    status = status,
                    price = 0.0,
                    createdAt = dateTimeString,
                    updatedAt = dateTimeString,
                    deviceName = deviceName,
                    faultDesc = faultDesc,
                    workDone = null,
                    costLabor = 0.0,
                    totalCost = 0.0,
                    isPaid = false,
                    profit = 0.0,
                    dateStart = dateTimeString,
                    dateEnd = null,
                    note = note.ifBlank { null },
                    shouldCall = false,
                    executor = executor,
                    paymentType = "Готівка",
                    receiptId = receiptId
                )
                
                android.util.Log.d("RepairsViewModel", "Inserting repair into database")
                repairRepository.insertRepair(repair)
                android.util.Log.d("RepairsViewModel", "Repair inserted successfully")
                
                // Reload repairs
                loadRepairs()
                
                // Update next receipt ID
                loadNextReceiptId()
                
                android.util.Log.d("RepairsViewModel", "Repair creation completed successfully")
                onSuccess()
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error creating repair: ${e.message}", e)
                e.printStackTrace()
                onError("Помилка створення ремонту: ${e.message ?: "Невідома помилка"}")
            }
        }
    }
    
    fun deleteRepair(repair: Repair) {
        viewModelScope.launch {
            try {
                repairRepository.deleteRepair(repair)
                loadRepairs()
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error deleting repair: ${e.message}", e)
            }
        }
    }
    
    fun updateRepair(repair: Repair, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                repairRepository.updateRepair(repair)
                loadRepairs()
                onSuccess()
            } catch (e: Exception) {
                android.util.Log.e("RepairsViewModel", "Error updating repair: ${e.message}", e)
                onError("Помилка оновлення ремонту: ${e.message ?: "Невідома помилка"}")
            }
        }
    }
    
    suspend fun getRepairParts(repairId: Int): List<Product> {
        return productRepository.getProductsByRepair(repairId).first()
    }
    
    suspend fun addPartToRepair(
        repairId: Int,
        product: Product,
        priceUah: Double
    ): Result<Unit> {
        return try {
            val repair = repairRepository.getRepairById(repairId)
            if (repair == null) {
                return Result.failure(Exception("Repair not found"))
            }
            
            // Create new product for repair
            val newProduct = product.copy(
                id = 0,
                sellPrice = priceUah,
                repairId = repairId,
                receiptId = repair.receiptId,
                inStock = false,
                dateSold = if (repair.isPaid && repair.dateEnd != null) repair.dateEnd else null
            )
            
            // If product from warehouse, decrease quantity
            if (product.inStock && product.id > 0) {
                productRepository.decreaseQuantity(product.id)
            }
            
            productRepository.insertProduct(newProduct)
            
            // Update repair total cost
            val parts = productRepository.getProductsByRepair(repairId).first()
            val partsTotal = parts.sumOf { it.sellPrice }
            val updatedRepair = repair.copy(totalCost = repair.costLabor + partsTotal)
            repairRepository.updateRepair(updatedRepair)
            
            Result.success(Unit)
        } catch (e: Exception) {
            android.util.Log.e("RepairsViewModel", "Error adding part to repair: ${e.message}", e)
            Result.failure(e)
        }
    }
    
    suspend fun removePartFromRepair(repairId: Int, partId: Int): Boolean {
        return try {
            val product = productRepository.getProductById(partId)
            if (product == null || product.repairId != repairId) {
                return false
            }
            
            productRepository.deleteProduct(product)
            
            // Update repair total cost
            val repair = repairRepository.getRepairById(repairId)
            if (repair != null) {
                val parts = productRepository.getProductsByRepair(repairId).first()
                val partsTotal = parts.sumOf { it.sellPrice }
                val updatedRepair = repair.copy(totalCost = repair.costLabor + partsTotal)
                repairRepository.updateRepair(updatedRepair)
            }
            
            true
        } catch (e: Exception) {
            android.util.Log.e("RepairsViewModel", "Error removing part from repair: ${e.message}", e)
            false
        }
    }
}
