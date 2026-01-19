package com.chipzone.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.data.models.Counterparty
import com.chipzone.data.repositories.CounterpartyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CounterpartiesViewModel @Inject constructor(
    private val counterpartyRepository: CounterpartyRepository
) : ViewModel() {
    
    private val _counterparties = MutableStateFlow<List<Counterparty>>(emptyList())
    val counterparties: StateFlow<List<Counterparty>> = _counterparties.asStateFlow()
    
    init {
        loadCounterparties()
    }
    
    private fun loadCounterparties() {
        viewModelScope.launch {
            counterpartyRepository.getAllCounterparties().collect { counterparties ->
                _counterparties.value = counterparties
            }
        }
    }
    
    fun addCounterparty(name: String, smartImport: Boolean) {
        viewModelScope.launch {
            try {
                val counterparty = Counterparty(
                    name = name.trim(),
                    smartImport = smartImport
                )
                counterpartyRepository.insertCounterparty(counterparty)
            } catch (e: Exception) {
                android.util.Log.e("CounterpartiesViewModel", "Error adding counterparty: ${e.message}", e)
            }
        }
    }
    
    fun updateCounterparty(counterparty: Counterparty) {
        viewModelScope.launch {
            try {
                counterpartyRepository.updateCounterparty(counterparty)
            } catch (e: Exception) {
                android.util.Log.e("CounterpartiesViewModel", "Error updating counterparty: ${e.message}", e)
            }
        }
    }
    
    fun deleteCounterparty(counterparty: Counterparty) {
        viewModelScope.launch {
            try {
                counterpartyRepository.deleteCounterparty(counterparty)
            } catch (e: Exception) {
                android.util.Log.e("CounterpartiesViewModel", "Error deleting counterparty: ${e.message}", e)
            }
        }
    }
}

