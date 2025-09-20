from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum

class ClaimType(str, Enum):
    HEALTH = "health"
    VEHICLE = "vehicle"
    TRAVEL = "travel"
    PRODUCT_WARRANTY = "product_warranty"
    PET = "pet"
    AGRICULTURAL = "agricultural"

class DocumentType(str, Enum):
    MEDICAL_BILL = "medical_bill"
    PRESCRIPTION = "prescription"
    HOSPITAL_REPORT = "hospital_report"
    VEHICLE_ESTIMATE = "vehicle_estimate"
    POLICE_REPORT = "police_report"
    INVOICE = "invoice"
    RECEIPT = "receipt"
    PHOTO_ID = "photo_id"
    INSURANCE_CARD = "insurance_card"
    GENERAL = "general"

class AnalysisStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"

# Request Models
class ClaimAnalysisRequest(BaseModel):
    claimId: str = Field(..., description="Unique claim identifier")
    claimType: ClaimType = Field(..., description="Type of insurance claim")
    requestedAmount: float = Field(..., ge=0, description="Amount requested by claimant")
    description: str = Field(..., min_length=10, description="Claim description")
    documents: Optional[List[str]] = Field(None, description="List of document IPFS hashes")
    images: Optional[List[str]] = Field(None, description="List of image IPFS hashes")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional claim metadata")

class DocumentProcessingRequest(BaseModel):
    documentHash: str = Field(..., description="IPFS hash of document")
    documentType: DocumentType = Field(DocumentType.GENERAL, description="Type of document")
    expectedFields: Optional[List[str]] = Field(None, description="Expected fields to extract")

class HealthAnalysisRequest(BaseModel):
    claimId: str
    patientName: str
    dateOfService: str
    hospitalName: Optional[str] = None
    doctorName: Optional[str] = None
    diagnosis: Optional[str] = None
    treatmentType: Optional[str] = None
    documents: List[str]  # IPFS hashes
    images: Optional[List[str]] = None

class VehicleAnalysisRequest(BaseModel):
    claimId: str
    vehicleVin: Optional[str] = None
    accidentDate: str
    accidentLocation: Optional[str] = None
    policeReportNumber: Optional[str] = None
    documents: List[str]  # IPFS hashes
    images: List[str]  # IPFS hashes of damage photos

# Response Models
class OCRResult(BaseModel):
    text: str = Field(..., description="Extracted text content")
    confidence: float = Field(..., ge=0, le=1, description="OCR confidence score")
    boundingBoxes: Optional[List[Dict[str, Any]]] = Field(None, description="Text bounding boxes")
    detectedFields: Optional[Dict[str, str]] = Field(None, description="Detected structured fields")

class DocumentValidation(BaseModel):
    isValid: bool = Field(..., description="Document validation status")
    validationScore: float = Field(..., ge=0, le=1, description="Validation confidence")
    issues: List[str] = Field(default_factory=list, description="Validation issues found")
    extractedData: Optional[Dict[str, Any]] = Field(None, description="Extracted structured data")

class ImageAnalysisResult(BaseModel):
    authenticityScore: float = Field(..., ge=0, le=1, description="Image authenticity score")
    damageAssessment: Optional[str] = Field(None, description="Damage assessment for vehicle/property")
    estimatedCost: Optional[float] = Field(None, ge=0, description="Estimated repair/replacement cost")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Image metadata")
    detectedObjects: Optional[List[str]] = Field(None, description="Objects detected in image")

class FraudAnalysisResult(BaseModel):
    fraudScore: float = Field(..., ge=0, le=1, description="Fraud probability score")
    riskFactors: List[str] = Field(default_factory=list, description="Identified risk factors")
    consistencyCheck: Dict[str, bool] = Field(default_factory=dict, description="Data consistency checks")
    anomalies: List[str] = Field(default_factory=list, description="Detected anomalies")

