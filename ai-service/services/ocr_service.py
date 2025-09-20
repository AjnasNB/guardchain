import asyncio
import time
import os
import io
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
from PIL import Image
import pytesseract
import easyocr
from pdf2image import convert_from_bytes
from loguru import logger
import re

class OCRService:
    def __init__(self):
        self.tesseract_ready = False
        self.easyocr_ready = False
        self.easyocr_reader = None
        
    async def initialize(self):
        """Initialize OCR engines"""
        try:
            logger.info("🔧 Initializing OCR Service...")
            
            # Initialize Tesseract
            await self._init_tesseract()
            
            # Initialize EasyOCR
            await self._init_easyocr()
            
            logger.info("✅ OCR Service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize OCR Service: {e}")
            raise
    
    async def _init_tesseract(self):
        """Initialize Tesseract OCR"""
        try:
            # Test Tesseract installation
            version = pytesseract.get_tesseract_version()
            logger.info(f"📖 Tesseract version: {version}")
            self.tesseract_ready = True
        except Exception as e:
            logger.warning(f"⚠️ Tesseract not available: {e}")
            self.tesseract_ready = False
    
    async def _init_easyocr(self):
        """Initialize EasyOCR"""
        try:
            # Initialize EasyOCR reader
            self.easyocr_reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=True if CUDA available
            logger.info("📖 EasyOCR initialized")
            self.easyocr_ready = True
        except Exception as e:
            logger.warning(f"⚠️ EasyOCR not available: {e}")
            self.easyocr_ready = False
    
    def is_ready(self) -> bool:
        """Check if OCR service is ready"""
        return self.tesseract_ready or self.easyocr_ready
    
    async def process_document(self, content: bytes, filename: str, document_type: str = "general") -> Dict[str, Any]:
        """Process document with OCR"""
        start_time = time.time()
        
        try:
            logger.info(f"📄 Processing document: {filename}")
            
            # Determine file type
            file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
            
            if file_ext == 'pdf':
                images = await self._pdf_to_images(content)
                text_results = []
                confidence_scores = []
                
                for i, image in enumerate(images):
                    result = await self._process_image(image, document_type)
                    text_results.append(result['text'])
                    confidence_scores.append(result['confidence'])
                
                combined_text = '\n\n--- PAGE BREAK ---\n\n'.join(text_results)
                avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
                
            elif file_ext in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
                image = Image.open(io.BytesIO(content))
                result = await self._process_image(image, document_type)
                combined_text = result['text']
                avg_confidence = result['confidence']
            
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
            
            # Extract structured data based on document type
            structured_data = await self._extract_structured_data(combined_text, document_type)
            
            processing_time = time.time() - start_time
            
            return {
                "text": combined_text,
                "confidence": avg_confidence,
                "structured_data": structured_data,
                "metadata": {
                    "filename": filename,
                    "document_type": document_type,
                    "file_type": file_ext,
                    "pages_processed": len(images) if file_ext == 'pdf' else 1
                },
                "processing_time": processing_time
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing document {filename}: {e}")
            raise
    
    async def _pdf_to_images(self, pdf_bytes: bytes) -> List[Image.Image]:
        """Convert PDF to images"""
        try:
            images = convert_from_bytes(pdf_bytes, dpi=300)
            logger.info(f"📄 Converted PDF to {len(images)} images")
            return images
        except Exception as e:
            logger.error(f"❌ Error converting PDF: {e}")
            raise
    
    async def _process_image(self, image: Image.Image, document_type: str) -> Dict[str, Any]:
        """Process single image with OCR"""
        try:
            # Preprocess image
            processed_image = await self._preprocess_image(image)
            
            # Try EasyOCR first (generally more accurate)
            if self.easyocr_ready:
                result = await self._easyocr_extract(processed_image)
                if result['confidence'] > 0.5:  # Good confidence
                    return result
            
            # Fallback to Tesseract
            if self.tesseract_ready:
                result = await self._tesseract_extract(processed_image, document_type)
                return result
            
            raise Exception("No OCR engine available")
            
        except Exception as e:
            logger.error(f"❌ Error processing image: {e}")
            return {"text": "", "confidence": 0.0, "error": str(e)}
    
    async def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        """Preprocess image for better OCR results"""
        try:
            # Convert PIL to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
            
            # Noise removal
            denoised = cv2.medianBlur(gray, 5)
            
            # Thresholding
            _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Dilation and erosion to remove noise
            kernel = np.ones((1, 1), np.uint8)
            processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return processed
            
        except Exception as e:
            logger.warning(f"⚠️ Image preprocessing failed: {e}")
            # Return original image as numpy array
            return np.array(image.convert('L'))
    
    async def _easyocr_extract(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract text using EasyOCR"""
        try:
            results = self.easyocr_reader.readtext(image, detail=1)
            
            extracted_text = []
            confidence_scores = []
            bounding_boxes = []
            
            for (bbox, text, confidence) in results:
                if confidence > 0.3:  # Filter low confidence results
                    extracted_text.append(text)
                    confidence_scores.append(confidence)
                    bounding_boxes.append({
                        "text": text,
                        "confidence": confidence,
                        "bbox": bbox
                    })
            
            combined_text = ' '.join(extracted_text)
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            
            return {
                "text": combined_text,
                "confidence": avg_confidence,
                "bounding_boxes": bounding_boxes,
                "engine": "easyocr"
            }
            
        except Exception as e:
            logger.error(f"❌ EasyOCR extraction failed: {e}")
            return {"text": "", "confidence": 0.0, "error": str(e)}
    
    async def _tesseract_extract(self, image: np.ndarray, document_type: str) -> Dict[str, Any]:
        """Extract text using Tesseract"""
        try:
            # Configure Tesseract based on document type
            config = self._get_tesseract_config(document_type)
            
            # Extract text
            text = pytesseract.image_to_string(image, config=config)
            
            # Get confidence data
            data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0
            
            # Extract bounding boxes for high-confidence text
            bounding_boxes = []
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > 30 and data['text'][i].strip():
                    bounding_boxes.append({
                        "text": data['text'][i],
                        "confidence": int(data['conf'][i]) / 100,
                        "bbox": [data['left'][i], data['top'][i], 
                                data['width'][i], data['height'][i]]
                    })
            
            return {
                "text": text.strip(),
                "confidence": avg_confidence,
                "bounding_boxes": bounding_boxes,
                "engine": "tesseract"
            }
            
        except Exception as e:
            logger.error(f"❌ Tesseract extraction failed: {e}")
            return {"text": "", "confidence": 0.0, "error": str(e)}
    
    def _get_tesseract_config(self, document_type: str) -> str:
        """Get Tesseract configuration based on document type"""
        configs = {
            "medical_bill": "--psm 6",  # Uniform block of text
            "invoice": "--psm 6",
            "receipt": "--psm 6",
            "police_report": "--psm 4",  # Single column text
            "general": "--psm 3"  # Fully automatic page segmentation
        }
        return configs.get(document_type, "--psm 3")
    
    async def _extract_structured_data(self, text: str, document_type: str) -> Dict[str, Any]:
        """Extract structured data based on document type"""
        try:
            structured_data = {}
            
            # Common patterns
            structured_data["amounts"] = self._extract_amounts(text)
            structured_data["dates"] = self._extract_dates(text)
            structured_data["phone_numbers"] = self._extract_phone_numbers(text)
            structured_data["emails"] = self._extract_emails(text)
            
            # Document-specific extraction
            if document_type == "medical_bill":
                structured_data.update(self._extract_medical_data(text))
            elif document_type == "vehicle_estimate":
                structured_data.update(self._extract_vehicle_data(text))
            elif document_type in ["invoice", "receipt"]:
                structured_data.update(self._extract_invoice_data(text))
            
            return structured_data
            
        except Exception as e:
            logger.error(f"❌ Error extracting structured data: {e}")
            return {}
    
    def _extract_amounts(self, text: str) -> List[float]:
        """Extract monetary amounts from text"""
        # Pattern for currency amounts
        pattern = r'\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?'
        matches = re.findall(pattern, text)
        
        amounts = []
        for match in matches:
            try:
                # Clean and convert to float
                clean_amount = re.sub(r'[^\d.]', '', match)
                if clean_amount and '.' in clean_amount:
                    amounts.append(float(clean_amount))
            except ValueError:
                continue
        
        return sorted(amounts, reverse=True)  # Return highest amounts first
    
    def _extract_dates(self, text: str) -> List[str]:
        """Extract dates from text"""
        date_patterns = [
            r'\d{1,2}/\d{1,2}/\d{4}',  # MM/DD/YYYY
            r'\d{1,2}-\d{1,2}-\d{4}',  # MM-DD-YYYY
            r'\d{4}-\d{1,2}-\d{1,2}',  # YYYY-MM-DD
            r'\w+ \d{1,2}, \d{4}',     # Month DD, YYYY
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            dates.extend(matches)
        
        return list(set(dates))  # Remove duplicates
    
    def _extract_phone_numbers(self, text: str) -> List[str]:
        """Extract phone numbers from text"""
        pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        return re.findall(pattern, text)
    
    def _extract_emails(self, text: str) -> List[str]:
        """Extract email addresses from text"""
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return re.findall(pattern, text)
    
    def _extract_medical_data(self, text: str) -> Dict[str, Any]:
        """Extract medical-specific data"""
        data = {}
        
        # Look for patient name (after "Patient:" or similar)
        patient_pattern = r'(?:Patient|Name):\s*([A-Za-z\s]+)'
        patient_match = re.search(patient_pattern, text, re.IGNORECASE)
        if patient_match:
            data["patient_name"] = patient_match.group(1).strip()
        
        # Look for diagnosis codes (ICD-10)
        icd_pattern = r'\b[A-Z]\d{2}(?:\.\d{1,2})?\b'
        data["diagnosis_codes"] = re.findall(icd_pattern, text)
        
        # Look for procedure codes (CPT)
        cpt_pattern = r'\b\d{5}\b'
        data["procedure_codes"] = re.findall(cpt_pattern, text)
        
        return data
    
    def _extract_vehicle_data(self, text: str) -> Dict[str, Any]:
        """Extract vehicle-specific data"""
        data = {}
        
        # Look for VIN
        vin_pattern = r'\b[A-HJ-NPR-Z0-9]{17}\b'
        vin_match = re.search(vin_pattern, text)
        if vin_match:
            data["vin"] = vin_match.group()
        
        # Look for license plate
        plate_pattern = r'\b[A-Z0-9]{2,8}\b'
        plates = re.findall(plate_pattern, text)
        if plates:
            data["license_plates"] = plates
        
        return data
    
    def _extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extract invoice-specific data"""
        data = {}
        
        # Look for invoice number
        invoice_pattern = r'(?:Invoice|Receipt|Bill)\s*#?\s*(\w+)'
        invoice_match = re.search(invoice_pattern, text, re.IGNORECASE)
        if invoice_match:
            data["invoice_number"] = invoice_match.group(1)
        
        # Look for tax amounts
        tax_pattern = r'(?:Tax|GST|VAT):\s*\$?(\d+(?:\.\d{2})?)'
        tax_match = re.search(tax_pattern, text, re.IGNORECASE)
        if tax_match:
            data["tax_amount"] = float(tax_match.group(1))
        
        return data 