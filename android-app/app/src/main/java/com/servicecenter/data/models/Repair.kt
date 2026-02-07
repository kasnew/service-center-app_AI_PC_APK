package com.servicecenter.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "repairs")
data class Repair(
    @PrimaryKey(autoGenerate = true)
    val id: Int? = null,
    @SerializedName("receiptId")
    val receiptId: Int = 0,
    @SerializedName("deviceName")
    val deviceName: String = "",
    @SerializedName("faultDesc")
    val faultDesc: String = "",
    @SerializedName("workDone")
    val workDone: String = "",
    @SerializedName("costLabor")
    val costLabor: Double = 0.0,
    @SerializedName("totalCost")
    val totalCost: Double = 0.0,
    @SerializedName("isPaid")
    val isPaid: Boolean = false,
    @SerializedName("status")
    val status: String = "У черзі",
    @SerializedName("clientName")
    val clientName: String = "",
    @SerializedName("clientPhone")
    val clientPhone: String = "",
    @SerializedName("profit")
    val profit: Double = 0.0,
    @SerializedName("dateStart")
    val dateStart: String? = null,
    @SerializedName("dateEnd")
    val dateEnd: String? = null,
    @SerializedName("note")
    val note: String = "",
    @SerializedName("shouldCall")
    val shouldCall: Boolean = false,
    @SerializedName("executor")
    val executor: String = "",
    @SerializedName("paymentType")
    val paymentType: String = "Готівка",
    @SerializedName("UpdateTimestamp")
    val updateTimestamp: String? = null,
    val synced: Boolean = false,
    val lastModified: Long = System.currentTimeMillis()
)
