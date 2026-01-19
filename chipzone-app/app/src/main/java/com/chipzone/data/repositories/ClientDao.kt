package com.chipzone.data.repositories

import androidx.room.*
import com.chipzone.data.models.Client
import kotlinx.coroutines.flow.Flow

@Dao
interface ClientDao {
    @Query("SELECT * FROM clients ORDER BY name ASC")
    fun getAllClients(): Flow<List<Client>>
    
    @Query("SELECT * FROM clients WHERE id = :id")
    suspend fun getClientById(id: Int): Client?
    
    @Query("SELECT * FROM clients WHERE name LIKE :search OR phone LIKE :search")
    fun searchClients(search: String): Flow<List<Client>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClient(client: Client): Long
    
    @Update
    suspend fun updateClient(client: Client)
    
    @Delete
    suspend fun deleteClient(client: Client)
    
    @Query("SELECT * FROM clients WHERE phone = :phone LIMIT 1")
    suspend fun getClientByPhone(phone: String): Client?
}

