package com.servicecenter.data.models

import com.google.gson.annotations.SerializedName

data class ServerConfig(
    val id: String = java.util.UUID.randomUUID().toString(),
    val name: String,
    val url: String,
    val isActive: Boolean = false
)





