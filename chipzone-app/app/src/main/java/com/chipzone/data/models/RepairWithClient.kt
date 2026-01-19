package com.chipzone.data.models

data class RepairWithClient(
    val repair: Repair,
    val clientName: String?,
    val clientPhone: String?
)

