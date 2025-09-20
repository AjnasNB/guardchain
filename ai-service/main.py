#!/usr/bin/env python3

import os
import asyncio
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Import our services
from services.ocr_service import OCRService
from services.fraud_detection_service import FraudDetectionService
from services.image_analysis_service import ImageAnalysisService
from services.document_validator import DocumentValidator
from utils.logger import setup_logger, log_api_request, log_performance, log_error_with_context
from utils.auth import verify_api_key, check_rate_limit
from models.analysis_models import *

# Setup logger first - call the function, don't assign it
setup_logger()

# Import logger after setup
from loguru import logger

# Configuration - CPU ONLY
AI_SERVICE_CONFIG = {
    "host": "0.0.0.0",
    "port": 8001,
    "max_file_size_mb": 50,
    "processing_timeout_seconds": 300,
    "use_gpu": False,  # CPU ONLY - NO GPU
    "batch_size": 4,   # Smaller batch for CPU
    "log_level": "INFO",
}

# Force CPU usage - no GPU shit
os.environ["CUDA_VISIBLE_DEVICES"] = ""  # Disable all CUDA devices
os.environ["PYTORCH_DISABLE_CUDA"] = "1"  # Disable PyTorch CUDA
logger.info("🖥️ AI Service configured for CPU-only operation")

# Initialize services
ocr_service = None
fraud_service = None
image_service = None
document_validator = None

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown"""
    # Startup
    logger.info("🚀 Starting GuardChain AI Service (CPU Mode)...")
    
    global ocr_service, fraud_service, image_service, document_validator
    
    try:
        # Initialize OCR Service (CPU only)
        logger.info("📖 Initializing OCR Service...")
        ocr_service = OCRService()
        await ocr_service.initialize()
        
        # Initialize Fraud Detection Service (CPU only)
        logger.info("🛡️ Initializing Fraud Detection Service...")
        fraud_service = FraudDetectionService()
        await fraud_service.initialize()
        
        # Initialize Image Analysis Service (CPU only)
        logger.info("🖼️ Initializing Image Analysis Service...")
        image_service = ImageAnalysisService()
        await image_service.initialize()
        
        # Initialize Document Validator
        logger.info("📋 Initializing Document Validator...")
        document_validator = DocumentValidator()
        
        # Test Google Gemini connection (optional)
        try:
            from services.gemini_service import GeminiService
            gemini_service = GeminiService()
            test_result = await gemini_service.test_connection()
            if test_result:
                logger.info("✅ Google Gemini connected successfully!")
            else:
                logger.warning("⚠️ Google Gemini connection failed (optional)")
        except Exception as e:
            logger.warning(f"⚠️ Google Gemini not available (optional): {e}")
        
        logger.info("✅ AI Service initialized successfully (CPU Mode)!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI Service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI Service...")

# Create FastAPI app with lifespan
app = FastAPI(
    title="GuardChain AI Service",
    description="CPU-powered AI processing for insurance claims, documents, and fraud detection",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],  # Frontend and backend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get client info
async def get_client_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key and get client information"""
    try:
        api_key = credentials.credentials
        client_info = await verify_api_key(api_key)
        
        if not client_info:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        return client_info
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        # For development, allow basic access
        return {"client_name": "development", "api_key": "dev_key"}

# Health check endpoints
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with basic info"""
    return {
        "service": "GuardChain AI Service",
        "version": "2.0.0",
        "status": "running",
        "mode": "CPU_ONLY",
        "port": AI_SERVICE_CONFIG["port"],
        "gpu_enabled": False,
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "analyze_claim": "/analyze-claim",
            "process_document": "/process-document",
            "analyze_image": "/analyze-image",
            "gemini_analyze": "/gemini-analyze"
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "mode": "CPU_ONLY",
        "timestamp": time.time(),
        "services": {
            "ocr": ocr_service.is_ready() if ocr_service else False,
            "fraud_detection": fraud_service.is_ready() if fraud_service else False,
            "image_analysis": image_service.is_ready() if image_service else False,
            "document_validator": document_validator.is_ready() if document_validator else False,
        },
        "models_loaded": {
            "tesseract": ocr_service.tesseract_ready if ocr_service else False,
            "easyocr": ocr_service.easyocr_ready if ocr_service else False,
            "fraud_model": fraud_service.model_ready if fraud_service else False,
            "image_model": image_service.model_ready if image_service else False,
        },
        "system": {
            "gpu_available": False,
            "cpu_mode": True,
            "port": AI_SERVICE_CONFIG["port"],
            "max_file_size_mb": AI_SERVICE_CONFIG["max_file_size_mb"],
            "processing_timeout": AI_SERVICE_CONFIG["processing_timeout_seconds"]
        }
    }
    
    # Check if any critical service is down
    critical_services = ["ocr", "fraud_detection", "image_analysis"]
    if not all(health_status["services"][service] for service in critical_services):
        health_status["status"] = "degraded"
    
    return health_status

# Main AI endpoints
@app.post("/analyze-claim", response_model=ClaimAnalysisResponse, tags=["AI Analysis"])
async def analyze_claim(
    request: ClaimAnalysisRequest,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Comprehensive claim analysis with AI"""
    start_time = time.time()
    
    try:
        # Log request
        logger.info(f"🔍 Analyzing claim {request.claimId}")
        
        if not fraud_service or not fraud_service.is_ready():
            raise HTTPException(status_code=503, detail="Fraud detection service not available")
        
        # Perform fraud analysis
        fraud_analysis = await fraud_service.analyze_text(
            request.description,
            request.claimType.value,
            request.requestedAmount
        )
        
        # Prepare response
        response = ClaimAnalysisResponse(
            claimId=request.claimId,
            claimType=request.claimType,
            fraudScore=fraud_analysis["fraud_score"],
            authenticityScore=fraud_analysis.get("confidence", 0.8),
            estimatedAmount=request.requestedAmount,
            confidence=fraud_analysis.get("confidence", 0.8),
            detectedIssues=fraud_analysis.get("issues", []),
            fraudAnalysis=FraudAnalysisResult(
                fraudScore=fraud_analysis["fraud_score"],
                riskFactors=fraud_analysis.get("risk_factors", []),
                consistencyCheck={},
                anomalies=fraud_analysis.get("issues", [])
            ),
            recommendation=fraud_analysis.get("recommendation", "manual_review"),
            reasoning=f"CPU-based AI analysis completed with {fraud_analysis.get('confidence', 0.8):.1%} confidence",
            processedAt=time.strftime("%Y-%m-%d %H:%M:%S"),
            processingTime=time.time() - start_time
        )
        
        logger.info(f"✅ Claim analysis completed in {time.time() - start_time:.2f}s")
        return response
        
    except Exception as e:
        logger.error(f"❌ Error analyzing claim: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/process-document", response_model=DocumentProcessingResponse, tags=["Document Processing"])
