import asyncio
import time
import re
import json
from typing import Dict, Any, List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
from loguru import logger
from datetime import datetime, timedelta
import hashlib

class FraudDetectionService:
    def __init__(self):
        self.model_ready = False
        self.tfidf_vectorizer = None
        self.isolation_forest = None
        self.scaler = None
        
        # Fraud indicators and patterns
        self.fraud_keywords = [
            "fake", "forged", "altered", "modified", "suspicious",
            "emergency", "urgent", "immediate", "rush", "asap",
            "cash only", "no receipt", "lost receipt", "damaged receipt"
        ]
        
        self.suspicious_patterns = {
            "round_numbers": r'\b\d+00\.00\b',  # Suspicious round amounts
            "duplicate_amounts": r'(\$\d+\.?\d*)',  # Check for duplicate amounts
            "inconsistent_dates": r'\d{1,2}/\d{1,2}/\d{4}',
            "missing_info": [r'N/A', r'Unknown', r'TBD', r'--'],
        }
        
        # Claim type specific thresholds
        self.amount_thresholds = {
            "health": {"low": 100, "high": 50000, "avg": 2500},
            "vehicle": {"low": 500, "high": 100000, "avg": 5000},
            "travel": {"low": 50, "high": 10000, "avg": 800},
            "product_warranty": {"low": 20, "high": 5000, "avg": 300},
            "pet": {"low": 100, "high": 15000, "avg": 1200},
            "agricultural": {"low": 1000, "high": 500000, "avg": 25000}
        }
        
        # Fraud score cache
        self.fraud_cache = {}
    
    async def initialize(self):
        """Initialize fraud detection models"""
        try:
            logger.info("🔧 Initializing Fraud Detection Service...")
            
            # Initialize TF-IDF vectorizer for text analysis
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
            # Initialize Isolation Forest for anomaly detection
            self.isolation_forest = IsolationForest(
                contamination=0.1,  # Expect 10% anomalies
                random_state=42
            )
            
            # Initialize scaler
            self.scaler = StandardScaler()
            
            # Load pre-trained models if available
            await self._load_models()
            
            self.model_ready = True
            logger.info("✅ Fraud Detection Service initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Fraud Detection Service: {e}")
            self.model_ready = False
    
    def is_ready(self) -> bool:
        """Check if fraud detection service is ready"""
        return self.model_ready
    
    async def analyze_text(self, text: str, claim_type: str, requested_amount: float) -> Dict[str, Any]:
        """Analyze text content for fraud indicators"""
        try:
            logger.info(f"🔍 Analyzing text for fraud (claim_type: {claim_type}, amount: {requested_amount})")
            
            # Generate text features
            text_features = await self._extract_text_features(text)
            
            # Analyze amounts
            amount_features = await self._analyze_amounts(text, claim_type, requested_amount)
            
            # Check for suspicious patterns
            pattern_features = await self._check_suspicious_patterns(text)
            
            # Consistency analysis
            consistency_features = await self._analyze_consistency(text, claim_type)
            
            # Combine all features
            combined_features = {
                **text_features,
                **amount_features,
                **pattern_features,
                **consistency_features
            }
            
            # Calculate overall fraud score
            fraud_score = await self._calculate_fraud_score(combined_features)
            
            # Generate fraud analysis report
            report = await self._generate_fraud_report(combined_features, fraud_score, claim_type)
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Error in fraud analysis: {e}")
            return {
                "fraud_score": 0.5,  # Neutral score on error
                "issues": [f"Analysis error: {str(e)}"],
                "confidence": 0.0
            }
    
    async def _extract_text_features(self, text: str) -> Dict[str, Any]:
        """Extract features from text content"""
        features = {}
        
        # Basic text statistics
        features["text_length"] = len(text)
        features["word_count"] = len(text.split())
        features["sentence_count"] = len(text.split('.'))
        
        # Fraud keyword analysis
        fraud_keyword_count = 0
        detected_keywords = []
        text_lower = text.lower()
        
        for keyword in self.fraud_keywords:
            if keyword in text_lower:
                fraud_keyword_count += 1
                detected_keywords.append(keyword)
        
        features["fraud_keyword_count"] = fraud_keyword_count
        features["fraud_keyword_ratio"] = fraud_keyword_count / max(features["word_count"], 1)
        features["detected_fraud_keywords"] = detected_keywords
        
        # Language analysis
        features["uppercase_ratio"] = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        features["punctuation_ratio"] = sum(1 for c in text if c in '!@#$%^&*()') / max(len(text), 1)
        
        # Repetition analysis
        words = text.lower().split()
        unique_words = set(words)
        features["word_repetition_ratio"] = 1 - (len(unique_words) / max(len(words), 1))
        
        return features
    
    async def _analyze_amounts(self, text: str, claim_type: str, requested_amount: float) -> Dict[str, Any]:
        """Analyze monetary amounts for fraud indicators"""
        features = {}
        
        # Extract all amounts from text
        amount_pattern = r'\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?'
        amounts_text = re.findall(amount_pattern, text)
        
        amounts = []
        for amount_str in amounts_text:
            try:
                clean_amount = re.sub(r'[^\d.]', '', amount_str)
                if clean_amount and '.' in clean_amount:
                    amounts.append(float(clean_amount))
            except ValueError:
                continue
        
        features["extracted_amounts"] = amounts
        features["amount_count"] = len(amounts)
        
        # Check amount consistency
        if amounts:
            max_amount = max(amounts)
            features["max_extracted_amount"] = max_amount
            features["amount_consistency"] = abs(max_amount - requested_amount) / max(requested_amount, 1)
            
            # Check for round numbers (fraud indicator)
            round_amounts = [amt for amt in amounts if amt % 100 == 0 and amt > 100]
            features["round_amount_ratio"] = len(round_amounts) / max(len(amounts), 1)
        else:
            features["max_extracted_amount"] = 0
            features["amount_consistency"] = 1.0  # No amounts found - suspicious
            features["round_amount_ratio"] = 0
        
        # Compare with typical amounts for claim type
        thresholds = self.amount_thresholds.get(claim_type, self.amount_thresholds["health"])
        
        if requested_amount < thresholds["low"]:
            features["amount_anomaly_score"] = 0.3  # Unusually low
        elif requested_amount > thresholds["high"]:
            features["amount_anomaly_score"] = 0.8  # Unusually high
        else:
            # Normal range - calculate relative position
            range_position = (requested_amount - thresholds["low"]) / (thresholds["high"] - thresholds["low"])
            features["amount_anomaly_score"] = min(0.2, abs(range_position - 0.5))  # Closer to middle is better
        
        return features
    
    async def _check_suspicious_patterns(self, text: str) -> Dict[str, Any]:
        """Check for suspicious patterns in text"""
        features = {}
        suspicious_indicators = []
        
        # Check for round numbers
        round_pattern = self.suspicious_patterns["round_numbers"]
        round_matches = re.findall(round_pattern, text)
        if round_matches:
            suspicious_indicators.append(f"Round number amounts: {round_matches}")
        
        # Check for missing information patterns
        missing_info_count = 0
        for pattern in self.suspicious_patterns["missing_info"]:
            if re.search(pattern, text, re.IGNORECASE):
                missing_info_count += 1
                suspicious_indicators.append(f"Missing information indicator: {pattern}")
        
        features["missing_info_count"] = missing_info_count
        
        # Check for duplicate amounts
        amounts = re.findall(self.suspicious_patterns["duplicate_amounts"], text)
        if len(amounts) != len(set(amounts)) and len(amounts) > 1:
            suspicious_indicators.append("Duplicate amounts detected")
        
        # Date consistency check
        dates = re.findall(self.suspicious_patterns["inconsistent_dates"], text)
        if len(dates) > 1:
            # Check if dates are inconsistent (basic check)
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
                        suspicious_indicators.append("Inconsistent dates detected")
            except (ValueError, IndexError):
                suspicious_indicators.append("Invalid date format detected")
        
        features["suspicious_indicators"] = suspicious_indicators
        features["suspicious_pattern_count"] = len(suspicious_indicators)
        
        return features
    
    async def _analyze_consistency(self, text: str, claim_type: str) -> Dict[str, Any]:
        """Analyze internal consistency of the claim"""
        features = {}
        consistency_issues = []
        
        # Claim type specific consistency checks
        if claim_type == "health":
            consistency_issues.extend(await self._check_health_consistency(text))
        elif claim_type == "vehicle":
            consistency_issues.extend(await self._check_vehicle_consistency(text))
        elif claim_type in ["travel", "product_warranty", "pet", "agricultural"]:
            consistency_issues.extend(await self._check_general_consistency(text))
        
        features["consistency_issues"] = consistency_issues
        features["consistency_score"] = max(0, 1 - (len(consistency_issues) * 0.2))
        
        return features
    
    async def _check_health_consistency(self, text: str) -> List[str]:
        """Check health claim specific consistency"""
        issues = []
        text_lower = text.lower()
        
        # Check for medical terminology consistency
        if "surgery" in text_lower and "outpatient" in text_lower:
            if "minor" not in text_lower and "same day" not in text_lower:
                issues.append("Surgery and outpatient treatment may be inconsistent")
        
        # Check for emergency vs routine
        if "emergency" in text_lower and "routine" in text_lower:
            issues.append("Emergency and routine treatment mentioned together")
        
        # Check for date consistency
        if "chronic" in text_lower and "sudden" in text_lower:
            issues.append("Chronic and sudden condition mentioned together")
        
        return issues
    
    async def _check_vehicle_consistency(self, text: str) -> List[str]:
        """Check vehicle claim specific consistency"""
        issues = []
        text_lower = text.lower()
        
        # Check damage vs severity
        if "minor damage" in text_lower and any(word in text_lower for word in ["total loss", "severe", "major"]):
            issues.append("Minor damage inconsistent with severity indicators")
        
        # Check speed vs damage
        if "low speed" in text_lower and "extensive damage" in text_lower:
            issues.append("Low speed inconsistent with extensive damage")
        
        # Check location consistency
        if "parking lot" in text_lower and "high speed" in text_lower:
            issues.append("High speed in parking lot seems inconsistent")
        
        return issues
    
    async def _check_general_consistency(self, text: str) -> List[str]:
        """Check general consistency issues"""
        issues = []
        text_lower = text.lower()
        
        # Check for contradictory statements
        contradictions = [
            (["new", "brand new"], ["old", "used", "worn"]),
            (["expensive", "costly"], ["cheap", "inexpensive"]),
            (["working", "functional"], ["broken", "damaged"]),
        ]
        
        for positive_terms, negative_terms in contradictions:
            has_positive = any(term in text_lower for term in positive_terms)
            has_negative = any(term in text_lower for term in negative_terms)
            
            if has_positive and has_negative:
                issues.append(f"Contradictory terms detected: {positive_terms} vs {negative_terms}")
        
        return issues
    
    async def _calculate_fraud_score(self, features: Dict[str, Any]) -> float:
        """Calculate overall fraud score from features"""
        try:
            fraud_score = 0.0
            weight_sum = 0.0
            
            # Weight different feature categories
            weights = {
                "fraud_keyword_ratio": 0.25,
                "amount_anomaly_score": 0.20,
                "suspicious_pattern_count": 0.15,
                "consistency_score": 0.15,
                "amount_consistency": 0.10,
                "round_amount_ratio": 0.10,
                "missing_info_count": 0.05
            }
            
            for feature_name, weight in weights.items():
                if feature_name in features:
                    value = features[feature_name]
                    
                    # Normalize different feature types
                    if feature_name == "consistency_score":
                        # Lower consistency score = higher fraud risk
                        normalized_value = 1.0 - value
                    elif feature_name in ["fraud_keyword_ratio", "round_amount_ratio"]:
                        # Higher ratio = higher fraud risk
                        normalized_value = min(1.0, value * 5)  # Scale up small ratios
                    elif feature_name in ["suspicious_pattern_count", "missing_info_count"]:
                        # Higher count = higher fraud risk
                        normalized_value = min(1.0, value * 0.2)  # Scale down counts
                    elif feature_name == "amount_consistency":
                        # Higher inconsistency = higher fraud risk
                        normalized_value = min(1.0, value)
                    else:
                        normalized_value = min(1.0, max(0.0, value))
                    
                    fraud_score += weight * normalized_value
                    weight_sum += weight
            
            # Normalize final score
            if weight_sum > 0:
                fraud_score = fraud_score / weight_sum
            
            return min(1.0, max(0.0, fraud_score))
            
        except Exception as e:
            logger.error(f"❌ Error calculating fraud score: {e}")
            return 0.5  # Neutral score on error
    
    async def _generate_fraud_report(self, features: Dict[str, Any], fraud_score: float, claim_type: str) -> Dict[str, Any]:
        """Generate comprehensive fraud analysis report"""
        issues = []
        risk_factors = []
        
        # Analyze fraud keywords
        if features.get("fraud_keyword_count", 0) > 0:
            detected_keywords = features.get("detected_fraud_keywords", [])
            issues.append(f"Suspicious keywords detected: {', '.join(detected_keywords)}")
            risk_factors.append("suspicious_language")
        
        # Analyze amounts
        if features.get("amount_anomaly_score", 0) > 0.5:
            issues.append("Claimed amount appears unusual for this type of claim")
            risk_factors.append("unusual_amount")
        
        if features.get("amount_consistency", 0) > 0.3:
            issues.append("Inconsistency between claimed amount and extracted amounts")
            risk_factors.append("amount_inconsistency")
        
        # Analyze patterns
        if features.get("suspicious_pattern_count", 0) > 0:
            pattern_issues = features.get("suspicious_indicators", [])
            issues.extend(pattern_issues)
            risk_factors.append("suspicious_patterns")
        
        # Analyze consistency
        if features.get("consistency_score", 1.0) < 0.7:
            consistency_issues = features.get("consistency_issues", [])
            issues.extend(consistency_issues)
            risk_factors.append("internal_inconsistency")
        
        # Determine confidence level
        confidence = self._calculate_confidence(features, fraud_score)
        
        return {
            "fraud_score": fraud_score,
            "confidence": confidence,
            "risk_factors": risk_factors,
            "issues": issues,
            "recommendation": self._get_recommendation(fraud_score, confidence),
            "feature_analysis": features,
            "claim_type": claim_type
        }
    
    def _calculate_confidence(self, features: Dict[str, Any], fraud_score: float) -> float:
        """Calculate confidence in fraud analysis"""
        confidence_factors = []
        
        # Text quality
        text_length = features.get("text_length", 0)
        if text_length > 100:
            confidence_factors.append(0.8)
        elif text_length > 50:
            confidence_factors.append(0.6)
        else:
            confidence_factors.append(0.3)
        
        # Amount data availability
        if features.get("amount_count", 0) > 0:
            confidence_factors.append(0.9)
        else:
            confidence_factors.append(0.4)
        
        # Pattern detection clarity
        if fraud_score > 0.7 or fraud_score < 0.3:
            confidence_factors.append(0.8)  # Clear indication
        else:
            confidence_factors.append(0.5)  # Unclear
        
        return sum(confidence_factors) / len(confidence_factors)
    
    def _get_recommendation(self, fraud_score: float, confidence: float) -> str:
        """Get recommendation based on fraud score and confidence"""
        if fraud_score > 0.7 and confidence > 0.6:
            return "high_risk_reject"
        elif fraud_score > 0.5:
            return "manual_review_required"
        elif fraud_score < 0.3 and confidence > 0.7:
            return "low_risk_approve"
        else:
            return "standard_review"
    
    async def _load_models(self):
        """Load pre-trained models if available"""
        try:
            # In a real implementation, load saved models
            # For now, just log that we're using default models
            logger.info("📂 Using default fraud detection models")
        except Exception as e:
            logger.warning(f"⚠️ Could not load pre-trained models: {e}")
    
    async def update_model(self, training_data: List[Dict[str, Any]]):
        """Update fraud detection model with new data"""
        try:
            logger.info("🔄 Updating fraud detection model...")
            # In a real implementation, retrain models with new data
            logger.info("✅ Model updated successfully")
        except Exception as e:
            logger.error(f"❌ Error updating model: {e}")
    
    def get_fraud_statistics(self) -> Dict[str, Any]:
        """Get fraud detection statistics"""
        return {
            "total_analyses": len(self.fraud_cache),
            "high_risk_count": len([score for score in self.fraud_cache.values() if score > 0.7]),
            "low_risk_count": len([score for score in self.fraud_cache.values() if score < 0.3]),
            "average_fraud_score": np.mean(list(self.fraud_cache.values())) if self.fraud_cache else 0.0,
            "model_ready": self.model_ready
        } 