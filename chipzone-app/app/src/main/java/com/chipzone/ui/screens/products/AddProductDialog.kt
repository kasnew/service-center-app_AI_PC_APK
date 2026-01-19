package com.chipzone.ui.screens.products

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chipzone.data.models.Product
import com.chipzone.ui.screens.scanner.BarcodeScannerView
import com.chipzone.ui.screens.scanner.ScanModeSelectionDialog
import com.chipzone.ui.screens.scanner.ScanMode
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun AddProductDialog(
    onDismiss: () -> Unit,
    onAdd: (Product) -> Unit,
    onCheckBarcodeUnique: suspend (String, Int) -> Boolean = { _, _ -> true },
    isLoading: Boolean = false
) {
    var name by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("0") }
    var buyPrice by remember { mutableStateOf("0.00") }
    var sellPrice by remember { mutableStateOf("0.00") }
    var supplier by remember { mutableStateOf("") }
    var productCode by remember { mutableStateOf("") }
    var barcode by remember { mutableStateOf("") }
    var invoice by remember { mutableStateOf("") }
    // Default to current date for arrival
    var dateArrival by remember { 
        mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()))
    }
    
    var showScanner by remember { mutableStateOf(false) }
    var showModeSelectionDialog by remember { mutableStateOf(false) }
    var selectedScanMode by remember { mutableStateOf<ScanMode?>(null) }
    var barcodeError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Додати товар") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Назва") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isLoading
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = quantity,
                        onValueChange = { if (it.all { char -> char.isDigit() }) quantity = it },
                        label = { Text("Кількість") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        enabled = !isLoading
                    )
                    
                    OutlinedTextField(
                        value = buyPrice,
                        onValueChange = { buyPrice = it },
                        label = { Text("Ціна закупки, ₴") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        enabled = !isLoading
                    )
                }
                
                OutlinedTextField(
                    value = sellPrice,
                    onValueChange = { sellPrice = it },
                    label = { Text("Ціна продажу, ₴") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    enabled = !isLoading
                )
                
                OutlinedTextField(
                    value = supplier,
                    onValueChange = { supplier = it },
                    label = { Text("Постачальник") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isLoading
                )
                
                OutlinedTextField(
                    value = productCode,
                    onValueChange = { productCode = it },
                    label = { Text("Артикул") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isLoading
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = barcode,
                        onValueChange = { 
                            barcode = it
                            barcodeError = null
                        },
                        label = { Text("Штрих-код") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        enabled = !isLoading,
                        isError = barcodeError != null,
                        supportingText = barcodeError?.let { 
                            { Text(it, color = MaterialTheme.colorScheme.error) }
                        },
                        trailingIcon = {
                            IconButton(
                                onClick = { showModeSelectionDialog = true },
                                enabled = !isLoading
                            ) {
                                Icon(
                                    imageVector = Icons.Default.QrCodeScanner,
                                    contentDescription = "Сканувати штрих-код"
                                )
                            }
                        }
                    )
                }
                
                OutlinedTextField(
                    value = invoice,
                    onValueChange = { invoice = it },
                    label = { Text("Номер накладної") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isLoading
                )
                
                OutlinedTextField(
                    value = dateArrival,
                    onValueChange = { dateArrival = it },
                    label = { Text("Дата надходження (yyyy-MM-dd)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isLoading
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    scope.launch {
                        val newProduct = Product(
                            id = 0, // 0 for auto-increment
                            name = name.trim(),
                            quantity = quantity.toIntOrNull() ?: 0,
                            buyPrice = buyPrice.toDoubleOrNull() ?: 0.0,
                            sellPrice = sellPrice.toDoubleOrNull() ?: 0.0,
                            supplier = supplier.takeIf { it.isNotBlank() },
                            productCode = productCode.takeIf { it.isNotBlank() },
                            barcode = barcode.takeIf { it.isNotBlank() },
                            invoice = invoice.takeIf { it.isNotBlank() },
                            dateArrival = dateArrival.takeIf { it.isNotBlank() },
                            inStock = (quantity.toIntOrNull() ?: 0) > 0,
                            costUah = buyPrice.toDoubleOrNull() ?: 0.0 // Initial cost
                        )
                        
                        // Check barcode uniqueness if set
                        if (newProduct.barcode != null) {
                            val isUnique = onCheckBarcodeUnique(newProduct.barcode!!, 0)
                            if (isUnique) {
                                barcodeError = null
                                onAdd(newProduct)
                            } else {
                                barcodeError = "Штрих-код вже використовується іншим товаром"
                            }
                        } else {
                            onAdd(newProduct)
                        }
                    }
                },
                enabled = !isLoading && name.isNotBlank() && barcodeError == null
            ) {
                Text("Додати")
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isLoading
            ) {
                Text("Скасувати")
            }
        }
    )
    
    // Scanner dialog & logic (reused from EditProductDialog)
    if (showScanner) {
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { showScanner = false },
            properties = androidx.compose.ui.window.DialogProperties(
                usePlatformDefaultWidth = false,
                decorFitsSystemWindows = false
            )
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Сканувати штрих-код",
                            style = MaterialTheme.typography.titleLarge
                        )
                        IconButton(onClick = { showScanner = false }) {
                            Text("✕", style = MaterialTheme.typography.titleLarge)
                        }
                    }
                    
                    key(showScanner) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .weight(1f)
                            ) {
                            if (showScanner && selectedScanMode != null) {
                                BarcodeScannerView(
                                    onBarcodeScanned = { scannedBarcode ->
                                        scope.launch {
                                            val isUnique = onCheckBarcodeUnique(scannedBarcode, 0)
                                            if (isUnique) {
                                                barcode = scannedBarcode
                                                barcodeError = null
                                                showScanner = false
                                                selectedScanMode = null
                                            } else {
                                                barcodeError = "Штрих-код вже використовується іншим товаром"
                                                showScanner = false
                                                selectedScanMode = null
                                            }
                                        }
                                    },
                                    isActive = showScanner,
                                    scanMode = selectedScanMode!!,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                }
            }
        }
    }
    
    if (showModeSelectionDialog) {
        ScanModeSelectionDialog(
            onModeSelected = { mode ->
                selectedScanMode = mode
                showModeSelectionDialog = false
                showScanner = true
            },
            onDismiss = {
                showModeSelectionDialog = false
            }
        )
    }
}
