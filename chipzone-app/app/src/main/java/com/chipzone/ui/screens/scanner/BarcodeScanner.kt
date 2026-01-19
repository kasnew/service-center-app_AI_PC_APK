package com.chipzone.ui.screens.scanner

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.concurrent.Executors

@Composable
fun BarcodeScannerView(
    onBarcodeScanned: (String) -> Unit,
    isActive: Boolean = true,
    scanMode: ScanMode = ScanMode.STANDARD,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }
    
    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }
    
    if (!hasCameraPermission) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Потрібен дозвіл на камеру",
                    style = MaterialTheme.typography.titleMedium
                )
                Button(
                    onClick = { cameraPermissionLauncher.launch(Manifest.permission.CAMERA) }
                ) {
                    Text("Надати дозвіл")
                }
            }
        }
    } else {
        when (scanMode) {
            ScanMode.OCR -> {
                // Use photo capture for OCR
                OcrPhotoCaptureView(
                    onTextRecognized = onBarcodeScanned,
                    onDismiss = { /* Can be handled by parent */ },
                    modifier = modifier
                )
            }
            else -> {
                // Use standard camera preview for barcode scanning
                CameraPreview(
                    onBarcodeScanned = onBarcodeScanned,
                    isActive = isActive,
                    scanMode = scanMode,
                    modifier = modifier
                )
            }
        }
    }
}

@Composable
fun CameraPreview(
    onBarcodeScanned: (String) -> Unit,
    modifier: Modifier = Modifier,
    isActive: Boolean = true,
    scanMode: ScanMode = ScanMode.STANDARD
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }
    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    var imageAnalysis by remember { mutableStateOf<ImageAnalysis?>(null) }
    var cameraProvider by remember { mutableStateOf<ProcessCameraProvider?>(null) }
    
    val executor = remember { Executors.newSingleThreadExecutor() }
    val barcodeScanner = remember {
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(
                Barcode.FORMAT_EAN_13,
                Barcode.FORMAT_EAN_8,
                Barcode.FORMAT_UPC_A,
                Barcode.FORMAT_UPC_E,
                Barcode.FORMAT_CODE_128,
                Barcode.FORMAT_CODE_39,
                Barcode.FORMAT_CODE_93,
                Barcode.FORMAT_CODABAR,
                Barcode.FORMAT_ITF,
                Barcode.FORMAT_QR_CODE,
                Barcode.FORMAT_PDF417,
                Barcode.FORMAT_AZTEC,
                Barcode.FORMAT_DATA_MATRIX
            )
            .enableAllPotentialBarcodes()
            .build()
        BarcodeScanning.getClient(options)
    }
    val textRecognizer = remember {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }
    
    // Stop camera when not active
    LaunchedEffect(isActive) {
        if (!isActive && cameraProvider != null) {
            try {
                cameraProvider?.unbindAll()
                android.util.Log.d("CameraPreview", "Camera stopped")
            } catch (e: Exception) {
                android.util.Log.e("CameraPreview", "Error stopping camera", e)
            }
        }
    }
    
    // Initialize camera when previewView is ready and active
    LaunchedEffect(previewView, isActive) {
        if (previewView != null && isActive) {
            try {
                val provider = cameraProviderFuture.get()
                cameraProvider = provider
                
                val previewUseCase = Preview.Builder()
                    .build()
                
                val imageAnalysisUseCase = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                    .build()
                
                imageAnalysis = imageAnalysisUseCase
                
                imageAnalysisUseCase.setAnalyzer(executor) { imageProxy ->
                    android.util.Log.d("CameraPreview", "Processing image with scanMode: $scanMode")
                    processImageProxy(barcodeScanner, textRecognizer, imageProxy, onBarcodeScanned, scanMode)
                }
                
                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                
                // Set surface provider
                previewView?.let { view ->
                    previewUseCase.setSurfaceProvider(view.surfaceProvider)
                    
                    provider.unbindAll()
                    provider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        previewUseCase,
                        imageAnalysisUseCase
                    )
                    android.util.Log.d("CameraPreview", "Camera bound successfully")
                }
            } catch (e: Exception) {
                android.util.Log.e("CameraPreview", "Camera initialization failed", e)
            }
        }
    }
    
    DisposableEffect(Unit) {
        onDispose {
            try {
                cameraProvider?.unbindAll()
            } catch (e: Exception) {
                android.util.Log.e("CameraPreview", "Error unbinding camera", e)
            }
            barcodeScanner.close()
            textRecognizer.close()
            executor.shutdown()
        }
    }
    
    AndroidView(
        factory = { ctx ->
            PreviewView(ctx).also {
                previewView = it
                android.util.Log.d("CameraPreview", "PreviewView created")
            }
        },
        modifier = modifier.fillMaxSize()
    )
}

