package com.chipzone.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "repairs")
@Serializable
data class Repair(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val clientId: Int,
    val description: String,
    val status: String, // "accepted", "in_progress", "ready", "issued"
    val price: Double = 0.0,
    val createdAt: String,
    val updatedAt: String,
    val deviceName: String? = null,
    val faultDesc: String? = null,
    val workDone: String? = null,
    val costLabor: Double = 0.0,
    val totalCost: Double = 0.0,
    val isPaid: Boolean = false,
    val profit: Double = 0.0,
    val dateStart: String? = null,
    val dateEnd: String? = null,
    val note: String? = null,
    val shouldCall: Boolean = false,
    val executor: String? = null,
    val paymentType: String? = "Готівка",
    val receiptId: Int? = null
)