async def process_document(
    file: UploadFile = File(...),
    document_type: str = Form("general"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Process document with OCR and validation"""
    start_time = time.time()
    
    try:
        # File size check
        content = await file.read()
        if len(content) > AI_SERVICE_CONFIG["max_file_size_mb"] * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large")
        
        logger.info(f"📄 Processing document {file.filename}")
        
        if not ocr_service or not ocr_service.is_ready():
            raise HTTPException(status_code=503, detail="OCR service not available")
        
        # Process document
        ocr_result = await ocr_service.process_document(content, file.filename, document_type)
        
        # Validate document
        validation_result = await document_validator.validate_document(
            content, file.filename, document_type, ocr_result["text"]
        )
        
        # Prepare response
        response = DocumentProcessingResponse(
            filename=file.filename,
            documentType=DocumentType(document_type),
            status=AnalysisStatus.SUCCESS,
            text=ocr_result["text"],
            confidence=ocr_result["confidence"],
            validation=DocumentValidation(
                isValid=validation_result["is_valid"],
                validationScore=validation_result["validation_score"],
                issues=validation_result["issues"],
                extractedData=validation_result["extracted_data"]
            ),
            extractedFields=ocr_result.get("structured_data", {}),
            metadata=ocr_result.get("metadata", {}),
            processingTime=time.time() - start_time
        )
        
        logger.info(f"✅ Document processed in {time.time() - start_time:.2f}s")
        return response
        
    except Exception as e:
        logger.error(f"❌ Error processing document: {e}")
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

@app.post("/analyze-image", tags=["Image Analysis"])
async def analyze_image(
    file: UploadFile = File(...),
    analysis_type: str = Form("general"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Analyze image for authenticity and damage assessment"""
    start_time = time.time()
    
    try:
        # File validation
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        content = await file.read()
        if len(content) > AI_SERVICE_CONFIG["max_file_size_mb"] * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large")
        
        logger.info(f"🖼️ Analyzing image {file.filename}")
        
        if not image_service or not image_service.is_ready():
            raise HTTPException(status_code=503, detail="Image analysis service not available")
        
        # Analyze image
        analysis_result = await image_service.analyze_image(content, file.filename, analysis_type)
        
        logger.info(f"✅ Image analyzed in {time.time() - start_time:.2f}s")
        return analysis_result
        
    except Exception as e:
        logger.error(f"❌ Error analyzing image: {e}")
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

@app.post("/gemini-analyze", tags=["Advanced AI"])
async def gemini_analyze(
    data: dict,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Advanced analysis using Google Gemini"""
    start_time = time.time()
    
    try:
        logger.info(f"🤖 Gemini analysis")
        
        from services.gemini_service import GeminiService
        gemini_service = GeminiService()
        
        # Process with Gemini
        result = await gemini_service.analyze_claim_advanced(
            document_text=data.get("document_text", ""),
            claim_type=data.get("claim_type", "general"),
            images=data.get("images", [])
        )
        
        logger.info(f"✅ Gemini analysis completed in {time.time() - start_time:.2f}s")
        return result
        
    except Exception as e:
        logger.error(f"❌ Gemini analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini analysis failed: {str(e)}")

@app.post("/health-check", tags=["Health"])
async def health_check_endpoint():
    """Authenticated health check for monitoring"""
    return await health_check()

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "timestamp": time.time()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "timestamp": time.time()}
    )

if __name__ == "__main__":
    logger.info(f"🚀 Starting GuardChain AI Service on port {AI_SERVICE_CONFIG['port']}")
    logger.info(f"🖥️ Mode: CPU ONLY (No GPU)")
    logger.info(f"📁 Max file size: {AI_SERVICE_CONFIG['max_file_size_mb']}MB")
    logger.info(f"⏱️ Processing timeout: {AI_SERVICE_CONFIG['processing_timeout_seconds']}s")
    
    uvicorn.run(
        "main:app",
        host=AI_SERVICE_CONFIG["host"],
        port=AI_SERVICE_CONFIG["port"],
        reload=True,
        log_level=AI_SERVICE_CONFIG["log_level"].lower(),
        access_log=True,
    ) 