// Stability tracking for barcode scanning
private var stableBarcode: String? = null
private var stableBarcodeCount: Int = 0
private var lastScannedBarcode: String? = null
private var lastScanTime: Long = 0
private const val STABLE_SCAN_COUNT = 3 // Need 3 consecutive scans of the same barcode
private const val SCAN_TIMEOUT_MS = 1000L // Reset if no scan for 1 second

// OCR fallback tracking
private var noBarcodeFrameCount = 0
private const val OCR_FALLBACK_FRAMES = 10 // Try OCR after 10 frames without barcode
private var lastOcrTime: Long = 0
private const val OCR_COOLDOWN_MS = 500L // Don't run OCR too frequently

private fun processImageProxy(
    barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    textRecognizer: TextRecognizer,
    imageProxy: ImageProxy,
    onBarcodeScanned: (String) -> Unit,
    scanMode: ScanMode
) {
    val mediaImage = imageProxy.image
    if (mediaImage != null) {
        val image = InputImage.fromMediaImage(
            mediaImage,
            imageProxy.imageInfo.rotationDegrees
        )
        
        when (scanMode) {
            ScanMode.STANDARD -> {
                // Тільки стандартне сканування штрих-кодів
                processBarcodeOnly(barcodeScanner, image, imageProxy, onBarcodeScanned)
            }
            ScanMode.OCR -> {
                // Тільки OCR розпізнавання
                processOcrOnly(textRecognizer, image, imageProxy, onBarcodeScanned)
            }
            ScanMode.GALLERY -> {
                // Gallery mode is handled separately in ScannerScreen
                // This should not be reached, but handle it gracefully
                imageProxy.close()
            }
            else -> {
                // Fallback for any other mode
                imageProxy.close()
            }
        }
    } else {
        imageProxy.close()
    }
}

private fun processBarcodeOnly(
    barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    image: InputImage,
    imageProxy: ImageProxy,
    onBarcodeScanned: (String) -> Unit
) {
    barcodeScanner.process(image)
        .addOnSuccessListener { barcodes ->
            val currentTime = System.currentTimeMillis()
            
            // Reset stability if too much time passed
            if (currentTime - lastScanTime > SCAN_TIMEOUT_MS) {
                stableBarcode = null
                stableBarcodeCount = 0
            }
            
            for (barcode in barcodes) {
                barcode.rawValue?.let { value ->
                    val trimmedValue = value.trim()
                    if (trimmedValue.isNotEmpty() && trimmedValue.length >= 3) {
                        if (trimmedValue == stableBarcode) {
                            stableBarcodeCount++
                            if (stableBarcodeCount >= STABLE_SCAN_COUNT) {
                                android.util.Log.d("BarcodeScanner", "Stable barcode confirmed: $trimmedValue")
                                stableBarcode = null
                                stableBarcodeCount = 0
                                lastScannedBarcode = trimmedValue
                                lastScanTime = currentTime
                                onBarcodeScanned(trimmedValue)
                            }
                        } else {
                            stableBarcode = trimmedValue
                            stableBarcodeCount = 1
                        }
                        lastScanTime = currentTime
                    }
                }
            }
            imageProxy.close()
        }
        .addOnFailureListener { e ->
            android.util.Log.e("BarcodeScanner", "Barcode scanning failed: ${e.message}", e)
            imageProxy.close()
        }
}

private fun processOcrOnly(
    textRecognizer: TextRecognizer,
    image: InputImage,
    imageProxy: ImageProxy,
    onBarcodeScanned: (String) -> Unit
) {
    val currentTime = System.currentTimeMillis()
    
    // Reset stability if too much time passed
    if (currentTime - lastScanTime > SCAN_TIMEOUT_MS) {
        stableBarcode = null
        stableBarcodeCount = 0
    }
    
    if (currentTime - lastOcrTime > OCR_COOLDOWN_MS) {
        lastOcrTime = currentTime
        // Close imageProxy after OCR processing completes
        tryOcrTextRecognition(textRecognizer, image, imageProxy, onBarcodeScanned)
    } else {
        // If cooldown is active, close immediately
        imageProxy.close()
    }
}

