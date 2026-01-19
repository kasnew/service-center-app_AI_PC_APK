package com.chipzone.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "products")
@Serializable
data class Product(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val name: String,
    val quantity: Int = 0,
    val buyPrice: Double = 0.0,
    val sellPrice: Double = 0.0,
    val supplier: String? = null,
    val dateArrival: String? = null,
    val invoice: String? = null,
    val productCode: String? = null,
    val barcode: String? = null,
    val exchangeRate: Double? = null,
    val priceUsd: Double? = null,
    val costUah: Double? = null,
    val repairId: Int? = null,
    val receiptId: Int? = null,
    val inStock: Boolean = true,
    val dateSold: String? = null
)

