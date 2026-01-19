package com.chipzone.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chipzone.ui.components.FilterSection
import com.chipzone.ui.components.RepairCard
import com.chipzone.ui.navigation.Screen
import com.chipzone.ui.viewmodels.RepairDisplay
import com.chipzone.ui.viewmodels.RepairsViewModel
import com.chipzone.ui.viewmodels.ExecutorsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepairsScreen(
    navController: NavController,
    viewModel: RepairsViewModel = hiltViewModel(),
    executorsViewModel: ExecutorsViewModel = hiltViewModel()
) {
    val repairs by viewModel.repairs.collectAsState(initial = emptyList())
    val executors by executorsViewModel.executors.collectAsState(initial = emptyList())
    var searchQuery by remember { mutableStateOf("") }
    var selectedStatus by remember { mutableStateOf<String?>(null) }
    var selectedExecutor by remember { mutableStateOf<String?>(null) }
    var repairToDelete by remember { mutableStateOf<com.chipzone.data.models.Repair?>(null) }
    var repairToEdit by remember { mutableStateOf<RepairDisplay?>(null) }
    
    val allStatuses = listOf(
        "У черзі", "У роботі", "Очікув. відпов./деталі", 
        "Готовий до видачі", "Не додзвонилися", "Видано", "Одеса"
    )

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate(Screen.CreateRepair.route) },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Додати ремонт")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Add top padding for status bar since TopAppBar is gone
            Spacer(modifier = Modifier.windowInsetsTopHeight(WindowInsets.statusBars))
            
            // Search & Controls Container
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { 
                        searchQuery = it
                        viewModel.searchRepairs(it, selectedStatus, selectedExecutor)
                    },
                    placeholder = { Text("Пошук за номером, клієнтом або пристроєм...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    trailingIcon = if (searchQuery.isNotEmpty()) {
                        {
                            IconButton(onClick = { 
                                searchQuery = ""
                                viewModel.searchRepairs("", selectedStatus, selectedExecutor)
                            }) {
                                Icon(Icons.Default.Clear, contentDescription = "Clear")
                            }
                        }
                    } else null,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large, // Rounded search bar
                    singleLine = true
                )

                // Filters
                FilterSection(
                    statuses = allStatuses,
                    selectedStatus = selectedStatus,
                    onStatusSelected = { 
                        selectedStatus = it
                        viewModel.searchRepairs(searchQuery, it, selectedExecutor)
                    },
                    executors = executors.map { it.name },
                    selectedExecutor = selectedExecutor,
                    onExecutorSelected = {
                        selectedExecutor = it
                        viewModel.searchRepairs(searchQuery, selectedStatus, it)
                    }
                )
            }
            
            Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Repairs List
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(repairs) { repairDisplay ->
                    RepairCard(
                        repairDisplay = repairDisplay,
                        onClick = { repairToEdit = repairDisplay },
                        onDelete = { repairToDelete = repairDisplay.repair }
                    )
                }
            }
        }
        
        // Delete confirmation dialog
        repairToDelete?.let { repair ->
            AlertDialog(
                onDismissRequest = { repairToDelete = null },
                title = { Text("Видалити ремонт?") },
                text = {
                    Text("Ви впевнені, що хочете видалити ремонт для клієнта \"${repair.deviceName ?: "невідомо"}\"?")
                },
                confirmButton = {
                    Button(
                        onClick = {
                            viewModel.deleteRepair(repair)
                            repairToDelete = null
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Text("Видалити")
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { repairToDelete = null }
                    ) {
                        Text("Скасувати")
                    }
                }
            )
        }
        
        // Edit repair dialog
        repairToEdit?.let { repairDisplay ->
            EditRepairDialog(
                repairDisplay = repairDisplay,
                onDismiss = { repairToEdit = null },
                onSave = { updatedRepair ->
                    viewModel.updateRepair(
                        repair = updatedRepair,
                        onSuccess = {
                            repairToEdit = null
                        },
                        onError = { error ->
                            android.util.Log.e("RepairsScreen", "Error updating repair: $error")
                            repairToEdit = null
                        }
                    )
                }
            )
        }
    }
}



