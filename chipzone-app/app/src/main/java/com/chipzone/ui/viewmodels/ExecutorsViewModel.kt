package com.chipzone.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.data.models.Executor
import com.chipzone.data.repositories.ExecutorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ExecutorsViewModel @Inject constructor(
    private val executorRepository: ExecutorRepository
) : ViewModel() {
    
    private val _executors = MutableStateFlow<List<Executor>>(emptyList())
    val executors: StateFlow<List<Executor>> = _executors.asStateFlow()
    
    init {
        loadExecutors()
    }
    
    private fun loadExecutors() {
        viewModelScope.launch {
            executorRepository.getAllExecutors().collect { executors ->
                _executors.value = executors
            }
        }
    }
    
    fun addExecutor(name: String, workPercent: Double, productPercent: Double) {
        viewModelScope.launch {
            try {
                val executor = Executor(
                    name = name.trim(),
                    workPercent = workPercent,
                    productPercent = productPercent
                )
                executorRepository.insertExecutor(executor)
            } catch (e: Exception) {
                android.util.Log.e("ExecutorsViewModel", "Error adding executor: ${e.message}", e)
            }
        }
    }
    
    fun updateExecutor(executor: Executor) {
        viewModelScope.launch {
            try {
                executorRepository.updateExecutor(executor)
            } catch (e: Exception) {
                android.util.Log.e("ExecutorsViewModel", "Error updating executor: ${e.message}", e)
            }
        }
    }
    
    fun deleteExecutor(executor: Executor) {
        viewModelScope.launch {
            try {
                executorRepository.deleteExecutor(executor)
            } catch (e: Exception) {
                android.util.Log.e("ExecutorsViewModel", "Error deleting executor: ${e.message}", e)
            }
        }
    }
}

