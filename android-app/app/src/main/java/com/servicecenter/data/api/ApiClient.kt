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

// Custom adapter to convert status from number to string
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
        val statusValue = jsonObject.get("status")
        val statusString = when {
            statusValue != null && statusValue.isJsonPrimitive -> {
                val primitive = statusValue.asJsonPrimitive
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
                    primitive.asString
                } else {
                    "У черзі"
                }
            }
            else -> "У черзі"
        }
        
        // Replace status in JSON object
        jsonObject.addProperty("status", statusString)
        
        // Ensure all string fields have default values if null
        if (!jsonObject.has("faultDesc") || jsonObject.get("faultDesc").isJsonNull) {
            jsonObject.addProperty("faultDesc", "")
        }
        if (!jsonObject.has("workDone") || jsonObject.get("workDone").isJsonNull) {
            jsonObject.addProperty("workDone", "")
        }
        if (!jsonObject.has("note") || jsonObject.get("note").isJsonNull) {
            jsonObject.addProperty("note", "")
        }
        if (!jsonObject.has("executor") || jsonObject.get("executor").isJsonNull) {
            jsonObject.addProperty("executor", "Андрій")
        }
        if (!jsonObject.has("paymentType") || jsonObject.get("paymentType").isJsonNull) {
            jsonObject.addProperty("paymentType", "Готівка")
        }
        if (!jsonObject.has("clientName") || jsonObject.get("clientName").isJsonNull) {
            jsonObject.addProperty("clientName", "")
        }
        if (!jsonObject.has("clientPhone") || jsonObject.get("clientPhone").isJsonNull) {
            jsonObject.addProperty("clientPhone", "")
        }
        if (!jsonObject.has("deviceName") || jsonObject.get("deviceName").isJsonNull) {
            jsonObject.addProperty("deviceName", "")
        }
        
        // Use default Gson deserializer with modified JSON
        val gson = Gson()
        return gson.fromJson(jsonObject, com.servicecenter.data.models.Repair::class.java)
    }
}


