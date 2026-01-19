package com.chipzone.api.server

import com.chipzone.data.models.Client
import com.chipzone.data.models.Repair
import com.chipzone.data.models.Product
import com.chipzone.data.models.Finance
import com.chipzone.data.models.Executor
import com.chipzone.data.models.Counterparty
import com.chipzone.data.repositories.*
import com.chipzone.data.backup.BackupManager
import com.chipzone.data.backup.BackupInfo
import io.ktor.http.*
import io.ktor.http.ContentType
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.content.*
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class AddPartToRepairRequest(
    val partId: Int? = null,
    val supplier: String,
    val name: String,
    val costUah: Double,
    val priceUah: Double
)

@Singleton
class ApiRoutes @Inject constructor(
    private val clientRepository: ClientRepository,
    private val repairRepository: RepairRepository,
    private val productRepository: ProductRepository,
    private val financeRepository: FinanceRepository,
    private val executorRepository: ExecutorRepository,
    private val counterpartyRepository: CounterpartyRepository,
    private val backupManager: BackupManager
) {
    
    fun setupRoutes(routing: Routing) {
        routing.route("/api") {
            // Clients routes
            route("clients") {
                get {
                    val clients = clientRepository.getAllClients().first()
                    call.respond(clients)
                }
                
                get("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@get
                    }
                    val client = clientRepository.getClientById(id)
                    if (client == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Client not found"))
                    } else {
                        call.respond(client)
                    }
                }
                
                post {
                    val client = call.receive<Client>()
                    val id = clientRepository.insertClient(client)
                    call.respond(HttpStatusCode.Created, mapOf("id" to id))
                }
                
                put("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@put
                    }
                    val client = call.receive<Client>().copy(id = id)
                    clientRepository.updateClient(client)
                    call.respond(HttpStatusCode.OK)
                }
                
                delete("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@delete
                    }
                    val client = clientRepository.getClientById(id)
                    if (client == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Client not found"))
                    } else {
                        clientRepository.deleteClient(client)
                        call.respond(HttpStatusCode.OK)
                    }
                }
            }
            
            // Repairs routes
            route("repairs") {
                get {
                    val repairs = repairRepository.getAllRepairs().first()
                    call.respond(repairs)
                }
                
                get("next-receipt-id") {
                    val nextId = repairRepository.getNextReceiptId()
                    call.respond(mapOf("nextReceiptId" to nextId))
                }
                
                get("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@get
                    }
                    val repair = repairRepository.getRepairById(id)
                    if (repair == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Repair not found"))
                    } else {
                        call.respond(repair)
                    }
                }
                
                post {
                    val repair = call.receive<Repair>()
                    val id = repairRepository.insertRepair(repair)
                    call.respond(HttpStatusCode.Created, mapOf("id" to id))
                }
                
                put("{id}") {
                    try {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@put
                    }
                    val repair = call.receive<Repair>().copy(id = id)
                    repairRepository.updateRepair(repair)
                    call.respond(HttpStatusCode.OK)
                    } catch (e: Exception) {
                        android.util.Log.e("ApiRoutes", "Error updating repair", e)
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to (e.message ?: "Unknown error")))
                    }
                }
                
                delete("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@delete
                    }
                    val repair = repairRepository.getRepairById(id)
                    if (repair == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Repair not found"))
                    } else {
                        repairRepository.deleteRepair(repair)
                        call.respond(HttpStatusCode.OK)
                    }
                }
                
                // Repair parts routes
                get("{id}/parts") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@get
                    }
                    val parts = productRepository.getProductsByRepair(id).first()
                    call.respond(parts)
                }
                
                post("{id}/parts") {
                    try {
                        val id = call.parameters["id"]?.toIntOrNull()
                        if (id == null) {
                            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                            return@post
                        }
                        
                        val body = call.receive<AddPartToRepairRequest>()
                        
                        // Log received data for debugging
                        android.util.Log.d("ApiRoutes", "Received part data: $body")
                        
                        val repair = repairRepository.getRepairById(id)
                        if (repair == null) {
                            call.respond(HttpStatusCode.NotFound, mapOf("error" to "Repair not found"))
                            return@post
                        }
                    
                    // Get product from warehouse if partId is provided
                    val partId = body.partId
                    val product: Product? = if (partId != null && partId > 0) {
                        productRepository.getProductById(partId)
                    } else {
                        null
                    }
                    
                    // Get product name - use provided name or get from warehouse product
                    val productName = if (body.name.isNotBlank()) {
                        body.name
                    } else if (product != null) {
                        product.name
                    } else {
                        ""
                    }
                    
                    // Validate required fields
                    if (productName.isBlank()) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Product name is required"))
                        return@post
                    }
                    
                    if (body.supplier.isBlank()) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Supplier is required"))
                        return@post
                    }
                    
                    if (body.priceUah <= 0) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Price must be greater than 0"))
                        return@post
                    }
                    
                    // Create new product for repair
                    val newProduct = Product(
                        id = 0,
                        name = productName,
                        quantity = 0,
                        buyPrice = 0.0,
                        sellPrice = body.priceUah,
                        supplier = body.supplier,
                        dateArrival = null,
                        invoice = null,
                        productCode = product?.productCode,
                        barcode = product?.barcode,
                        exchangeRate = product?.exchangeRate,
                        priceUsd = product?.priceUsd,
                        costUah = body.costUah,
                        repairId = id,
                        receiptId = repair.receiptId,
                        inStock = false,
                        dateSold = if (repair.isPaid && repair.dateEnd != null) repair.dateEnd else null
                    )
                    
                    // If product from warehouse, decrease quantity
                    if (product != null && product.inStock) {
                        productRepository.decreaseQuantity(product.id)
                    }
                    
                    val productId = productRepository.insertProduct(newProduct)
                    call.respond(HttpStatusCode.Created, mapOf("id" to productId))
                    } catch (e: Exception) {
                        android.util.Log.e("ApiRoutes", "Error adding part to repair", e)
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to (e.message ?: "Unknown error")))
                    }
                }
                
                delete("{id}/parts/{partId}") {
                    val repairId = call.parameters["id"]?.toIntOrNull()
                    val partId = call.parameters["partId"]?.toIntOrNull()
                    if (repairId == null || partId == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@delete
                    }
                    val product = productRepository.getProductById(partId)
                    if (product == null || product.repairId != repairId) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Part not found"))
                    } else {
                        productRepository.deleteProduct(product)
                        call.respond(HttpStatusCode.OK)
                    }
                }
                
                // Update repair payment status for all parts
                post("{id}/parts/payment") {
                    try {
                        val repairId = call.parameters["id"]?.toIntOrNull()
                        if (repairId == null) {
                            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                            return@post
                        }
                        val body = call.receive<Map<String, Any>>()
                        val isPaid = body["isPaid"] as? Boolean ?: false
                        val dateEnd = body["dateEnd"] as? String
                        
                        // Get all parts for this repair
                        val parts = productRepository.getProductsByRepair(repairId).first()
                        
                        // Update dateSold for all parts
                        for (part in parts) {
                            val updatedPart = part.copy(
                                dateSold = if (isPaid && dateEnd != null) dateEnd else null
                            )
                            productRepository.updateProduct(updatedPart)
                        }
                        
                        call.respond(HttpStatusCode.OK, mapOf("success" to true))
                    } catch (e: Exception) {
                        android.util.Log.e("ApiRoutes", "Error updating repair payment", e)
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to (e.message ?: "Unknown error")))
                    }
                }
                
                put("{id}/parts/{partId}") {
                    val repairId = call.parameters["id"]?.toIntOrNull()
                    val partId = call.parameters["partId"]?.toIntOrNull()
                    if (repairId == null || partId == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@put
                    }
                    val body = call.receive<Map<String, Any>>()
                    val product = productRepository.getProductById(partId)
                    if (product == null || product.repairId != repairId) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Part not found"))
                    } else {
                        val updatedProduct = product.copy(
                            sellPrice = (body["priceUah"] as? Number)?.toDouble() ?: product.sellPrice,
                            costUah = (body["costUah"] as? Number)?.toDouble() ?: product.costUah
                        )
                        productRepository.updateProduct(updatedProduct)
                        call.respond(HttpStatusCode.OK)
                    }
                }
            }
            
            // Products routes
            route("products") {
                get {
                    val inStock = call.request.queryParameters["inStock"]?.toBoolean()
                    val products = if (inStock == true) {
                        productRepository.getInStockProducts().first()
                    } else {
                        productRepository.getAllProducts().first()
                    }
                    call.respond(products)
                }
                
                get("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@get
                    }
                    val product = productRepository.getProductById(id)
                    if (product == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Product not found"))
                    } else {
                        call.respond(product)
                    }
                }
                
                post {
                    val product = call.receive<Product>()
                    val id = productRepository.insertProduct(product)
                    call.respond(HttpStatusCode.Created, mapOf("id" to id))
                }
                
                put("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@put
                    }
                    val product = call.receive<Product>().copy(id = id)
                    productRepository.updateProduct(product)
                    call.respond(HttpStatusCode.OK)
                }
                
                delete("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@delete
                    }
                    val product = productRepository.getProductById(id)
                    if (product == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Product not found"))
                    } else {
                        productRepository.deleteProduct(product)
                        call.respond(HttpStatusCode.OK)
                    }
                }
            }
            
            // Finance routes
            route("finance") {
                get {
                    val finance = financeRepository.getAllFinance().first()
                    call.respond(finance)
                }
                
                post {
                    val finance = call.receive<Finance>()
                    val id = financeRepository.insertFinance(finance)
                    call.respond(HttpStatusCode.Created, mapOf("id" to id))
                }
                
                delete("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@delete
                    }
                    val finance = financeRepository.getFinanceById(id)
                    if (finance == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Finance record not found"))
                    } else {
                        financeRepository.deleteFinance(finance)
                        call.respond(HttpStatusCode.OK)
                    }
                }
            }
            
            // Executors routes
            route("executors") {
                get {
                    val executors = executorRepository.getAllExecutors().first()
                    call.respond(executors)
                }
                
                get("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@get
                    }
                    val executor = executorRepository.getExecutorById(id)
                    if (executor == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Executor not found"))
                    } else {
                        call.respond(executor)
                    }
                }
                
                post {
                    val executor = call.receive<Executor>()
                    val id = executorRepository.insertExecutor(executor)
                    call.respond(HttpStatusCode.Created, mapOf("id" to id))
                }
                
                put("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@put
                    }
                    val executor = call.receive<Executor>().copy(id = id)
                    executorRepository.updateExecutor(executor)
                    call.respond(HttpStatusCode.OK)
                }
                
                delete("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@delete
                    }
                    val executor = executorRepository.getExecutorById(id)
                    if (executor == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Executor not found"))
                    } else {
                        executorRepository.deleteExecutor(executor)
                        call.respond(HttpStatusCode.OK)
                    }
                }
            }
            
            // Counterparties routes
            route("counterparties") {
                get {
                    val counterparties = counterpartyRepository.getAllCounterparties().first()
                    call.respond(counterparties)
                }
                
                get("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@get
                    }
                    val counterparty = counterpartyRepository.getCounterpartyById(id)
                    if (counterparty == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Counterparty not found"))
                    } else {
                        call.respond(counterparty)
                    }
                }
                
                post {
                    val counterparty = call.receive<Counterparty>()
                    val id = counterpartyRepository.insertCounterparty(counterparty)
                    call.respond(HttpStatusCode.Created, mapOf("id" to id))
                }
                
                put("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@put
                    }
                    val counterparty = call.receive<Counterparty>().copy(id = id)
                    counterpartyRepository.updateCounterparty(counterparty)
                    call.respond(HttpStatusCode.OK)
                }
                
                delete("{id}") {
                    val id = call.parameters["id"]?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid ID"))
                        return@delete
                    }
                    val counterparty = counterpartyRepository.getCounterpartyById(id)
                    if (counterparty == null) {
                        call.respond(HttpStatusCode.NotFound, mapOf("error" to "Counterparty not found"))
                    } else {
                        counterpartyRepository.deleteCounterparty(counterparty)
                        call.respond(HttpStatusCode.OK)
                    }
                }
            }
            
            // Backup routes
            route("backups") {
                get {
                    try {
                        val backups = backupManager.listBackups()
                        call.respond(backups)
                    } catch (e: Exception) {
                        android.util.Log.e("ApiRoutes", "Error listing backups", e)
                        call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Unknown error")))
                    }
                }
                
                post {
                    val body = call.receive<Map<String, String>>()
                    val customName = body["customName"]
                    val backupInfo = backupManager.createBackup(customName)
                    call.respond(backupInfo)
                }
                
                post("restore") {
                    val body = call.receive<Map<String, String>>()
                    val fileName = body["fileName"]
                    if (fileName == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "fileName is required"))
                        return@post
                    }
                    backupManager.restoreBackup(fileName)
                    call.respond(HttpStatusCode.OK, mapOf("success" to true))
                }
                
                delete("{fileName}") {
                    val fileName = call.parameters["fileName"]
                    if (fileName == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "fileName is required"))
                        return@delete
                    }
                    backupManager.deleteBackup(fileName)
                    call.respond(HttpStatusCode.OK, mapOf("success" to true))
                }
                
                get("download/{fileName}") {
                    val fileName = call.parameters["fileName"]
                    if (fileName == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "fileName is required"))
                        return@get
                    }
                    val backupFile = backupManager.getBackupFile(fileName)
                    call.response.header("Content-Disposition", "attachment; filename=\"$fileName\"")
                    val content = backupFile.readBytes()
                    call.respondBytes(content, ContentType.Application.Zip)
                }
                
                put("{fileName}") {
                    val fileName = call.parameters["fileName"]
                    if (fileName == null) {
                        call.respond(HttpStatusCode.BadRequest, mapOf("error" to "fileName is required"))
                        return@put
                    }
                    try {
                        val body = call.receive<Map<String, String>>()
                        val newFileName = body["newFileName"]
                        if (newFileName == null) {
                            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "newFileName is required"))
                            return@put
                        }
                        val backupInfo = backupManager.renameBackup(fileName, newFileName)
                        call.respond(HttpStatusCode.OK, backupInfo)
                    } catch (e: Exception) {
                        android.util.Log.e("ApiRoutes", "Error renaming backup", e)
                        call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Unknown error")))
                    }
                }
            }
        }
    }
}

