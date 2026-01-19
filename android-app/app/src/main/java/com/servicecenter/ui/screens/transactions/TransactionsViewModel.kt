package com.servicecenter.ui.screens.transactions

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servicecenter.data.local.PreferencesKeys
import com.servicecenter.data.models.Transaction
import com.servicecenter.data.repository.TransactionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TransactionsViewModel @Inject constructor(
    private val transactionRepository: TransactionRepository,
    private val dataStore: DataStore<Preferences>
) : ViewModel() {
    
    private suspend fun getServerUrl(): String? {
        return dataStore.data.map { preferences ->
            preferences[PreferencesKeys.SERVER_URL]
        }.first()
    }
    
    private val _transactions = MutableStateFlow<List<Transaction>>(emptyList())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()
    
    private val _allTransactions = MutableStateFlow<List<Transaction>>(emptyList())
    
    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()
    
    private val _availableCategories = MutableStateFlow<List<String>>(emptyList())
    val availableCategories: StateFlow<List<String>> = _availableCategories.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val _balances = MutableStateFlow<Pair<Double, Double>>(0.0 to 0.0) // cash to card
    val balances: StateFlow<Pair<Double, Double>> = _balances.asStateFlow()
    
    init {
        loadTransactions()
        observeTransactions()
        loadBalances()
    }
    
    private fun observeTransactions() {
        viewModelScope.launch {
            transactionRepository.getAllTransactions().collect { transactions ->
                android.util.Log.d("TransactionsViewModel", "Observed ${transactions.size} transactions")
                _allTransactions.value = transactions
                // Update available categories
                val categories = transactions.map { it.category }.distinct().sorted()
                _availableCategories.value = categories
                applyFilter()
            }
        }
    }
    
    fun setSelectedCategory(category: String?) {
        _selectedCategory.value = category
        applyFilter()
    }
    
    private fun applyFilter() {
        val category = _selectedCategory.value
        val filtered = if (category == null) {
            _allTransactions.value
        } else {
            _allTransactions.value.filter { it.category == category }
        }
        _transactions.value = filtered
    }
    
    fun loadTransactions() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val serverUrl = getServerUrl()
                android.util.Log.d("TransactionsViewModel", "Loading transactions, serverUrl: $serverUrl")
                transactionRepository.syncTransactions(serverUrl)
                android.util.Log.d("TransactionsViewModel", "Sync completed")
            } catch (e: Exception) {
                android.util.Log.e("TransactionsViewModel", "Error loading transactions: ${e.message}", e)
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun loadBalances() {
        viewModelScope.launch {
            try {
                val serverUrl = getServerUrl()
                val balances = transactionRepository.getBalances(serverUrl)
                _balances.value = balances.first to balances.second
            } catch (e: Exception) {
                android.util.Log.e("TransactionsViewModel", "Error loading balances: ${e.message}", e)
            }
        }
    }
}


