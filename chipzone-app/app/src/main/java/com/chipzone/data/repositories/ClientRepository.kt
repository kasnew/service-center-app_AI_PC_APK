package com.chipzone.data.repositories

import com.chipzone.data.models.Client
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClientRepository @Inject constructor(
    private val clientDao: ClientDao
) {
    fun getAllClients(): Flow<List<Client>> = clientDao.getAllClients()
    
    suspend fun getClientById(id: Int): Client? = clientDao.getClientById(id)
    
    fun searchClients(search: String): Flow<List<Client>> = clientDao.searchClients("%$search%")
    
    suspend fun insertClient(client: Client): Long = clientDao.insertClient(client)
    
    suspend fun updateClient(client: Client) = clientDao.updateClient(client)
    
    suspend fun deleteClient(client: Client) = clientDao.deleteClient(client)
    
    suspend fun getClientByPhone(phone: String): Client? = clientDao.getClientByPhone(phone)
}

