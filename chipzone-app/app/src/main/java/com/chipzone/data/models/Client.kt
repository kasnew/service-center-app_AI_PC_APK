package com.chipzone.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "clients")
@Serializable
data class Client(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val name: String,
    val phone: String,
    val deviceInfo: String? = null,
    val notes: String? = null,
    val createdAt: String
)

