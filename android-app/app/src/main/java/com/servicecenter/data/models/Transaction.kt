package com.servicecenter.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "transactions")
data class Transaction(
    @PrimaryKey
    val id: Int,
    @SerializedName("dateCreated")
    val dateCreated: String? = null,
    @SerializedName("dateExecuted")
    val dateExecuted: String? = null,
    @SerializedName("category")
    val category: String,
    @SerializedName("description")
    val description: String,
    @SerializedName("amount")
    val amount: Double,
    @SerializedName("cash")
    val cash: Double = 0.0,
    @SerializedName("card")
    val card: Double = 0.0,
    @SerializedName("executorName")
    val executorName: String? = null,
    @SerializedName("paymentType")
    val paymentType: String? = null
)


