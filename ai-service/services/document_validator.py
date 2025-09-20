import asyncio
import time
import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from loguru import logger
import hashlib

class DocumentValidator:
    def __init__(self):
        # Document type validation rules
        self.validation_rules = {
            "medical_bill": {
                "required_fields": ["patient_name", "service_date", "amount", "provider"],
                "amount_pattern": r'\$\d+\.\d{2}',
                "date_pattern": r'\d{1,2}/\d{1,2}/\d{4}',
                "min_text_length": 50,
                "expected_keywords": ["patient", "service", "bill", "medical", "treatment"]
            },
            "vehicle_estimate": {
                "required_fields": ["vehicle_info", "damage_description", "estimate_amount"],
                "amount_pattern": r'\$\d+\.\d{2}',
                "date_pattern": r'\d{1,2}/\d{1,2}/\d{4}',
                "min_text_length": 100,
                "expected_keywords": ["vehicle", "repair", "estimate", "damage", "parts", "labor"]
            },
            "invoice": {
                "required_fields": ["invoice_number", "date", "amount", "vendor"],
                "amount_pattern": r'\$\d+\.\d{2}',
                "date_pattern": r'\d{1,2}/\d{1,2}/\d{4}',
                "min_text_length": 30,
                "expected_keywords": ["invoice", "bill", "payment", "total", "due"]
            },
            "receipt": {
                "required_fields": ["date", "amount", "merchant"],
                "amount_pattern": r'\$\d+\.\d{2}',
                "date_pattern": r'\d{1,2}/\d{1,2}/\d{4}',
                "min_text_length": 20,
                "expected_keywords": ["receipt", "total", "paid", "transaction"]
            },
            "police_report": {
                "required_fields": ["report_number", "date", "incident_description"],
                "date_pattern": r'\d{1,2}/\d{1,2}/\d{4}',
                "min_text_length": 100,
                "expected_keywords": ["police", "report", "incident", "officer", "case", "accident"]
            },
            "general": {
                "required_fields": [],
                "min_text_length": 10,
                "expected_keywords": []
            }
        }
        
        # Common validation patterns
        self.patterns = {
            "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "phone": r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
            "credit_card": r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            "vin": r'\b[A-HJ-NPR-Z0-9]{17}\b',
            "license_plate": r'\b[A-Z0-9]{2,8}\b'
        }
        
        # Suspicious indicators
        self.suspicious_indicators = [
            "lorem ipsum",
            "sample text",
            "placeholder",
            "test document",
            "draft",
            "copy of copy",
            "duplicate"
        ]
    
    def is_ready(self) -> bool:
        """Check if document validator is ready"""
        return True
    
    async def validate_document(
        self, 
        content: bytes, 
        filename: str, 
        document_type: str, 
        extracted_text: str
    ) -> Dict[str, Any]:
        """Validate document based on type and content"""
        try:
            logger.info(f"🔍 Validating document: {filename} (type: {document_type})")
            
            validation_result = {
                "is_valid": True,
                "validation_score": 1.0,
                "issues": [],
                "extracted_data": {},
                "confidence": 1.0
            }
            
            # Get validation rules for document type
            rules = self.validation_rules.get(document_type, self.validation_rules["general"])
            
            # Basic text validation
            text_validation = await self._validate_text_content(extracted_text, rules)
            validation_result.update(text_validation)
            
            # Structure validation
            structure_validation = await self._validate_document_structure(extracted_text, document_type, rules)
            self._merge_validation_results(validation_result, structure_validation)
            
            # Content validation
            content_validation = await self._validate_content_authenticity(extracted_text, document_type)
            self._merge_validation_results(validation_result, content_validation)
            
            # Data extraction and validation
            data_validation = await self._extract_and_validate_data(extracted_text, document_type, rules)
            validation_result["extracted_data"] = data_validation["data"]
            self._merge_validation_results(validation_result, data_validation)
            
            # Calculate final validation score
            validation_result["validation_score"] = self._calculate_validation_score(validation_result)
            validation_result["is_valid"] = validation_result["validation_score"] >= 0.6
            
            logger.info(f"✅ Document validation completed: {filename} (score: {validation_result['validation_score']:.2f})")
            return validation_result
            
        except Exception as e:
            logger.error(f"❌ Error validating document {filename}: {e}")
            return {
                "is_valid": False,
                "validation_score": 0.0,
                "issues": [f"Validation error: {str(e)}"],
                "extracted_data": {},
                "confidence": 0.0
            }
    
    async def _validate_text_content(self, text: str, rules: Dict[str, Any]) -> Dict[str, Any]:
        """Validate basic text content"""
        issues = []
        
        # Check minimum text length
        min_length = rules.get("min_text_length", 10)
        if len(text) < min_length:
            issues.append(f"Text too short: {len(text)} characters (minimum: {min_length})")
        
        # Check for suspicious content
        text_lower = text.lower()
        for indicator in self.suspicious_indicators:
            if indicator in text_lower:
                issues.append(f"Suspicious content detected: {indicator}")
        
        # Check for expected keywords
        expected_keywords = rules.get("expected_keywords", [])
        if expected_keywords:
            found_keywords = [kw for kw in expected_keywords if kw.lower() in text_lower]
            if len(found_keywords) < len(expected_keywords) * 0.5:  # At least 50% of keywords
                issues.append(f"Missing expected keywords. Found: {found_keywords}")
        
        # Check text quality
        word_count = len(text.split())
        if word_count < 5:
            issues.append("Text has too few words")
        
        # Check for excessive repetition
        words = text.lower().split()
        unique_words = set(words)
        repetition_ratio = 1 - (len(unique_words) / len(words)) if words else 0
        if repetition_ratio > 0.7:
            issues.append("Excessive word repetition detected")
        
        return {
            "text_validation_issues": issues,
            "text_stats": {
                "length": len(text),
                "word_count": word_count,
                "unique_words": len(unique_words),
                "repetition_ratio": repetition_ratio
            }
        }
    
    async def _validate_document_structure(self, text: str, document_type: str, rules: Dict[str, Any]) -> Dict[str, Any]:
        """Validate document structure based on type"""
        issues = []
        
        # Check for required patterns
        amount_pattern = rules.get("amount_pattern")
        if amount_pattern:
            amounts = re.findall(amount_pattern, text)
            if not amounts:
                issues.append("No monetary amounts found in expected format")
            elif len(amounts) > 10:
                issues.append("Too many monetary amounts detected (possible OCR errors)")
        
        date_pattern = rules.get("date_pattern")
        if date_pattern:
            dates = re.findall(date_pattern, text)
            if not dates:
                issues.append("No dates found in expected format")
            else:
                # Validate date reasonableness
                for date_str in dates:
                    if not self._is_reasonable_date(date_str):
                        issues.append(f"Unreasonable date detected: {date_str}")
        
        # Document type specific structure validation
        if document_type == "medical_bill":
            structure_issues = await self._validate_medical_bill_structure(text)
            issues.extend(structure_issues)
        elif document_type == "vehicle_estimate":
            structure_issues = await self._validate_vehicle_estimate_structure(text)
            issues.extend(structure_issues)
        elif document_type in ["invoice", "receipt"]:
            structure_issues = await self._validate_invoice_structure(text)
            issues.extend(structure_issues)
        
        return {"structure_validation_issues": issues}
    
    async def _validate_content_authenticity(self, text: str, document_type: str) -> Dict[str, Any]:
        """Validate content authenticity"""
        issues = []
        authenticity_score = 1.0
        
        # Check for placeholder text
        placeholder_patterns = [
            r'xxx+',
            r'\[.*\]',
            r'<.*>',
            r'placeholder',
            r'sample',
            r'lorem ipsum'
        ]
        
        for pattern in placeholder_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                issues.append(f"Placeholder text detected: {pattern}")
                authenticity_score -= 0.2
        
        # Check for formatting inconsistencies
        if self._has_formatting_inconsistencies(text):
            issues.append("Formatting inconsistencies detected")
            authenticity_score -= 0.1
        
        # Check for unusual character patterns
        if self._has_unusual_characters(text):
            issues.append("Unusual character patterns detected")
            authenticity_score -= 0.1
        
        # Check for data integrity
        if self._has_data_integrity_issues(text):
            issues.append("Data integrity issues detected")
            authenticity_score -= 0.2
        
        authenticity_score = max(0.0, authenticity_score)
        
        return {
            "authenticity_validation_issues": issues,
            "authenticity_score": authenticity_score
        }
    
    async def _extract_and_validate_data(self, text: str, document_type: str, rules: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and validate structured data"""
        issues = []
        extracted_data = {}
        
        # Extract common patterns
        extracted_data["emails"] = re.findall(self.patterns["email"], text)
        extracted_data["phones"] = re.findall(self.patterns["phone"], text)
        extracted_data["amounts"] = self._extract_amounts(text)
        extracted_data["dates"] = self._extract_dates(text)
        
        # Document type specific extraction
        if document_type == "medical_bill":
            medical_data = await self._extract_medical_data(text)
            extracted_data.update(medical_data)
        elif document_type == "vehicle_estimate":
            vehicle_data = await self._extract_vehicle_data(text)
            extracted_data.update(vehicle_data)
        elif document_type in ["invoice", "receipt"]:
            invoice_data = await self._extract_invoice_data(text)
            extracted_data.update(invoice_data)
        
        # Validate required fields
        required_fields = rules.get("required_fields", [])
        for field in required_fields:
            if field not in extracted_data or not extracted_data[field]:
                issues.append(f"Required field missing: {field}")
        
        # Cross-validate extracted data
        cross_validation_issues = await self._cross_validate_data(extracted_data, document_type)
        issues.extend(cross_validation_issues)
        
        return {
            "data_validation_issues": issues,
            "data": extracted_data
        }
    
    async def _validate_medical_bill_structure(self, text: str) -> List[str]:
        """Validate medical bill specific structure"""
        issues = []
        text_lower = text.lower()
        
        # Check for essential medical bill elements
        medical_elements = [
            ("patient information", ["patient", "name"]),
            ("provider information", ["provider", "doctor", "hospital", "clinic"]),
            ("service information", ["service", "treatment", "procedure"]),
            ("billing information", ["bill", "charge", "amount", "total"])
        ]
        
        for element_name, keywords in medical_elements:
            if not any(keyword in text_lower for keyword in keywords):
                issues.append(f"Missing {element_name} section")
        
        # Check for medical codes
        icd_codes = re.findall(r'\b[A-Z]\d{2}(?:\.\d{1,2})?\b', text)
        cpt_codes = re.findall(r'\b\d{5}\b', text)
        
        if not icd_codes and not cpt_codes:
            issues.append("No medical billing codes (ICD/CPT) found")
        
        return issues
    
    async def _validate_vehicle_estimate_structure(self, text: str) -> List[str]:
        """Validate vehicle estimate specific structure"""
        issues = []
        text_lower = text.lower()
        
        # Check for essential vehicle estimate elements
        vehicle_elements = [
            ("vehicle information", ["vehicle", "car", "truck", "vin", "year", "make", "model"]),
            ("damage description", ["damage", "repair", "replace", "parts"]),
            ("cost breakdown", ["labor", "parts", "total", "estimate"])
        ]
        
        for element_name, keywords in vehicle_elements:
            if not any(keyword in text_lower for keyword in keywords):
                issues.append(f"Missing {element_name} section")
        
        # Check for VIN
        vin_pattern = self.patterns["vin"]
        if not re.search(vin_pattern, text):
            issues.append("No VIN number found")
        
        return issues
    
    async def _validate_invoice_structure(self, text: str) -> List[str]:
        """Validate invoice/receipt structure"""
        issues = []
        text_lower = text.lower()
        
        # Check for essential invoice elements
        invoice_elements = [
            ("header", ["invoice", "receipt", "bill"]),
            ("vendor info", ["from", "vendor", "company", "business"]),
            ("amount", ["total", "amount", "due", "paid"])
        ]
        
        for element_name, keywords in invoice_elements:
            if not any(keyword in text_lower for keyword in keywords):
                issues.append(f"Missing {element_name} information")
        
        return issues
    
    def _is_reasonable_date(self, date_str: str) -> bool:
        """Check if date is reasonable"""
        try:
            # Parse date
            parts = date_str.split('/')
            if len(parts) != 3:
                return False
            
            month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
            
            # Basic range checks
            if not (1 <= month <= 12):
                return False
            if not (1 <= day <= 31):
                return False
            if not (1900 <= year <= 2030):
                return False
            
            # Check if date is not too far in the future
            try:
                date_obj = datetime(year, month, day)
                if date_obj > datetime.now() + timedelta(days=30):
                    return False
            except ValueError:
                return False
            
            return True
            
        except (ValueError, IndexError):
            return False
    
    def _has_formatting_inconsistencies(self, text: str) -> bool:
        """Check for formatting inconsistencies"""
        lines = text.split('\n')
        
        # Check for inconsistent spacing
        space_counts = [len(line) - len(line.lstrip()) for line in lines if line.strip()]
        if space_counts:
            space_variance = np.var(space_counts) if 'np' in globals() else 0
            if space_variance > 100:  # High variance in indentation
                return True
        
        # Check for mixed number formats
        amounts = re.findall(r'\d+[,.]?\d*', text)
        if amounts:
            comma_amounts = [a for a in amounts if ',' in a]
            dot_amounts = [a for a in amounts if '.' in a]
            if comma_amounts and dot_amounts and len(comma_amounts) != len(dot_amounts):
                return True
        
        return False
    
    def _has_unusual_characters(self, text: str) -> bool:
        """Check for unusual character patterns"""
        # Check for excessive special characters
        special_char_count = sum(1 for c in text if not c.isalnum() and not c.isspace())
        if special_char_count > len(text) * 0.3:  # More than 30% special characters
            return True
        
        # Check for repeated character patterns
        repeated_patterns = re.findall(r'(.)\1{5,}', text)
        if repeated_patterns:
            return True
        
        return False
    
    def _has_data_integrity_issues(self, text: str) -> bool:
        """Check for data integrity issues"""
        # Check for impossible values
        amounts = self._extract_amounts(text)
        if amounts:
            # Check for unreasonably large amounts
            max_amount = max(amounts)
            if max_amount > 1000000:  # More than $1M
                return True
        
        # Check for inconsistent dates
        dates = self._extract_dates(text)
        if len(dates) > 1:
            try:
                parsed_dates = []
                for date_str in dates:
                    parts = date_str.split('/')
                    if len(parts) == 3:
                        month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
                        parsed_dates.append(datetime(year, month, day))
                
                if parsed_dates:
                    date_range = max(parsed_dates) - min(parsed_dates)
                    if date_range > timedelta(days=365):  # More than a year apart
                        return True
            except (ValueError, IndexError):
                return True
        
        return False
    
    def _extract_amounts(self, text: str) -> List[float]:
        """Extract monetary amounts"""
        pattern = r'\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?'
        matches = re.findall(pattern, text)
        
        amounts = []
        for match in matches:
            try:
                clean_amount = re.sub(r'[^\d.]', '', match)
                if clean_amount and '.' in clean_amount:
                    amounts.append(float(clean_amount))
            except ValueError:
                continue
        
        return amounts
    
    def _extract_dates(self, text: str) -> List[str]:
        """Extract dates"""
        date_patterns = [
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'\d{1,2}-\d{1,2}-\d{4}',
            r'\d{4}-\d{1,2}-\d{1,2}'
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            dates.extend(matches)
        
        return list(set(dates))
    
    async def _extract_medical_data(self, text: str) -> Dict[str, Any]:
        """Extract medical bill specific data"""
        data = {}
        
        # Patient name
        patient_patterns = [
            r'(?:Patient|Name):\s*([A-Za-z\s]+)',
            r'Patient Name:\s*([A-Za-z\s]+)'
        ]
        
        for pattern in patient_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["patient_name"] = match.group(1).strip()
                break
        
        # Service date
        service_patterns = [
            r'(?:Service|Date of Service):\s*(\d{1,2}/\d{1,2}/\d{4})',
            r'Date:\s*(\d{1,2}/\d{1,2}/\d{4})'
        ]
        
        for pattern in service_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["service_date"] = match.group(1)
                break
        
        # Provider
        provider_patterns = [
            r'(?:Provider|Doctor|Physician):\s*([A-Za-z\s]+)',
            r'(?:Hospital|Clinic):\s*([A-Za-z\s]+)'
        ]
        
        for pattern in provider_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["provider"] = match.group(1).strip()
                break
        
        return data
    
    async def _extract_vehicle_data(self, text: str) -> Dict[str, Any]:
        """Extract vehicle estimate specific data"""
        data = {}
        
        # VIN
        vin_match = re.search(self.patterns["vin"], text)
        if vin_match:
            data["vin"] = vin_match.group()
        
        # Vehicle info
        vehicle_patterns = [
            r'(\d{4})\s+([A-Za-z]+)\s+([A-Za-z]+)',  # Year Make Model
            r'Vehicle:\s*([A-Za-z0-9\s]+)'
        ]
        
        for pattern in vehicle_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if len(match.groups()) == 3:
                    data["vehicle_year"] = match.group(1)
                    data["vehicle_make"] = match.group(2)
                    data["vehicle_model"] = match.group(3)
                else:
                    data["vehicle_info"] = match.group(1).strip()
                break
        
        # Damage description
        damage_patterns = [
            r'(?:Damage|Description):\s*([A-Za-z0-9\s,.-]+)',
            r'(?:Repair|Fix):\s*([A-Za-z0-9\s,.-]+)'
        ]
        
        for pattern in damage_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["damage_description"] = match.group(1).strip()
                break
        
        return data
    
    async def _extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extract invoice/receipt specific data"""
        data = {}
        
        # Invoice number
        invoice_patterns = [
            r'(?:Invoice|Receipt)\s*#?\s*(\w+)',
            r'(?:Number|No):\s*(\w+)'
        ]
        
        for pattern in invoice_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["invoice_number"] = match.group(1)
                break
        
        # Vendor/Merchant
        vendor_patterns = [
            r'(?:From|Vendor|Company):\s*([A-Za-z\s]+)',
            r'(?:Merchant|Business):\s*([A-Za-z\s]+)'
        ]
        
        for pattern in vendor_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data["vendor"] = match.group(1).strip()
                break
        
        return data
    
    async def _cross_validate_data(self, data: Dict[str, Any], document_type: str) -> List[str]:
        """Cross-validate extracted data for consistency"""
        issues = []
        
        # Date consistency
        dates = data.get("dates", [])
        if len(dates) > 1:
            # Check if all dates are similar
            parsed_dates = []
            for date_str in dates:
                try:
                    parts = date_str.split('/')
                    if len(parts) == 3:
                        parsed_dates.append(datetime(int(parts[2]), int(parts[0]), int(parts[1])))
                except (ValueError, IndexError):
                    continue
            
            if parsed_dates:
                date_range = max(parsed_dates) - min(parsed_dates)
                if date_range > timedelta(days=90):  # Dates more than 3 months apart
                    issues.append("Inconsistent dates detected")
        
        # Amount consistency
        amounts = data.get("amounts", [])
        if amounts:
            amount_range = max(amounts) - min(amounts)
            if amount_range > max(amounts) * 0.5:  # Large variance in amounts
                issues.append("Large variance in monetary amounts")
        
        # Document type specific validation
        if document_type == "medical_bill":
            if "patient_name" in data and "provider" in data:
                # Basic name validation
                patient = data["patient_name"]
                provider = data["provider"]
                if patient and provider and patient.lower() == provider.lower():
                    issues.append("Patient and provider names are identical")
        
        return issues
    
    def _merge_validation_results(self, main_result: Dict[str, Any], additional_result: Dict[str, Any]):
        """Merge validation results"""
        for key, value in additional_result.items():
            if key.endswith("_issues") and isinstance(value, list):
                main_result["issues"].extend(value)
            elif key == "authenticity_score":
                # Weight authenticity score in overall confidence
                current_confidence = main_result.get("confidence", 1.0)
                main_result["confidence"] = (current_confidence + value) / 2
            else:
                main_result[key] = value
    
    def _calculate_validation_score(self, result: Dict[str, Any]) -> float:
        """Calculate overall validation score"""
        try:
            base_score = 1.0
            
            # Deduct points for each issue
            issue_count = len(result.get("issues", []))
            base_score -= min(0.8, issue_count * 0.1)  # Max 80% deduction
            
            # Factor in confidence
            confidence = result.get("confidence", 1.0)
            base_score *= confidence
            
            # Factor in authenticity score if available
            authenticity = result.get("authenticity_score", 1.0)
            base_score = (base_score + authenticity) / 2
            
            return max(0.0, min(1.0, base_score))
            
        except Exception as e:
            logger.error(f"❌ Error calculating validation score: {e}")
            return 0.5 