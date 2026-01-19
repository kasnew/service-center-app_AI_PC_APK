package com.chipzone.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chipzone.data.models.Client
import com.chipzone.data.repositories.ClientRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class ClientsViewModel @Inject constructor(
    private val clientRepository: ClientRepository
) : ViewModel() {
    
    private val _clients = MutableStateFlow<List<Client>>(emptyList())
    val clients: StateFlow<List<Client>> = _clients.asStateFlow()
    
    init {
        loadClients()
    }
    
    private fun loadClients() {
        viewModelScope.launch {
            clientRepository.getAllClients().collect { clientList ->
                _clients.value = clientList
            }
        }
    }
    
    fun searchClients(query: String) {
        viewModelScope.launch {
            if (query.isBlank()) {
                loadClients()
            } else {
                clientRepository.searchClients(query).collect { clientList ->
                    _clients.value = clientList
                }
            }
        }
    }
    
    fun addClient(name: String, phone: String, deviceInfo: String?, notes: String?) {
        viewModelScope.launch {
            val client = Client(
                name = name,
                phone = phone,
                deviceInfo = deviceInfo,
                notes = notes,
                createdAt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
            )
            clientRepository.insertClient(client)
        }
    }
}

