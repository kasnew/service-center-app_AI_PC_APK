package com.servicecenter.data.api

import com.servicecenter.data.models.Repair
import com.servicecenter.data.models.Transaction
import com.servicecenter.data.models.WarehouseItem
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Health check
    @GET("api/health")
    suspend fun healthCheck(): Response<Map<String, String>>
    
    // Repairs
    @GET("api/repairs")
    suspend fun getRepairs(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
        @Query("shouldCall") shouldCall: Boolean = false,
        @Query("executor") executor: String? = null
    ): Response<RepairsResponse>
    
    @GET("api/repairs/{id}")
    suspend fun getRepair(@Path("id") id: Int): Response<Repair>
    
    @POST("api/repairs")
    suspend fun createRepair(@Body repair: Repair): Response<CreateRepairResponse>
    
    @PUT("api/repairs/{id}")
    suspend fun updateRepair(@Path("id") id: Int, @Body repair: Repair): Response<Map<String, Boolean>>
    
    @DELETE("api/repairs/{id}")
    suspend fun deleteRepair(@Path("id") id: Int): Response<Map<String, Boolean>>
    
    // Warehouse
    @GET("api/warehouse")
    suspend fun getWarehouseItems(
        @Query("inStock") inStock: Boolean = true,
        @Query("stockFilter") stockFilter: String = "inStock",
        @Query("supplier") supplier: String? = null,
        @Query("search") search: String? = null
    ): Response<WarehouseResponse>
    
    // Get parts for a repair
    @GET("api/repairs/{id}/parts")
    suspend fun getRepairParts(@Path("id") repairId: Int): Response<WarehouseResponse>
    
    // Add part to repair
    @POST("api/repairs/{id}/parts")
    suspend fun addPartToRepair(
        @Path("id") repairId: Int,
        @Body request: AddPartToRepairRequest
    ): Response<Map<String, Boolean>>
    
    // Remove part from repair
    @DELETE("api/repairs/{id}/parts/{partId}")
    suspend fun removePartFromRepair(
        @Path("id") repairId: Int,
        @Path("partId") partId: Int
    ): Response<Map<String, Boolean>>
    
    // Transactions
    @GET("api/transactions")
    suspend fun getTransactions(
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("category") category: String? = null,
        @Query("paymentType") paymentType: String? = null
    ): Response<TransactionsResponse>
    
    // Executors
    @GET("api/executors")
    suspend fun getExecutors(): Response<ExecutorsResponse>
    
    // Suppliers
    @GET("api/suppliers")
    suspend fun getSuppliers(): Response<SuppliersResponse>
    
    // Warehouse suppliers
    @GET("api/warehouse/suppliers")
    suspend fun getWarehouseSuppliers(): Response<WarehouseSuppliersResponse>
    
    // Status counts
    @GET("api/status-counts")
    suspend fun getStatusCounts(): Response<Map<String, Int>>
    
    // Balances
    @GET("api/balances")
    suspend fun getBalances(): Response<BalancesResponse>
    
    // Next receipt ID
    @GET("api/next-receipt-id")
    suspend fun getNextReceiptId(): Response<NextReceiptIdResponse>
    
    // Barcode operations
    @GET("api/warehouse/barcode/{barcode}")
    suspend fun getWarehouseItemByBarcode(@Path("barcode") barcode: String): Response<WarehouseItemResponse>
    
    @PUT("api/warehouse/{id}/barcode")
    suspend fun updateWarehouseItemBarcode(
        @Path("id") id: Int,
        @Body request: UpdateBarcodeRequest
    ): Response<Map<String, Boolean>>
    
    @DELETE("api/warehouse/{id}/barcode")
    suspend fun deleteWarehouseItemBarcode(@Path("id") id: Int): Response<Map<String, Boolean>>

    // Locks
    @GET("api/locks/{id}")
    suspend fun getLock(@Path("id") id: Int): Response<LockResponse>

    @POST("api/locks/{id}")
    suspend fun setLock(@Path("id") id: Int, @Body body: LockRequest): Response<Map<String, Boolean>>

    @DELETE("api/locks/{id}")
    suspend fun releaseLock(@Path("id") id: Int): Response<Map<String, Boolean>>
}

data class LockResponse(
    val locked: Boolean,
    val device: String? = null,
    val time: String? = null
)

data class LockRequest(
    val device: String
)

data class RepairsResponse(
    val data: List<Repair>,
    val pagination: Pagination
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

data class CreateRepairResponse(
    val id: Int,
    val success: Boolean
)

data class WarehouseResponse(
    val data: List<WarehouseItem>
)

data class TransactionsResponse(
    val data: List<Transaction>
)

data class ExecutorsResponse(
    val data: List<Executor>
)

data class Executor(
    val id: Int,
    val name: String,
    val salaryPercent: Double
)

data class SuppliersResponse(
    val data: List<Supplier>
)

data class Supplier(
    val id: Int,
    val name: String
)

data class BalancesResponse(
    val data: Balances
)

data class Balances(
    val cash: Double,
    val card: Double
)

data class NextReceiptIdResponse(
    val data: NextReceiptId
)

data class NextReceiptId(
    val nextReceiptId: Int
)

data class WarehouseSuppliersResponse(
    val data: List<String>
)

data class AddPartToRepairRequest(
    val partId: Int? = null,
    val receiptId: Int,
    val priceUah: Double,
    val costUah: Double,
    val supplier: String,
    val name: String,
    val isPaid: Boolean = false,
    val dateEnd: String? = null
)

data class WarehouseItemResponse(
    val data: WarehouseItem
)

data class UpdateBarcodeRequest(
    val barcode: String?
)


