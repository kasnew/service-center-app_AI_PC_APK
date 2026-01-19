package com.servicecenter.data.repository

import com.servicecenter.data.api.ApiClient
import com.servicecenter.data.api.ApiService
import com.servicecenter.data.local.dao.TransactionDao
import com.servicecenter.data.models.Transaction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class TransactionRepository(
    private val apiClient: ApiClient?,
    private val transactionDao: TransactionDao
) {
    private fun getApiService(serverUrl: String?): ApiService? {
        return if (serverUrl != null && serverUrl.isNotEmpty()) {
            apiClient?.getApiService(serverUrl)
        } else {
            null
        }
    }
    
    fun getAllTransactions(): Flow<List<Transaction>> = transactionDao.getAllTransactions()
    
    suspend fun syncTransactions(serverUrl: String? = null) {
        val api = getApiService(serverUrl)
        if (api == null) {
            android.util.Log.w("TransactionRepository", "Cannot sync: serverUrl is null or empty")
            return
        }
        
        try {
            android.util.Log.d("TransactionRepository", "Starting transactions sync with serverUrl: $serverUrl")
            val response = api.getTransactions(
                startDate = null,
                endDate = null,
                category = null,
                paymentType = null
            )
            
            if (response.isSuccessful) {
                val body = response.body()
                android.util.Log.d("TransactionRepository", "Response body: $body")
                
                body?.data?.let { transactions ->
                    android.util.Log.d("TransactionRepository", "Received ${transactions.size} transactions from server")
                    transactionDao.insertTransactions(transactions)
                    android.util.Log.d("TransactionRepository", "Inserted ${transactions.size} transactions into local database")
                } ?: android.util.Log.w("TransactionRepository", "Response body is null or data is null")
            } else {
                android.util.Log.e("TransactionRepository", "Sync failed: ${response.code()} - ${response.message()}")
                android.util.Log.e("TransactionRepository", "Error body: ${response.errorBody()?.string()}")
            }
        } catch (e: Exception) {
            android.util.Log.e("TransactionRepository", "Sync error: ${e.javaClass.simpleName} - ${e.message}", e)
            e.printStackTrace()
        }
    }
    
    suspend fun getTransactions(
        serverUrl: String? = null,
        startDate: String? = null,
        endDate: String? = null,
        category: String? = null,
        paymentType: String? = null
    ): List<Transaction> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.getTransactions(
                    startDate = startDate,
                    endDate = endDate,
                    category = category,
                    paymentType = paymentType
                )
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    android.util.Log.e("TransactionRepository", "Failed to get transactions: ${response.code()}")
                    // Fallback to local database
                    getLocalTransactions(startDate, endDate)
                }
            } ?: getLocalTransactions(startDate, endDate)
        } catch (e: Exception) {
            android.util.Log.e("TransactionRepository", "Error getting transactions: ${e.message}", e)
            // Fallback to local database
            getLocalTransactions(startDate, endDate)
        }
    }
    
    private suspend fun getLocalTransactions(startDate: String?, endDate: String?): List<Transaction> {
        return try {
            if (startDate != null && endDate != null) {
                transactionDao.getTransactionsByDateRange(startDate, endDate).first()
            } else {
                transactionDao.getAllTransactions().first()
            }
        } catch (e: Exception) {
            android.util.Log.e("TransactionRepository", "Error getting local transactions: ${e.message}", e)
            emptyList()
        }
    }
    
    suspend fun getBalances(serverUrl: String? = null): Pair<Double, Double> {
        val api = getApiService(serverUrl)
        return try {
            api?.let { service ->
                val response = service.getBalances()
                if (response.isSuccessful) {
                    val balances = response.body()?.data
                    if (balances != null) {
                        balances.cash to balances.card
                    } else {
                        0.0 to 0.0
                    }
                } else {
                    android.util.Log.e("TransactionRepository", "Failed to get balances: ${response.code()}")
                    0.0 to 0.0
                }
            } ?: (0.0 to 0.0)
        } catch (e: Exception) {
            android.util.Log.e("TransactionRepository", "Error getting balances: ${e.message}", e)
            0.0 to 0.0
        }
    }
}

