package com.chipzone.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.data.models.Finance
import com.chipzone.data.repositories.FinanceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class FinanceViewModel @Inject constructor(
    private val financeRepository: FinanceRepository
) : ViewModel() {
    
    private val _finance = MutableStateFlow<List<Finance>>(emptyList())
    val finance: StateFlow<List<Finance>> = _finance.asStateFlow()
    
    private val _totalIncome = MutableStateFlow(0.0)
    val totalIncome: StateFlow<Double> = _totalIncome.asStateFlow()
    
    private val _totalExpense = MutableStateFlow(0.0)
    val totalExpense: StateFlow<Double> = _totalExpense.asStateFlow()
    
    init {
        loadFinance()
    }
    
    private fun loadFinance() {
        viewModelScope.launch {
            financeRepository.getAllFinance().collect { financeList ->
                _finance.value = financeList
            }
        }
        
        viewModelScope.launch {
            financeRepository.getTotalIncome().collect { income ->
                _totalIncome.value = income ?: 0.0
            }
        }
        
        viewModelScope.launch {
            financeRepository.getTotalExpense().collect { expense ->
                _totalExpense.value = expense ?: 0.0
            }
        }
    }
}

