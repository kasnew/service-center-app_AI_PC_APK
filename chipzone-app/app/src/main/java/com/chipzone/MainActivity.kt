package com.chipzone

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chipzone.security.BiometricManager
import com.chipzone.security.PinManager
import com.chipzone.ui.navigation.Screen
import com.chipzone.ui.screens.*
import com.chipzone.ui.theme.ChipZoneTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {
    
    @Inject
    lateinit var pinManager: PinManager
    
    @Inject
    lateinit var biometricManager: BiometricManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Прибираємо автоматичну назву додатку з вікна
        window.setTitle(null)
        
        setContent {
            ChipZoneTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation(pinManager, biometricManager)
                }
            }
        }
    }
}

@Composable
fun AppNavigation(pinManager: PinManager, biometricManager: BiometricManager) {
    val navController = rememberNavController()
    var isPinVerified by remember { mutableStateOf(false) }
    var isPinSet by remember { mutableStateOf(pinManager.isPinSet()) }
    var isProtectionEnabled by remember { mutableStateOf(pinManager.isProtectionEnabled()) }
    
    // Check protection status on each recomposition
    LaunchedEffect(Unit) {
        // Periodically check if protection status changed
        while (true) {
            val currentProtection = pinManager.isProtectionEnabled()
            if (currentProtection != isProtectionEnabled) {
                isProtectionEnabled = currentProtection
                // If protection was disabled, navigate to main screen
                if (!currentProtection) {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Pin.route) { inclusive = true }
                    }
                }
            }
            kotlinx.coroutines.delay(500) // Check every 500ms
        }
    }
    
    // If protection is disabled, skip authentication
    val startDestination = if (isProtectionEnabled && isPinSet) {
        Screen.Pin.route
    } else {
        Screen.Main.route
    }
    
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Pin.route) {
            // Only show auth screen if protection is enabled
            if (isProtectionEnabled) {
                AuthScreen(
                    pinManager = pinManager,
                    biometricManager = biometricManager,
                    onPinVerified = {
                        isPinVerified = true
                        navController.navigate(Screen.Main.route) {
                            popUpTo(Screen.Pin.route) { inclusive = true }
                        }
                    },
                    onPinSet = {
                        isPinSet = true
                        isPinVerified = true
                        navController.navigate(Screen.Main.route) {
                            popUpTo(Screen.Pin.route) { inclusive = true }
                        }
                    }
                )
            } else {
                // If protection was disabled while on auth screen, navigate to main
                LaunchedEffect(Unit) {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Pin.route) { inclusive = true }
                    }
                }
            }
        }
        
        composable(Screen.Main.route) {
            MainScreen(navController)
        }
        
        composable(Screen.Repairs.route) {
            RepairsScreen(navController)
        }
        
        composable(Screen.CreateRepair.route) {
            CreateRepairScreen(navController)
        }
        
        composable(Screen.Products.route) {
            ProductsScreen(navController)
        }
        
        composable(Screen.Finance.route) {
            FinanceScreen()
        }
        
        composable(Screen.Settings.route) {
            SettingsScreen(navController)
        }
        
        composable(Screen.ExecutorsEditor.route) {
            ExecutorsEditorScreen(navController)
        }
        
        composable(Screen.CounterpartiesEditor.route) {
            CounterpartiesEditorScreen(navController)
        }
        
        composable(Screen.Scanner.route) {
            ScannerScreen(
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.RepairDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("id") {
                    type = androidx.navigation.NavType.IntType
                }
            )
        ) { backStackEntry ->
            val repairId = backStackEntry.arguments?.getInt("id")
            if (repairId != null) {
                RepairDetailScreen(
                    repairId = repairId,
                    navController = navController
                )
            }
        }
    }
}

