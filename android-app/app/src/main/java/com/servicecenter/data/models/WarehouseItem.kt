package com.servicecenter.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "warehouse_items")
data class WarehouseItem(
    @PrimaryKey
    val id: Int,
    @SerializedName("name")
    val name: String,
    @SerializedName("priceUsd")
    val priceUsd: Double = 0.0,
    @SerializedName("exchangeRate")
    val exchangeRate: Double = 0.0,
    @SerializedName("costUah")
    val costUah: Double = 0.0,
    @SerializedName("priceUah")
    val priceUah: Double = 0.0,
    @SerializedName("profit")
    val profit: Double = 0.0,
    @SerializedName("inStock")
    val inStock: Boolean = true,
    @SerializedName("supplier")
    val supplier: String? = null,
    @SerializedName("dateArrival")
    val dateArrival: String? = null,
    @SerializedName("dateSold")
    val dateSold: String? = null,
    @SerializedName("receiptId")
    val receiptId: Int? = null,
    @SerializedName("invoice")
    val invoice: String? = null,
    @SerializedName("productCode")
    val productCode: String? = null,
    @SerializedName("barcode")
    val barcode: String? = null
)