class ClaimAnalysisResponse(BaseModel):
    claimId: str = Field(..., description="Claim identifier")
    claimType: ClaimType = Field(..., description="Type of claim")
    status: AnalysisStatus = Field(AnalysisStatus.SUCCESS, description="Analysis status")
    
    # Core analysis results
    fraudScore: float = Field(..., ge=0, le=1, description="Overall fraud probability")
    authenticityScore: float = Field(..., ge=0, le=1, description="Document/image authenticity")
    estimatedAmount: float = Field(..., ge=0, description="AI-estimated claim amount")
    confidence: float = Field(..., ge=0, le=1, description="Overall analysis confidence")
    
    # Detailed results
    detectedIssues: List[str] = Field(default_factory=list, description="Issues found during analysis")
    ocrResults: Dict[str, OCRResult] = Field(default_factory=dict, description="OCR results by document")
    imageAnalysis: Dict[str, ImageAnalysisResult] = Field(default_factory=dict, description="Image analysis results")
    documentValidation: Dict[str, DocumentValidation] = Field(default_factory=dict, description="Document validation results")
    fraudAnalysis: Optional[FraudAnalysisResult] = Field(None, description="Detailed fraud analysis")
    
    # Recommendations
    recommendation: str = Field(..., description="AI recommendation: approve, reject, or review")
    reasoning: Optional[str] = Field(None, description="Explanation for the recommendation")
    requiredActions: Optional[List[str]] = Field(None, description="Required actions before approval")
    
    # Processing metadata
    processedAt: Optional[str] = Field(None, description="Analysis timestamp")
    processingTime: Optional[float] = Field(None, description="Processing time in seconds")

class DocumentProcessingResponse(BaseModel):
    filename: str = Field(..., description="Original filename")
    documentType: DocumentType = Field(..., description="Document type")
    status: AnalysisStatus = Field(..., description="Processing status")
    
    # OCR results
    text: str = Field(..., description="Extracted text")
    confidence: float = Field(..., ge=0, le=1, description="OCR confidence")
    
    # Validation results
    validation: DocumentValidation = Field(..., description="Validation results")
    
    # Extracted data
    extractedFields: Optional[Dict[str, str]] = Field(None, description="Extracted structured fields")
    detectedAmounts: Optional[List[float]] = Field(None, description="Monetary amounts found")
    detectedDates: Optional[List[str]] = Field(None, description="Dates found in document")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Processing metadata")
    processingTime: float = Field(..., description="Processing time in seconds")

class BatchProcessingResponse(BaseModel):
    totalDocuments: int = Field(..., description="Total documents processed")
    successfullyProcessed: int = Field(..., description="Successfully processed count")
    failed: int = Field(..., description="Failed processing count")
    results: List[DocumentProcessingResponse] = Field(..., description="Individual processing results")
    totalProcessingTime: float = Field(..., description="Total processing time")

class HealthClaimAnalysis(BaseModel):
    medicalValidity: float = Field(..., ge=0, le=1, description="Medical validity score")
    treatmentAppropriate: bool = Field(..., description="Treatment appropriateness")
    costReasonableness: float = Field(..., ge=0, le=1, description="Cost reasonableness score")
    preExistingCondition: Optional[bool] = Field(None, description="Pre-existing condition indicator")
    diagnosisConsistency: float = Field(..., ge=0, le=1, description="Diagnosis consistency score")

class VehicleClaimAnalysis(BaseModel):
    damageConsistency: float = Field(..., ge=0, le=1, description="Damage consistency score")
    accidentPlausibility: float = Field(..., ge=0, le=1, description="Accident plausibility")
    repairEstimateValidity: float = Field(..., ge=0, le=1, description="Repair estimate validity")
    vehicleValueCheck: Optional[float] = Field(None, description="Vehicle value assessment")
    priorDamageDetected: Optional[bool] = Field(None, description="Prior damage indicator")

class APIError(BaseModel):
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: str = Field(..., description="Error timestamp")

# Specialized analysis models
class MedicalBillAnalysis(BaseModel):
    totalAmount: Optional[float] = Field(None, description="Total bill amount")
    patientName: Optional[str] = Field(None, description="Patient name")
    serviceDate: Optional[str] = Field(None, description="Service date")
    provider: Optional[str] = Field(None, description="Healthcare provider")
    diagnosisCodes: Optional[List[str]] = Field(None, description="ICD-10 diagnosis codes")
    procedureCodes: Optional[List[str]] = Field(None, description="CPT procedure codes")
    insuranceInfo: Optional[Dict[str, str]] = Field(None, description="Insurance information")

class VehicleEstimateAnalysis(BaseModel):
    totalEstimate: Optional[float] = Field(None, description="Total repair estimate")
    vehicleInfo: Optional[Dict[str, str]] = Field(None, description="Vehicle information")
    damageItems: Optional[List[Dict[str, Any]]] = Field(None, description="Itemized damage list")
    laborCosts: Optional[float] = Field(None, description="Labor costs")
    partsCosts: Optional[float] = Field(None, description="Parts costs")
    shopInfo: Optional[Dict[str, str]] = Field(None, description="Repair shop information") 