/**
 * Try to recognize text using OCR, focusing on alphanumeric codes that might be below barcodes
 */
private fun tryOcrTextRecognition(
    textRecognizer: TextRecognizer,
    image: InputImage,
    imageProxy: ImageProxy,
    onBarcodeScanned: (String) -> Unit
) {
    android.util.Log.d("BarcodeScanner", "Starting OCR text recognition")
    textRecognizer.process(image)
        .addOnSuccessListener { visionText ->
            // Close imageProxy after processing
            imageProxy.close()
            
            // Look for alphanumeric codes that could be product codes
            // Typically these are below barcodes and contain letters and numbers
            val recognizedText = visionText.text
            android.util.Log.d("BarcodeScanner", "OCR recognized text: $recognizedText")
            
            // Extract potential codes (alphanumeric strings, typically 8+ characters)
            val potentialCodes = extractPotentialCodes(recognizedText)
            android.util.Log.d("BarcodeScanner", "Extracted potential codes: $potentialCodes")
            
            if (potentialCodes.isNotEmpty()) {
                // Use the longest/most likely code (usually the one below barcode)
                val bestCode = potentialCodes.maxByOrNull { it.length } ?: return@addOnSuccessListener
                
                android.util.Log.d("BarcodeScanner", "OCR found potential code: $bestCode")
                
                // Check if this is a stable OCR result
                if (bestCode == stableBarcode) {
                    stableBarcodeCount++
                    android.util.Log.d("BarcodeScanner", "Stable OCR count: $stableBarcodeCount/$STABLE_SCAN_COUNT")
                    if (stableBarcodeCount >= STABLE_SCAN_COUNT) {
                        android.util.Log.d("BarcodeScanner", "Stable OCR code confirmed: $bestCode")
                        stableBarcode = null
                        stableBarcodeCount = 0
                        lastScannedBarcode = bestCode
                        lastScanTime = System.currentTimeMillis()
                        onBarcodeScanned(bestCode)
                    }
                } else {
                    stableBarcode = bestCode
                    stableBarcodeCount = 1
                    android.util.Log.d("BarcodeScanner", "New OCR code detected: $bestCode (count: 1)")
                }
            } else {
                android.util.Log.d("BarcodeScanner", "No potential codes found in OCR text")
            }
        }
        .addOnFailureListener { e ->
            // Close imageProxy even on failure
            imageProxy.close()
            android.util.Log.e("BarcodeScanner", "OCR failed: ${e.message}", e)
        }
}

/**
 * Extract potential product codes from recognized text
 * Looks for alphanumeric strings that could be codes (typically 8+ characters)
 */
private fun extractPotentialCodes(text: String): List<String> {
    val codes = mutableListOf<String>()
    
    // Pattern: alphanumeric strings with at least 8 characters
    // May contain letters and numbers, typically no spaces or special chars in the middle
    val pattern = Regex("[A-Z0-9]{8,}")
    
    pattern.findAll(text.uppercase()).forEach { match ->
        val code = match.value.trim()
        // Filter out codes that are too short or look like dates/numbers only
        if (code.length >= 8 && !code.matches(Regex("^\\d+$"))) {
            codes.add(code)
        }
    }
    
    // Also check text blocks (lines) that might contain codes
    val lines = text.lines()
    for (line in lines) {
        val trimmedLine = line.trim().uppercase()
        // Look for lines that are mostly alphanumeric and reasonably long
        if (trimmedLine.length >= 8 && 
            trimmedLine.matches(Regex("^[A-Z0-9\\s-]{8,}$")) &&
            trimmedLine.count { it.isLetterOrDigit() } >= 8) {
            // Remove spaces and hyphens to get the code
            val cleanCode = trimmedLine.replace(Regex("[\\s-]+"), "")
            if (cleanCode.length >= 8 && !cleanCode.matches(Regex("^\\d+$"))) {
                codes.add(cleanCode)
            }
        }
    }
    
    return codes.distinct()
}


