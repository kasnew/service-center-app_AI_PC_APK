package com.servicecenter.data.api

import com.google.gson.*
import com.google.gson.reflect.TypeToken
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.lang.reflect.Type
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiClient @Inject constructor() {
    private val retrofits = java.util.Collections.synchronizedMap(mutableMapOf<String, Retrofit>())
    private var currentBaseUrl: String? = null
    
    var isOffline: Boolean = false
    
    fun getApiService(baseUrl: String): ApiService? {
        if (isOffline) return null
        
        val normalizedUrl = baseUrl.ensureTrailingSlash()
        
        val retrofit = synchronized(retrofits) {
            retrofits.getOrPut(normalizedUrl) {
                val loggingInterceptor = HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
                
                val client = OkHttpClient.Builder()
                    .addInterceptor(loggingInterceptor)
                    .connectTimeout(5, TimeUnit.SECONDS)
                    .readTimeout(5, TimeUnit.SECONDS)
                    .writeTimeout(5, TimeUnit.SECONDS)
                    .build()
                
                // Create Gson with custom adapter for status field
                val gson = GsonBuilder()
                    .registerTypeAdapter(com.servicecenter.data.models.Repair::class.java, RepairStatusAdapter())
                    .create()
                
                Retrofit.Builder()
                    .baseUrl(normalizedUrl)
                    .client(client)
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .build()
            }
        }
        
        currentBaseUrl = normalizedUrl
        return retrofit.create(ApiService::class.java)
    }
    
    private fun String.ensureTrailingSlash(): String {
        return if (this.endsWith("/")) this else "$this/"
    }
}

// Custom adapter to convert status from number to string and ensure non-null fields
class RepairStatusAdapter : JsonDeserializer<com.servicecenter.data.models.Repair> {
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): com.servicecenter.data.models.Repair {
        if (json == null || !json.isJsonObject) {
            throw JsonParseException("Invalid JSON for Repair")
        }
        
        val jsonObject = json.asJsonObject
        
        // Convert status from number to string
        val statusElement = jsonObject.get("status")
        val statusString = when {
            statusElement == null || statusElement.isJsonNull -> "У черзі"
            statusElement.isJsonPrimitive -> {
                val primitive = statusElement.asJsonPrimitive
                if (primitive.isNumber) {
                    val statusNum = primitive.asInt
                    when (statusNum) {
                        1 -> "У черзі"
                        2 -> "У роботі"
                        3 -> "Очікув. відпов./деталі"
                        4 -> "Готовий до видачі"
                        5 -> "Не додзвонилися"
                        6 -> "Видано"
                        7 -> "Одеса"
                        else -> statusNum.toString()
                    }
                } else if (primitive.isString) {
                    val s = primitive.asString
                    // Map "1", "2" strings as well if they come as strings
                    when (s) {
                        "1" -> "У черзі"
                        "2" -> "У роботі"
                        "3" -> "Очікув. відпов./деталі"
                        "4" -> "Готовий до видачі"
                        "5" -> "Не додзвонилися"
                        "6" -> "Видано"
                        "7" -> "Одеса"
                        "Queue" -> "У черзі"
                        "InProgress" -> "У роботі"
                        "Waiting" -> "Очікув. відпов./деталі"
                        "Ready" -> "Готовий до видачі"
                        "NoAnswer" -> "Не додзвонилися"
                        "Issued" -> "Видано"
                        "Odessa" -> "Одеса"
                        else -> s
                    }
                } else {
                    "У черзі"
                }
            }
            else -> "У черзі"
        }
        
        // Update/Set status in JSON object
        jsonObject.addProperty("status", statusString)
        
        // Ensure ALL required string fields have default values if null or missing
        val stringFields = listOf(
            "faultDesc", "workDone", "note", "executor", 
            "paymentType", "clientName", "clientPhone", "deviceName"
        )
        
        for (field in stringFields) {
            if (!jsonObject.has(field) || jsonObject.get(field).isJsonNull) {
                val defaultValue = when(field) {
                    "executor" -> "Андрій"
                    "paymentType" -> "Готівка"
                    else -> ""
                }
                jsonObject.addProperty(field, defaultValue)
            }
        }
        
        // Ensure numeric fields are not null (primitive types in Kotlin must not be null)
        val numericFields = listOf("receiptId", "costLabor", "totalCost", "profit")
        for (field in numericFields) {
            if (!jsonObject.has(field) || jsonObject.get(field).isJsonNull) {
                jsonObject.addProperty(field, 0.0)
            }
        }
        
        // Ensure boolean fields are not null
        val booleanFields = listOf("isPaid", "shouldCall")
        for (field in booleanFields) {
            if (!jsonObject.has(field) || jsonObject.get(field).isJsonNull) {
                jsonObject.addProperty(field, false)
            }
        }
        
        // Use default Gson deserializer with modified JSON
        // Using a fresh Gson instance ensures we don't recurse back into this adapter
        val gson = Gson()
        return try {
            gson.fromJson(jsonObject, com.servicecenter.data.models.Repair::class.java)
        } catch (e: Exception) {
            android.util.Log.e("RepairStatusAdapter", "Error parsing repair: ${e.message}", e)
            // Fallback: create empty repair instead of crashing
            com.servicecenter.data.models.Repair(
                receiptId = 0,
                deviceName = "Error parsing",
                status = "У черзі",
                clientName = "",
                clientPhone = ""
            )
        }
    }
}


