package com.chipzone.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chipzone.security.PinManager
import javax.inject.Inject

@Composable
fun PinScreen(
    pinManager: PinManager,
    onPinVerified: () -> Unit,
    onPinSet: () -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSettingPin by remember { mutableStateOf(!pinManager.isPinSet()) }
    var step by remember { mutableStateOf(0) } // 0 = enter pin, 1 = confirm pin
    
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

