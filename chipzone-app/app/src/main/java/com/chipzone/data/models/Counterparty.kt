package com.chipzone.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "counterparties")
@Serializable
data class Counterparty(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val name: String,
    val smartImport: Boolean = false // Флаг "Розумний імпорт"
)

