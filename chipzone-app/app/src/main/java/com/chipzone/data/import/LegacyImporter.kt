package com.chipzone.data.import

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import com.chipzone.data.models.Client
import com.chipzone.data.models.Repair
import com.chipzone.data.models.Product
import com.chipzone.data.models.Finance
import com.chipzone.data.repositories.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LegacyImporter @Inject constructor(
    private val context: Context,
    private val clientRepository: ClientRepository,
    private val repairRepository: RepairRepository,
    private val productRepository: ProductRepository,
    private val financeRepository: FinanceRepository
) {
    
    suspend fun importFromLegacyDatabase(dbPath: String): ImportResult = withContext(Dispatchers.IO) {
        try {
            val legacyDb = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
            
            var clientsImported = 0
            var repairsImported = 0
            var productsImported = 0
            var financeImported = 0
            
            // Import clients from Ремонт table
            val repairsCursor = legacyDb.rawQuery(
                """
                SELECT DISTINCT Имя_заказчика, Телефон 
                FROM Ремонт 
                WHERE Имя_заказчика IS NOT NULL AND Имя_заказчика != ''
                """, null
            )
            
            val existingPhones = mutableSetOf<String>()
            while (repairsCursor.moveToNext()) {
                val name = repairsCursor.getString(0)
                val phone = repairsCursor.getString(1)
                
                if (phone !in existingPhones) {
                    val client = Client(
                        name = name,
                        phone = phone,
                        createdAt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
                    )
                    clientRepository.insertClient(client)
                    existingPhones.add(phone)
                    clientsImported++
                }
            }
            repairsCursor.close()
            
            // Import repairs
            val repairCursor = legacyDb.rawQuery(
                """
                SELECT 
                    ID, Квитанция, Наименование_техники, Описание_неисправности,
                    Выполнено, Стоимость, Сумма, Оплачено, Состояние,
                    Имя_заказчика, Телефон, Доход, Начало_ремонта, Конец_ремонта,
                    Примечание, Перезвонить, Виконавець, ТипОплати
                FROM Ремонт
                """, null
            )
            
            // Build client map from already imported clients
            val clientMap = mutableMapOf<String, Int>()
            val clientsList = clientRepository.getAllClients().first()
            clientsList.forEach { client ->
                clientMap[client.phone] = client.id
            }
            
            while (repairCursor.moveToNext()) {
                val phone = repairCursor.getString(10)
                val clientId = clientMap[phone] ?: continue
                
                val status = mapLegacyStatus(repairCursor.getString(8))
                val repair = Repair(
                    clientId = clientId,
                    description = repairCursor.getString(3) ?: "",
                    status = status,
                    price = repairCursor.getDouble(6),
                    createdAt = repairCursor.getString(12) ?: SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date()),
                    updatedAt = repairCursor.getString(13) ?: SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date()),
                    deviceName = repairCursor.getString(2),
                    faultDesc = repairCursor.getString(3),
                    workDone = repairCursor.getString(4),
                    costLabor = repairCursor.getDouble(5),
                    totalCost = repairCursor.getDouble(6),
                    isPaid = repairCursor.getInt(7) == 1,
                    profit = repairCursor.getDouble(11),
                    dateStart = repairCursor.getString(12),
                    dateEnd = repairCursor.getString(13),
                    note = repairCursor.getString(14),
                    shouldCall = repairCursor.getInt(15) == 1,
                    executor = repairCursor.getString(16),
                    paymentType = repairCursor.getString(17),
                    receiptId = repairCursor.getInt(1)
                )
                repairRepository.insertRepair(repair)
                repairsImported++
            }
            repairCursor.close()
            
            // Import products from Расходники table
            val productsCursor = legacyDb.rawQuery(
                """
                SELECT 
                    ID, Наименование_расходника, Цена_уе, Вход, Цена_грн,
                    Наличие, Поставщик, Приход, Дата_продажи, Накладная,
                    Код_товара, Курс, №_квитанции, ШтрихКод
                FROM Расходники
                """, null
            )
            
            while (productsCursor.moveToNext()) {
                val product = Product(
                    name = productsCursor.getString(1) ?: "",
                    quantity = if (productsCursor.getInt(5) == 1) 1 else 0,
                    buyPrice = productsCursor.getDouble(3),
                    sellPrice = productsCursor.getDouble(4),
                    supplier = productsCursor.getString(6),
                    dateArrival = productsCursor.getString(7),
                    invoice = productsCursor.getString(9),
                    productCode = productsCursor.getString(10),
                    barcode = productsCursor.getString(13),
                    exchangeRate = productsCursor.getDouble(11).takeIf { !productsCursor.isNull(11) },
                    priceUsd = productsCursor.getDouble(2).takeIf { !productsCursor.isNull(2) },
                    costUah = productsCursor.getDouble(3).takeIf { !productsCursor.isNull(3) },
                    receiptId = productsCursor.getInt(12).takeIf { !productsCursor.isNull(12) },
                    inStock = productsCursor.getInt(5) == 1,
                    dateSold = productsCursor.getString(8)
                )
                productRepository.insertProduct(product)
                productsImported++
            }
            productsCursor.close()
            
            legacyDb.close()
            
            ImportResult(
                success = true,
                clientsImported = clientsImported,
                repairsImported = repairsImported,
                productsImported = productsImported,
                financeImported = financeImported
            )
        } catch (e: Exception) {
            Log.e("LegacyImporter", "Import failed", e)
            ImportResult(
                success = false,
                error = e.message ?: "Unknown error"
            )
        }
    }
    
    private fun mapLegacyStatus(status: String?): String {
        return when (status) {
            "1", "У черзі" -> "accepted"
            "2", "У роботі" -> "in_progress"
            "3", "Очікув. відпов./деталі", "Очікування" -> "waiting"
            "4", "Готовий до видачі", "Готовий" -> "ready"
            "6", "Видано" -> "issued"
            else -> "accepted"
        }
    }
    
    data class ImportResult(
        val success: Boolean,
        val clientsImported: Int = 0,
        val repairsImported: Int = 0,
        val productsImported: Int = 0,
        val financeImported: Int = 0,
        val error: String? = null
    )
}

