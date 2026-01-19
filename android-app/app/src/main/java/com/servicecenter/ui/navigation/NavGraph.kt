package com.servicecenter.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.servicecenter.ui.screens.home.HomeScreen
import com.servicecenter.ui.screens.repairs.*
import com.servicecenter.ui.screens.scanner.ScannerScreen
import com.servicecenter.ui.screens.settings.SettingsScreen
import com.servicecenter.ui.screens.transactions.TransactionsScreen
import com.servicecenter.ui.screens.warehouse.WarehouseScreen

@Composable
fun NavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeScreen(
                onRepairsClick = { navController.navigate("repairs") },
                onWarehouseClick = { navController.navigate("warehouse") },
                onTransactionsClick = { navController.navigate("transactions") },
                onSettingsClick = { navController.navigate("settings") },
                onScannerClick = { navController.navigate("scanner") }
            )
        }
        
        composable("repairs") {
            android.util.Log.d("NavGraph", "Navigating to repairs screen")
            LaunchedEffect(Unit) {
                android.util.Log.d("NavGraph", "Repairs screen composed")
            }
            RepairsScreen(
                onRepairClick = { id ->
                    android.util.Log.d("NavGraph", "Repair clicked: $id")
                    navController.navigate("repair_detail/$id")
                },
                onCreateRepair = {
                    android.util.Log.d("NavGraph", "Create repair clicked")
                    navController.navigate("create_repair")
                }
            )
        }
        
        composable("repair_detail/{id}") { backStackEntry ->
            val id = backStackEntry.arguments?.getString("id")?.toIntOrNull()
            val repairsViewModel: RepairsViewModel = hiltViewModel()
            
            var receiptId by remember { mutableStateOf(0) }
            var refreshTrigger by remember { mutableStateOf(0) }
            
            LaunchedEffect(id) {
                if (id != null) {
                    val repair = repairsViewModel.getRepairById(id)
                    receiptId = repair?.receiptId ?: 0
                }
            }
            
            // Reload when returning from select_warehouse_item
            LaunchedEffect(backStackEntry.savedStateHandle) {
                val shouldReload = backStackEntry.savedStateHandle.get<Boolean>("shouldReload") ?: false
                if (shouldReload) {
                    refreshTrigger++
                    backStackEntry.savedStateHandle.remove<Boolean>("shouldReload")
                }
            }
            
            // Use key to force recomposition when returning to this screen
            key(backStackEntry.id, refreshTrigger) {
                RepairDetailScreen(
                    repairId = id,
                    onBack = { navController.popBackStack() },
                    onAddParts = {
                        if (id != null && receiptId > 0) {
                            navController.navigate("select_warehouse_item/$id/$receiptId")
                        } else if (id != null) {
                            navController.navigate("select_warehouse_item/$id")
                        }
                    }
                )
            }
        }
        
        composable("select_warehouse_item/{repairId}") { backStackEntry ->
            val repairId = backStackEntry.arguments?.getString("repairId")?.toIntOrNull() ?: 0
            val repairsViewModel: RepairsViewModel = hiltViewModel()
            
            var receiptId by remember { mutableStateOf(0) }
            
            LaunchedEffect(repairId) {
                if (repairId > 0) {
                    val repair = repairsViewModel.getRepairById(repairId)
                    receiptId = repair?.receiptId ?: 0
                }
            }
            
            if (receiptId > 0) {
                SelectWarehouseItemScreen(
                    repairId = repairId,
                    receiptId = receiptId,
                    onBack = { navController.popBackStack() },
                    onItemSelected = { item ->
                        // TODO: Add item to repair via API
                        android.util.Log.d("SelectWarehouseItemScreen", "Selected item: ${item.name}")
                        navController.popBackStack()
                    }
                )
            }
        }
        
        composable("select_warehouse_item/{repairId}/{receiptId}") { backStackEntry ->
            val repairId = backStackEntry.arguments?.getString("repairId")?.toIntOrNull() ?: 0
            val receiptId = backStackEntry.arguments?.getString("receiptId")?.toIntOrNull() ?: 0
            
            SelectWarehouseItemScreen(
                repairId = repairId,
                receiptId = receiptId,
                onBack = { navController.popBackStack() },
                onItemSelected = { item ->
                    android.util.Log.d("SelectWarehouseItemScreen", "Selected item: ${item.name}")
                    // Set flag to trigger reload in repair detail
                    navController.previousBackStackEntry?.savedStateHandle?.set("shouldReload", true)
                    navController.popBackStack()
                }
            )
        }
        
        composable("create_repair") {
            val repairsViewModel: RepairsViewModel = hiltViewModel()
            // Use key to force recomposition and reload next receipt ID each time screen opens
            key(System.currentTimeMillis()) {
                CreateRepairScreen(
                    onBack = { navController.popBackStack() },
                    onSuccess = { 
                        // Refresh repairs list after creating new repair
                        repairsViewModel.loadRepairs()
                        navController.popBackStack() 
                    }
                )
            }
        }
        
        composable("warehouse") {
            WarehouseScreen(
                onBack = { navController.popBackStack() }
            )
        }
        
        composable("transactions") {
            android.util.Log.d("NavGraph", "Navigating to transactions screen")
            LaunchedEffect(Unit) {
                android.util.Log.d("NavGraph", "Transactions screen composed")
            }
            TransactionsScreen(
                onBack = { 
                    android.util.Log.d("NavGraph", "Transactions screen back pressed")
                    navController.popBackStack() 
                }
            )
        }
        
        composable("settings") {
            SettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }
        
        composable("scanner") {
            ScannerScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}


