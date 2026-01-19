package com.servicecenter.ui.screens.warehouse

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.ui.screens.scanner.BarcodeScannerView
import com.servicecenter.ui.screens.scanner.ScanModeSelectionDialog
import com.servicecenter.ui.screens.scanner.ScanMode
import kotlinx.coroutines.launch
import kotlinx.coroutines.CoroutineScope
import androidx.compose.runtime.rememberCoroutineScope

@Composable
fun EditBarcodeDialog(
    item: WarehouseItem,
    onDismiss: () -> Unit,
    onUpdate: (String?) -> Unit,
    onDelete: () -> Unit,
    onCheckBarcodeUnique: suspend (String, Int) -> Boolean = { _, _ -> true },
    isLoading: Boolean = false
) {
    var barcodeText by remember(item.barcode) { mutableStateOf(item.barcode ?: "") }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showScanner by remember { mutableStateOf(false) }
    var showModeSelectionDialog by remember { mutableStateOf(false) }
    var selectedScanMode by remember { mutableStateOf<ScanMode?>(null) }
    var barcodeError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Редагувати штрих-код") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = barcodeText,
                        onValueChange = { 
                            barcodeText = it
                            barcodeError = null
                        },
                        label = { Text("Штрих-код") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                        singleLine = true,
                        enabled = !isLoading,
                        isError = barcodeError != null,
                        supportingText = barcodeError?.let { 
                            { Text(it, color = MaterialTheme.colorScheme.error) }
                        }
                    )
                    IconButton(
                        onClick = { showModeSelectionDialog = true },
                        enabled = !isLoading,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = "Сканувати штрих-код",
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
                
                if (item.barcode != null && item.barcode.isNotEmpty()) {
                    Button(
                        onClick = { showDeleteConfirm = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoading
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Видалити штрих-код")
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    scope.launch {
                        val newBarcode = barcodeText.trim().takeIf { it.isNotEmpty() }
                        if (newBarcode != null && newBarcode != item.barcode) {
                            // Check if barcode is unique
                            val isUnique = onCheckBarcodeUnique(newBarcode, item.id)
                            if (isUnique) {
                                barcodeError = null
                                onUpdate(newBarcode)
                            } else {
                                barcodeError = "Штрих-код вже використовується іншим товаром"
                            }
                        } else if (newBarcode == null) {
                            // Allow clearing barcode
                            barcodeError = null
                            onUpdate(null)
                        } else {
                            // Same barcode, no change
                            barcodeError = null
                        }
                    }
                },
                enabled = !isLoading && barcodeText.trim() != (item.barcode ?: "") && barcodeError == null
            ) {
                Text("Зберегти")
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
    
    // Delete confirmation dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Видалити штрих-код?") },
            text = {
                Text("Ви впевнені, що хочете видалити штрих-код для товару \"${item.name}\"?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    ),
                    enabled = !isLoading
                ) {
                    Text("Видалити")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteConfirm = false },
                    enabled = !isLoading
                ) {
                    Text("Скасувати")
                }
            }
        )
    }
    
    // Scanner dialog
    if (showScanner) {
        val lifecycleOwner = LocalLifecycleOwner.current
        Dialog(
            onDismissRequest = { showScanner = false },
            properties = DialogProperties(
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
                    // Header
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
                    
                    // Scanner view - use key to force recomposition when scanner opens
                    key(showScanner) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .weight(1f)
                        ) {
                            if (showScanner && selectedScanMode != null) {
                                BarcodeScannerView(
                                    onBarcodeScanned = { scannedBarcode ->
                                        android.util.Log.d("EditBarcodeDialog", "Barcode scanned: $scannedBarcode")
                                        scope.launch {
                                            // Check if scanned barcode is unique
                                            val isUnique = onCheckBarcodeUnique(scannedBarcode, item.id)
                                            android.util.Log.d("EditBarcodeDialog", "Barcode unique: $isUnique")
                                            if (isUnique) {
                                                barcodeText = scannedBarcode
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
                                
                                // Overlay with scanning frame
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Card(
                                        modifier = Modifier
                                            .size(250.dp)
                                            .padding(16.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.1f)
                                        )
                                    ) {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "Наведіть камеру на штрих-код",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Scan mode selection dialog
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

