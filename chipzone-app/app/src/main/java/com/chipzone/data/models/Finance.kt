package com.chipzone.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "finance")
@Serializable
data class Finance(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val type: String, // "income" or "expense"
    val amount: Double,
    val description: String,
    val createdAt: String,
    val category: String? = null,
    val executorId: Int? = null,
    val executorName: String? = null,
    val receiptId: Int? = null,
    val paymentType: String? = null
)

