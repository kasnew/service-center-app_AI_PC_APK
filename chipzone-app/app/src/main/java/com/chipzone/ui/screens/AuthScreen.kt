package com.chipzone.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.chipzone.security.BiometricManager
import com.chipzone.security.PinManager

@Composable
fun AuthScreen(
    pinManager: PinManager,
    biometricManager: BiometricManager,
    onPinVerified: () -> Unit,
    onPinSet: () -> Unit
) {
    val context = LocalContext.current
    val activity = remember { 
        when (val ctx = context) {
            is FragmentActivity -> ctx
            is android.content.ContextWrapper -> {
                var current: android.content.Context? = ctx.baseContext
                while (current != null) {
                    if (current is FragmentActivity) {
                        return@remember current
                    }
                    current = if (current is android.content.ContextWrapper) current.baseContext else null
                }
                null
            }
            else -> null
        }
    }
    
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSettingPin by remember { mutableStateOf(!pinManager.isPinSet()) }
    var step by remember { mutableStateOf(0) } // 0 = enter pin, 1 = confirm pin
    var showBiometric by remember { mutableStateOf(false) }
    
    // Check biometric availability
    val isBiometricAvailable = remember { 
        try {
            val available = biometricManager.isBiometricAvailable()
            android.util.Log.d("AuthScreen", "Biometric available: $available, isSettingPin: $isSettingPin, activity: ${activity != null}")
            available
        } catch (e: Exception) {
            android.util.Log.e("AuthScreen", "Error checking biometric: ${e.message}", e)
            false
        }
    }
    
    // Try biometric authentication on first load if available
    LaunchedEffect(isSettingPin, isBiometricAvailable, activity) {
        android.util.Log.d("AuthScreen", "LaunchedEffect: isSettingPin=$isSettingPin, isBiometricAvailable=$isBiometricAvailable, activity=${activity != null}")
        if (!isSettingPin && isBiometricAvailable && activity != null) {
            android.util.Log.d("AuthScreen", "Auto-starting biometric authentication")
            showBiometric = true
        }
    }
    
    // Handle biometric authentication
    if (showBiometric && activity != null) {
        LaunchedEffect(showBiometric) {
            android.util.Log.d("AuthScreen", "Starting biometric authentication")
            try {
                biometricManager.authenticate(
                    activity = activity,
                    onSuccess = {
                        android.util.Log.d("AuthScreen", "Biometric authentication succeeded")
                        showBiometric = false
                        onPinVerified()
                    },
                    onError = { error ->
                        android.util.Log.e("AuthScreen", "Biometric authentication error: $error")
                        showBiometric = false
                        errorMessage = error
                    },
                    onCancel = {
                        android.util.Log.d("AuthScreen", "Biometric authentication canceled")
                        showBiometric = false
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("AuthScreen", "Exception during biometric authentication: ${e.message}", e)
                showBiometric = false
                errorMessage = "Помилка біометричної аутентифікації: ${e.message}"
            }
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = if (isSettingPin) {
                if (step == 0) "Встановити PIN" else "Підтвердіть PIN"
            } else {
                "Введіть PIN"
            },
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 32.dp)
        )
        
        // Biometric button (if available and not setting pin)
        if (!isSettingPin && isBiometricAvailable) {
            IconButton(
                onClick = {
                    if (activity != null) {
                        showBiometric = true
                    } else {
                        errorMessage = "Помилка: активність не доступна для біометричної аутентифікації"
                    }
                },
                modifier = Modifier
                    .size(80.dp)
                    .padding(bottom = 24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Fingerprint,
                    contentDescription = "Відбиток пальця",
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
            Text(
                text = "Або використайте відбиток",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 32.dp)
            )
        } else if (!isSettingPin && !isBiometricAvailable) {
            // Show info if biometric is not available
            Text(
                text = "Біометрична аутентифікація недоступна",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
        
        // PIN input dots
        Row(
            modifier = Modifier.padding(bottom = 32.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            repeat(6) { index ->
                Surface(
                    modifier = Modifier.size(16.dp),
                    shape = MaterialTheme.shapes.small,
                    color = if (index < pin.length) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                ) {}
            }
        }
        
        // Number pad
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            for (row in 0..2) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    for (col in 1..3) {
                        val number = row * 3 + col
                        Button(
                            onClick = {
                                if (pin.length < 6) {
                                    pin += number.toString()
                                    errorMessage = null
                                }
                            },
                            modifier = Modifier.size(64.dp)
                        ) {
                            Text(text = number.toString(), fontSize = 20.sp)
                        }
                    }
                }
            }
            
            // Bottom row: 0, Delete
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        if (pin.length < 6) {
                            pin += "0"
                            errorMessage = null
                        }
                    },
                    modifier = Modifier.size(64.dp)
                ) {
                    Text(text = "0", fontSize = 20.sp)
                }
                
                Button(
                    onClick = {
                        if (pin.isNotEmpty()) {
                            pin = pin.dropLast(1)
                            errorMessage = null
                        }
                    },
                    modifier = Modifier.size(64.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text(text = "⌫", fontSize = 20.sp)
                }
            }
        }
        
        // Error message
        errorMessage?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 16.dp)
            )
        }
        
        // Confirm button (only when PIN is complete)
        if (pin.length == 6) {
            Button(
                onClick = {
                    if (isSettingPin) {
                        if (step == 0) {
                            confirmPin = pin
                            pin = ""
                            step = 1
                        } else {
                            if (pin == confirmPin) {
                                if (pinManager.setPin(pin)) {
                                    onPinSet()
                                } else {
                                    errorMessage = "Помилка збереження PIN"
                                    pin = ""
                                    confirmPin = ""
                                    step = 0
                                }
                            } else {
                                errorMessage = "PIN не співпадає"
                                pin = ""
                                confirmPin = ""
                                step = 0
                            }
                        }
                    } else {
                        if (pinManager.verifyPin(pin)) {
                            onPinVerified()
                        } else {
                            errorMessage = "Невірний PIN"
                            pin = ""
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp)
            ) {
                Text(text = if (isSettingPin && step == 1) "Підтвердити" else "Продовжити")
            }
        }
    }
}

