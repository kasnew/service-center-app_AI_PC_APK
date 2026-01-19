package com.chipzone.ui.screens.scanner

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun OcrPhotoCaptureView(
    onTextRecognized: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    
    var capturedImageUri by remember { mutableStateOf<Uri?>(null) }
    var selectedRect by remember { mutableStateOf<Rect?>(null) }
    var isProcessing by remember { mutableStateOf(false) }
    var recognizedText by remember { mutableStateOf<String?>(null) }
    
    val textRecognizer = remember {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }
    
    val imageCapture = remember { ImageCapture.Builder().build() }
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }
    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    var cameraProvider by remember { mutableStateOf<ProcessCameraProvider?>(null) }
    
    // Create file for photo
    val photoFile = remember {
        File(context.cacheDir, "ocr_photo_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.jpg")
    }
    val photoUri = remember {
        FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            photoFile
        )
    }
    
    // Initialize camera
    LaunchedEffect(previewView) {
        if (previewView != null && capturedImageUri == null) {
            try {
                val provider = cameraProviderFuture.get()
                cameraProvider = provider
                
                val preview = Preview.Builder().build()
                preview.setSurfaceProvider(previewView!!.surfaceProvider)
                
                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                
                provider.unbindAll()
                provider.bindToLifecycle(
                    lifecycleOwner,
                    cameraSelector,
                    preview,
                    imageCapture
                )
            } catch (e: Exception) {
                android.util.Log.e("OcrPhotoCapture", "Camera initialization failed", e)
            }
        }
    }
    
    // Cleanup
    DisposableEffect(Unit) {
        onDispose {
            try {
                cameraProvider?.unbindAll()
            } catch (e: Exception) {
                android.util.Log.e("OcrPhotoCapture", "Error unbinding camera", e)
            }
            textRecognizer.close()
        }
    }
    
    Column(
        modifier = modifier.fillMaxSize()
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
                text = "OCR розпізнавання",
                style = MaterialTheme.typography.titleLarge
            )
            IconButton(onClick = onDismiss) {
                Icon(Icons.Default.Close, contentDescription = "Закрити")
            }
        }
        
        if (capturedImageUri == null) {
            // Camera preview
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                AndroidView(
                    factory = { ctx ->
                        PreviewView(ctx).also {
                            previewView = it
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )
                
                // Capture button
                FloatingActionButton(
                    onClick = {
                        scope.launch {
                            try {
                                val outputFileOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
                                imageCapture.takePicture(
                                    outputFileOptions,
                                    ContextCompat.getMainExecutor(context),
                                    object : ImageCapture.OnImageSavedCallback {
                                        override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                            capturedImageUri = photoUri
                                        }
                                        
                                        override fun onError(exception: ImageCaptureException) {
                                            android.util.Log.e("OcrPhotoCapture", "Photo capture failed", exception)
                                        }
                                    }
                                )
                            } catch (e: Exception) {
                                android.util.Log.e("OcrPhotoCapture", "Error taking photo", e)
                            }
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(32.dp)
                ) {
                    Icon(Icons.Default.Camera, contentDescription = "Зробити фото")
                }
            }
        } else {
            // Show captured image with selection
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                // Load and display image
                var bitmap by remember(capturedImageUri) { mutableStateOf<Bitmap?>(null) }
                
                LaunchedEffect(capturedImageUri) {
                    capturedImageUri?.let { uri ->
                        withContext(Dispatchers.IO) {
                            context.contentResolver.openInputStream(uri)?.use { input ->
                                bitmap = BitmapFactory.decodeStream(input)
                            }
                        }
                    }
                }
                
                bitmap?.let { bmp ->
                    var imageDisplaySize by remember { mutableStateOf<Size?>(null) }
                    var imageOffset by remember { mutableStateOf<Offset?>(null) }
                    var startDrag by remember { mutableStateOf<Offset?>(null) }
                    var currentRect by remember { mutableStateOf<Rect?>(null) }
                    var isDraggingEdge by remember { mutableStateOf<String?>(null) } // "top", "bottom", "left", "right"
                    val imageBitmap = remember(bmp) { bmp.asImageBitmap() }
                    
                    // Calculate actual displayed image size with ContentScale.Fit
                    val bitmapAspect = bmp.width.toFloat() / bmp.height.toFloat()
                    
                    // Initialize default selection rectangle (horizontal bar at bottom 20% of image)
                    LaunchedEffect(imageDisplaySize, imageOffset, bmp) {
                        if (imageDisplaySize != null && imageOffset != null && selectedRect == null) {
                            val imgSize = imageDisplaySize!!
                            
                            // Default: horizontal bar covering bottom 20% of image, with 10% margins on sides
                            val marginX = imgSize.width * 0.1f
                            val height = imgSize.height * 0.2f
                            val top = imgSize.height * 0.8f
                            
                            selectedRect = Rect(
                                offset = Offset(marginX, top),
                                size = Size(imgSize.width - 2 * marginX, height)
                            )
                            android.util.Log.d("OcrPhotoCapture", "Initialized default selection: $selectedRect")
                        }
                    }
                    
                    Box(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Image(
                            bitmap = imageBitmap,
                            contentDescription = "Зняте фото",
                            modifier = Modifier
                                .fillMaxSize()
                                .onGloballyPositioned { coordinates ->
                                    val containerWidth = coordinates.size.width.toFloat()
                                    val containerHeight = coordinates.size.height.toFloat()
                                    val containerAspect = containerWidth / containerHeight
                                    
                                    val (displayWidth, displayHeight) = if (bitmapAspect > containerAspect) {
                                        // Image is wider - fit to width
                                        Pair(containerWidth, containerWidth / bitmapAspect)
                                    } else {
                                        // Image is taller - fit to height
                                        Pair(containerHeight * bitmapAspect, containerHeight)
                                    }
                                    
                                    imageDisplaySize = Size(displayWidth, displayHeight)
                                    imageOffset = Offset(
                                        (containerWidth - displayWidth) / 2f,
                                        (containerHeight - displayHeight) / 2f
                                    )
                                },
                            contentScale = ContentScale.Fit
                        )
                        
                        // Selection overlay with edge dragging
                        Canvas(
                            modifier = Modifier
                                .fillMaxSize()
                                .pointerInput(selectedRect, imageDisplaySize, imageOffset) {
                                    detectDragGestures(
                                        onDragStart = { offset ->
                                            imageDisplaySize?.let { imgSize ->
                                                imageOffset?.let { imgOffset ->
                                                    // Check if dragging edge of existing selection
                                                    selectedRect?.let { rect ->
                                                        val displayRect = Rect(
                                                            offset = Offset(rect.left + imgOffset.x, rect.top + imgOffset.y),
                                                            size = rect.size
                                                        )
                                                        
                                                        val edgeThreshold = 30f // pixels
                                                        val isNearLeft = kotlin.math.abs(offset.x - displayRect.left) < edgeThreshold
                                                        val isNearRight = kotlin.math.abs(offset.x - displayRect.right) < edgeThreshold
                                                        val isNearTop = kotlin.math.abs(offset.y - displayRect.top) < edgeThreshold
                                                        val isNearBottom = kotlin.math.abs(offset.y - displayRect.bottom) < edgeThreshold
                                                        
                                                        when {
                                                            isNearLeft && offset.y >= displayRect.top && offset.y <= displayRect.bottom -> {
                                                                isDraggingEdge = "left"
                                                                startDrag = offset
                                                            }
                                                            isNearRight && offset.y >= displayRect.top && offset.y <= displayRect.bottom -> {
                                                                isDraggingEdge = "right"
                                                                startDrag = offset
                                                            }
                                                            isNearTop && offset.x >= displayRect.left && offset.x <= displayRect.right -> {
                                                                isDraggingEdge = "top"
                                                                startDrag = offset
                                                            }
                                                            isNearBottom && offset.x >= displayRect.left && offset.x <= displayRect.right -> {
                                                                isDraggingEdge = "bottom"
                                                                startDrag = offset
                                                            }
                                                            offset.x >= displayRect.left && offset.x <= displayRect.right &&
                                                            offset.y >= displayRect.top && offset.y <= displayRect.bottom -> {
                                                                // Dragging entire rectangle
                                                                isDraggingEdge = "move"
                                                                startDrag = offset
                                                            }
                                                            else -> {
                                                                // New selection
                                                                isDraggingEdge = null
                                                                startDrag = offset
                                                                currentRect = null
                                                            }
                                                        }
                                                    } ?: run {
                                                        // No existing selection, start new one
                                                        if (offset.x >= imgOffset.x && offset.x <= imgOffset.x + imgSize.width &&
                                                            offset.y >= imgOffset.y && offset.y <= imgOffset.y + imgSize.height) {
                                                            isDraggingEdge = null
                                                            startDrag = offset
                                                            currentRect = null
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        onDrag = { change, _ ->
                                            startDrag?.let { start ->
                                                val end = change.position
                                                imageDisplaySize?.let { imgSize ->
                                                    imageOffset?.let { imgOffset ->
                                                        selectedRect?.let { existingRect ->
                                                            val displayRect = Rect(
                                                                offset = Offset(existingRect.left + imgOffset.x, existingRect.top + imgOffset.y),
                                                                size = existingRect.size
                                                            )
                                                            
                                                            when (isDraggingEdge) {
                                                                "left" -> {
                                                                    val newLeft = end.x.coerceIn(imgOffset.x, displayRect.right - 20f)
                                                                    selectedRect = Rect(
                                                                        offset = Offset(newLeft - imgOffset.x, existingRect.top),
                                                                        size = Size(displayRect.right - newLeft, existingRect.height)
                                                                    )
                                                                }
                                                                "right" -> {
                                                                    val newRight = end.x.coerceIn(displayRect.left + 20f, imgOffset.x + imgSize.width)
                                                                    selectedRect = Rect(
                                                                        offset = existingRect.topLeft,
                                                                        size = Size(newRight - displayRect.left, existingRect.height)
                                                                    )
                                                                }
                                                                "top" -> {
                                                                    val newTop = end.y.coerceIn(imgOffset.y, displayRect.bottom - 20f)
                                                                    selectedRect = Rect(
                                                                        offset = Offset(existingRect.left, newTop - imgOffset.y),
                                                                        size = Size(existingRect.width, displayRect.bottom - newTop)
                                                                    )
                                                                }
                                                                "bottom" -> {
                                                                    val newBottom = end.y.coerceIn(displayRect.top + 20f, imgOffset.y + imgSize.height)
                                                                    selectedRect = Rect(
                                                                        offset = existingRect.topLeft,
                                                                        size = Size(existingRect.width, newBottom - displayRect.top)
                                                                    )
                                                                }
                                                                "move" -> {
                                                                    val deltaX = end.x - start.x
                                                                    val deltaY = end.y - start.y
                                                                    val newLeft = (displayRect.left + deltaX).coerceIn(
                                                                        imgOffset.x, imgOffset.x + imgSize.width - existingRect.width
                                                                    )
                                                                    val newTop = (displayRect.top + deltaY).coerceIn(
                                                                        imgOffset.y, imgOffset.y + imgSize.height - existingRect.height
                                                                    )
                                                                    selectedRect = Rect(
                                                                        offset = Offset(newLeft - imgOffset.x, newTop - imgOffset.y),
                                                                        size = existingRect.size
                                                                    )
                                                                    startDrag = end
                                                                }
                                                                else -> {
                                                                    // New selection
                                                                    val clampedStart = Offset(
                                                                        start.x.coerceIn(imgOffset.x, imgOffset.x + imgSize.width),
                                                                        start.y.coerceIn(imgOffset.y, imgOffset.y + imgSize.height)
                                                                    )
                                                                    val clampedEnd = Offset(
                                                                        end.x.coerceIn(imgOffset.x, imgOffset.x + imgSize.width),
                                                                        end.y.coerceIn(imgOffset.y, imgOffset.y + imgSize.height)
                                                                    )
                                                                    
                                                                    currentRect = Rect(
                                                                        offset = Offset(
                                                                            minOf(clampedStart.x, clampedEnd.x),
                                                                            minOf(clampedStart.y, clampedEnd.y)
                                                                        ),
                                                                        size = Size(
                                                                            kotlin.math.abs(clampedEnd.x - clampedStart.x),
                                                                            kotlin.math.abs(clampedEnd.y - clampedStart.y)
                                                                        )
                                                                    )
                                                                }
                                                            }
                                                        } ?: run {
                                                            // No existing selection, create new one
                                                            val clampedStart = Offset(
                                                                start.x.coerceIn(imgOffset.x, imgOffset.x + imgSize.width),
                                                                start.y.coerceIn(imgOffset.y, imgOffset.y + imgSize.height)
                                                            )
                                                            val clampedEnd = Offset(
                                                                end.x.coerceIn(imgOffset.x, imgOffset.x + imgSize.width),
                                                                end.y.coerceIn(imgOffset.y, imgOffset.y + imgSize.height)
                                                            )
                                                            
                                                            currentRect = Rect(
                                                                offset = Offset(
                                                                    minOf(clampedStart.x, clampedEnd.x),
                                                                    minOf(clampedStart.y, clampedEnd.y)
                                                                ),
                                                                size = Size(
                                                                    kotlin.math.abs(clampedEnd.x - clampedStart.x),
                                                                    kotlin.math.abs(clampedEnd.y - clampedStart.y)
                                                                )
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        onDragEnd = {
                                            when (isDraggingEdge) {
                                                "move" -> {
                                                    // Already updated selectedRect during drag
                                                }
                                                else -> {
                                                    currentRect?.let { rect ->
                                                        imageOffset?.let { imgOffset ->
                                                            selectedRect = Rect(
                                                                offset = Offset(
                                                                    rect.left - imgOffset.x,
                                                                    rect.top - imgOffset.y
                                                                ),
                                                                size = rect.size
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                            isDraggingEdge = null
                                            startDrag = null
                                            currentRect = null
                                        }
                                    )
                                }
                        ) {
                            // Draw selection rectangle
                            imageOffset?.let { imgOffset ->
                                currentRect?.let { rect ->
                                    drawRect(
                                        color = Color.Blue.copy(alpha = 0.3f),
                                        topLeft = rect.topLeft,
                                        size = rect.size
                                    )
                                    drawRect(
                                        color = Color.Blue,
                                        topLeft = rect.topLeft,
                                        size = rect.size,
                                        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f)
                                    )
                                }
                                
                                selectedRect?.let { rect ->
                                    val displayRect = Rect(
                                        offset = Offset(rect.left + imgOffset.x, rect.top + imgOffset.y),
                                        size = rect.size
                                    )
                                    drawRect(
                                        color = Color.Green.copy(alpha = 0.3f),
                                        topLeft = displayRect.topLeft,
                                        size = displayRect.size
                                    )
                                    drawRect(
                                        color = Color.Green,
                                        topLeft = displayRect.topLeft,
                                        size = displayRect.size,
                                        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f)
                                    )
                                    
                                    // Draw edge handles
                                    val handleSize = 20f
                                    val handleColor = Color.Yellow
                                    
                                    // Left edge
                                    drawRect(
                                        color = handleColor,
                                        topLeft = Offset(displayRect.left - handleSize/2, displayRect.top + displayRect.height/2 - handleSize/2),
                                        size = Size(handleSize, handleSize)
                                    )
                                    // Right edge
                                    drawRect(
                                        color = handleColor,
                                        topLeft = Offset(displayRect.right - handleSize/2, displayRect.top + displayRect.height/2 - handleSize/2),
                                        size = Size(handleSize, handleSize)
                                    )
                                    // Top edge
                                    drawRect(
                                        color = handleColor,
                                        topLeft = Offset(displayRect.left + displayRect.width/2 - handleSize/2, displayRect.top - handleSize/2),
                                        size = Size(handleSize, handleSize)
                                    )
                                    // Bottom edge
                                    drawRect(
                                        color = handleColor,
                                        topLeft = Offset(displayRect.left + displayRect.width/2 - handleSize/2, displayRect.bottom - handleSize/2),
                                        size = Size(handleSize, handleSize)
                                    )
                                }
                            }
                        }
                    }
                    
                    // Instructions
                    Card(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)
                        )
                    ) {
                        Text(
                            text = if (selectedRect == null) 
                                "Виберіть область з текстом" 
                            else 
                                "Натисніть 'Розпізнати' для обробки",
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    
                    // Action buttons
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(16.dp)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Button(
                            onClick = {
                                capturedImageUri = null
                                selectedRect = null
                                recognizedText = null
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Повторно")
                        }
                        
                        Button(
                            onClick = {
                                if (selectedRect != null) {
                                    isProcessing = true
                                    scope.launch {
                                        imageDisplaySize?.let { displaySize ->
                                            recognizeTextFromRegion(
                                                bitmap = bmp,
                                                rect = selectedRect!!,
                                                displaySize = displaySize,
                                                textRecognizer = textRecognizer,
                                                onResult = { text ->
                                                    recognizedText = text
                                                    isProcessing = false
                                                }
                                            )
                                        } ?: run {
                                            android.util.Log.e("OcrPhotoCapture", "Image display size not available")
                                            isProcessing = false
                                        }
                                    }
                                }
                            },
                            enabled = selectedRect != null && !isProcessing,
                            modifier = Modifier.weight(1f)
                        ) {
                            if (isProcessing) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Icon(Icons.Default.TextFields, contentDescription = null)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Розпізнати")
                        }
                    }
                }
            }
        }
        
        // Show recognized text
        recognizedText?.let { text ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Розпізнаний текст:",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = text,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                if (text.isNotEmpty() && text.isNotBlank()) {
                                    onTextRecognized(text.trim())
                                }
                            },
                            enabled = text.isNotEmpty() && text.isNotBlank(),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Використати")
                        }
                        OutlinedButton(
                            onClick = {
                                recognizedText = null
                                selectedRect = null
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Скасувати")
                        }
                    }
                }
            }
        }
    }
}

private suspend fun recognizeTextFromRegion(
    bitmap: Bitmap,
    rect: Rect,
    displaySize: Size,
    textRecognizer: TextRecognizer,
    onResult: (String) -> Unit
) = withContext(Dispatchers.IO) {
    try {
        android.util.Log.d("OcrPhotoCapture", "Recognizing text from region")
        android.util.Log.d("OcrPhotoCapture", "Bitmap size: ${bitmap.width}x${bitmap.height}")
        android.util.Log.d("OcrPhotoCapture", "Display size: ${displaySize.width}x${displaySize.height}")
        android.util.Log.d("OcrPhotoCapture", "Selected rect: ${rect.left}, ${rect.top}, ${rect.width}, ${rect.height}")
        
        // Calculate scale factors from display size to bitmap size
        val scaleX = bitmap.width / displaySize.width
        val scaleY = bitmap.height / displaySize.height
        
        android.util.Log.d("OcrPhotoCapture", "Scale factors: scaleX=$scaleX, scaleY=$scaleY")
        
        // Convert display coordinates to bitmap coordinates
        val left = (rect.left * scaleX).toInt().coerceAtLeast(0).coerceAtMost(bitmap.width - 1)
        val top = (rect.top * scaleY).toInt().coerceAtLeast(0).coerceAtMost(bitmap.height - 1)
        val right = (rect.right * scaleX).toInt().coerceAtLeast(left + 1).coerceAtMost(bitmap.width)
        val bottom = (rect.bottom * scaleY).toInt().coerceAtLeast(top + 1).coerceAtMost(bitmap.height)
        
        val width = right - left
        val height = bottom - top
        
        android.util.Log.d("OcrPhotoCapture", "Crop coordinates: left=$left, top=$top, width=$width, height=$height")
        
        if (width <= 0 || height <= 0) {
            android.util.Log.e("OcrPhotoCapture", "Invalid crop dimensions")
            onResult("")
            return@withContext
        }
        
        val croppedBitmap = Bitmap.createBitmap(bitmap, left, top, width, height)
        
        android.util.Log.d("OcrPhotoCapture", "Cropped bitmap size: ${croppedBitmap.width}x${croppedBitmap.height}")
        
        val image = InputImage.fromBitmap(croppedBitmap, 0)
        
        textRecognizer.process(image)
            .addOnSuccessListener { visionText ->
                android.util.Log.d("OcrPhotoCapture", "OCR success, recognized text: ${visionText.text}")
                val recognizedText = visionText.text
                val extractedCodes = extractPotentialCodes(recognizedText)
                val result = extractedCodes.firstOrNull() ?: recognizedText.trim()
                android.util.Log.d("OcrPhotoCapture", "Final result: $result")
                onResult(result)
            }
            .addOnFailureListener { e ->
                android.util.Log.e("OcrPhotoCapture", "OCR failed: ${e.message}", e)
                onResult("")
            }
    } catch (e: Exception) {
        android.util.Log.e("OcrPhotoCapture", "Error processing image: ${e.message}", e)
        onResult("")
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

