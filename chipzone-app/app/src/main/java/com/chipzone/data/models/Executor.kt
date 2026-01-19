package com.chipzone.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "executors")
@Serializable
data class Executor(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val name: String,
    val workPercent: Double = 0.0, // Відсоток від виконаної роботи
    val productPercent: Double = 0.0 // Відсоток від проданих товарів
)

