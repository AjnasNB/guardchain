import asyncio
import time
import io
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
from PIL import Image, ImageFilter
import imagehash
from loguru import logger
import hashlib
import base64

class ImageAnalysisService:
    def __init__(self):
        self.model_ready = False
        
        # Image tampering detection parameters
        self.tampering_thresholds = {
            "compression_artifacts": 0.7,
            "noise_patterns": 0.6,
            "color_inconsistency": 0.5,
            "edge_discontinuity": 0.8
        }
        
        # Damage assessment parameters by claim type
        self.damage_keywords = {
            "vehicle": {
                "severe": ["totaled", "demolished", "destroyed", "crushed"],
                "moderate": ["dented", "scratched", "cracked", "damaged"],
                "minor": ["scuffed", "small", "minor", "tiny"]
            },
            "health": {
                "severe": ["fracture", "break", "severe", "major"],
                "moderate": ["bruise", "cut", "moderate", "visible"],
                "minor": ["scratch", "small", "minor", "slight"]
            },
            "property": {
                "severe": ["destroyed", "collapsed", "total", "major"],
                "moderate": ["damaged", "broken", "cracked", "torn"],
                "minor": ["minor", "small", "slight", "surface"]
            }
        }
    
    async def initialize(self):
        """Initialize image analysis models"""
        try:
            logger.info("🔧 Initializing Image Analysis Service...")
            
            # Initialize computer vision models
            await self._init_cv_models()
            
            # Initialize damage assessment models
            await self._init_damage_models()
            
            self.model_ready = True
            logger.info("✅ Image Analysis Service initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Image Analysis Service: {e}")
            self.model_ready = False
    
    def is_ready(self) -> bool:
        """Check if image analysis service is ready"""
        return self.model_ready
    
    async def _init_cv_models(self):
        """Initialize computer vision models"""
        try:
            # In a real implementation, load pre-trained models for:
            # - Image authenticity detection
            # - Object detection
            # - Image quality assessment
            logger.info("📷 Computer vision models loaded")
        except Exception as e:
            logger.warning(f"⚠️ CV models not available: {e}")
    
    async def _init_damage_models(self):
        """Initialize damage assessment models"""
        try:
            # In a real implementation, load pre-trained models for:
            # - Vehicle damage assessment
            # - Medical injury assessment
            # - Property damage evaluation
            logger.info("🔍 Damage assessment models loaded")
        except Exception as e:
            logger.warning(f"⚠️ Damage models not available: {e}")
    
    async def analyze_image(self, content: bytes, filename: str, analysis_type: str = "general") -> Dict[str, Any]:
        """Comprehensive image analysis"""
        start_time = time.time()
        
        try:
            logger.info(f"🖼️ Analyzing image: {filename} (type: {analysis_type})")
            
            # Load image
            image = Image.open(io.BytesIO(content))
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Basic image analysis
            basic_analysis = await self._basic_image_analysis(image, opencv_image)
            
            # Authenticity analysis
            authenticity_analysis = await self._analyze_authenticity(image, opencv_image)
            
            # Content analysis based on type
            content_analysis = await self._analyze_content(image, opencv_image, analysis_type)
            
            # Damage assessment if relevant
            damage_analysis = None
            if analysis_type in ["vehicle", "health", "property"]:
                damage_analysis = await self._assess_damage(image, opencv_image, analysis_type)
            
            # Quality assessment
            quality_analysis = await self._assess_quality(image, opencv_image)
            
            processing_time = time.time() - start_time
            
            result = {
                "filename": filename,
                "analysis_type": analysis_type,
                "authenticity_score": authenticity_analysis["score"],
                "quality_score": quality_analysis["score"],
                "processing_time": processing_time,
                "basic_info": basic_analysis,
                "authenticity_details": authenticity_analysis,
                "content_analysis": content_analysis,
                "quality_details": quality_analysis
            }
            
            if damage_analysis:
                result["damage_assessment"] = damage_analysis
                result["estimated_cost"] = damage_analysis.get("estimated_cost", 0)
            
            logger.info(f"✅ Image analysis completed: {filename}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error analyzing image {filename}: {e}")
            return {
                "filename": filename,
                "error": str(e),
                "authenticity_score": 0.5,
                "quality_score": 0.5,
                "processing_time": time.time() - start_time
            }
    
    async def _basic_image_analysis(self, image: Image.Image, opencv_image: np.ndarray) -> Dict[str, Any]:
        """Extract basic image information"""
        try:
            # Image dimensions and properties
            width, height = image.size
            channels = len(image.getbands())
            mode = image.mode
            
            # File size estimation
            img_bytes = io.BytesIO()
            image.save(img_bytes, format='JPEG')
            file_size = len(img_bytes.getvalue())
            
            # Color analysis
            colors = image.getcolors(maxcolors=256*256*256)
            unique_colors = len(colors) if colors else 0
            
            # Calculate image hash for deduplication
            img_hash = str(imagehash.average_hash(image))
            
            return {
                "dimensions": {"width": width, "height": height},
                "channels": channels,
                "mode": mode,
                "file_size_bytes": file_size,
                "unique_colors": unique_colors,
                "image_hash": img_hash,
                "aspect_ratio": width / height if height > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Error in basic image analysis: {e}")
            return {"error": str(e)}
    
    async def _analyze_authenticity(self, image: Image.Image, opencv_image: np.ndarray) -> Dict[str, Any]:
        """Analyze image for signs of tampering or manipulation"""
        try:
            authenticity_indicators = []
            authenticity_score = 1.0  # Start with high authenticity
            
            # Check for compression artifacts
            compression_score = await self._check_compression_artifacts(opencv_image)
            if compression_score > self.tampering_thresholds["compression_artifacts"]:
                authenticity_indicators.append("Suspicious compression artifacts detected")
                authenticity_score -= 0.2
            
            # Check for noise patterns
            noise_score = await self._check_noise_patterns(opencv_image)
            if noise_score > self.tampering_thresholds["noise_patterns"]:
                authenticity_indicators.append("Unusual noise patterns detected")
                authenticity_score -= 0.15
            
            # Check for color inconsistencies
            color_score = await self._check_color_consistency(opencv_image)
            if color_score > self.tampering_thresholds["color_inconsistency"]:
                authenticity_indicators.append("Color inconsistencies detected")
                authenticity_score -= 0.2
            
            # Check for edge discontinuities
            edge_score = await self._check_edge_discontinuities(opencv_image)
            if edge_score > self.tampering_thresholds["edge_discontinuity"]:
                authenticity_indicators.append("Edge discontinuities suggest editing")
                authenticity_score -= 0.25
            
            # EXIF data analysis
            exif_analysis = await self._analyze_exif_data(image)
            if exif_analysis["suspicious"]:
                authenticity_indicators.extend(exif_analysis["issues"])
                authenticity_score -= 0.1
            
            # Ensure score stays within bounds
            authenticity_score = max(0.0, min(1.0, authenticity_score))
            
            return {
                "score": authenticity_score,
                "indicators": authenticity_indicators,
                "compression_score": compression_score,
                "noise_score": noise_score,
                "color_score": color_score,
                "edge_score": edge_score,
                "exif_analysis": exif_analysis
            }
            
        except Exception as e:
            logger.error(f"❌ Error in authenticity analysis: {e}")
            return {"score": 0.5, "error": str(e)}
    
    async def _check_compression_artifacts(self, image: np.ndarray) -> float:
        """Check for suspicious compression artifacts"""
        try:
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply DCT to detect compression artifacts
            dct = cv2.dct(np.float32(gray))
            
            # Analyze frequency distribution
            freq_variance = np.var(dct)
            
            # Detect blocking artifacts (8x8 patterns typical of JPEG)
            block_variance = 0
            h, w = gray.shape
            for i in range(0, h-8, 8):
                for j in range(0, w-8, 8):
                    block = gray[i:i+8, j:j+8]
                    block_variance += np.var(block)
            
            block_variance /= ((h//8) * (w//8))
            
            # Calculate compression artifact score
            artifact_score = min(1.0, (freq_variance / 1000 + block_variance / 100) / 2)
            
            return artifact_score
            
        except Exception as e:
            logger.error(f"❌ Error checking compression artifacts: {e}")
            return 0.0
    
    async def _check_noise_patterns(self, image: np.ndarray) -> float:
        """Check for unusual noise patterns that might indicate manipulation"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply noise analysis
            blur = cv2.GaussianBlur(gray, (5, 5), 0)
            noise = cv2.subtract(gray, blur)
            
            # Calculate noise statistics
            noise_mean = np.mean(noise)
            noise_std = np.std(noise)
            
            # Check for periodic patterns in noise
            fft = np.fft.fft2(noise)
            fft_magnitude = np.abs(fft)
            
            # Look for suspicious peaks in frequency domain
            sorted_magnitudes = np.sort(fft_magnitude.flatten())
            top_magnitudes = sorted_magnitudes[-10:]
            magnitude_ratio = np.max(top_magnitudes) / np.mean(top_magnitudes) if np.mean(top_magnitudes) > 0 else 0
            
            # Calculate noise pattern score
            noise_score = min(1.0, (noise_std / 50 + magnitude_ratio / 100) / 2)
            
            return noise_score
            
        except Exception as e:
            logger.error(f"❌ Error checking noise patterns: {e}")
            return 0.0
    
    async def _check_color_consistency(self, image: np.ndarray) -> float:
        """Check for color inconsistencies across the image"""
        try:
            # Convert to LAB color space for better color analysis
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            
            # Divide image into regions and analyze color distribution
            h, w = lab.shape[:2]
            regions = []
            
            # Create 4x4 grid of regions
            for i in range(4):
                for j in range(4):
                    start_y = i * h // 4
                    end_y = (i + 1) * h // 4
                    start_x = j * w // 4
                    end_x = (j + 1) * w // 4
                    
                    region = lab[start_y:end_y, start_x:end_x]
                    regions.append(region)
            
            # Calculate color statistics for each region
            color_stats = []
            for region in regions:
                l_mean, a_mean, b_mean = np.mean(region, axis=(0, 1))
                l_std, a_std, b_std = np.std(region, axis=(0, 1))
                color_stats.append([l_mean, a_mean, b_mean, l_std, a_std, b_std])
            
            color_stats = np.array(color_stats)
            
            # Check for outlier regions
            mean_stats = np.mean(color_stats, axis=0)
            std_stats = np.std(color_stats, axis=0)
            
            outlier_count = 0
            for stats in color_stats:
                deviations = np.abs(stats - mean_stats) / (std_stats + 1e-8)
                if np.any(deviations > 2):  # More than 2 standard deviations
                    outlier_count += 1
            
            # Calculate color consistency score
            consistency_score = outlier_count / len(regions)
            
            return consistency_score
            
        except Exception as e:
            logger.error(f"❌ Error checking color consistency: {e}")
            return 0.0
    
    async def _check_edge_discontinuities(self, image: np.ndarray) -> float:
        """Check for edge discontinuities that might indicate splicing"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply edge detection
            edges = cv2.Canny(gray, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Analyze edge continuity
            discontinuity_count = 0
            total_edges = 0
            
            for contour in contours:
                if len(contour) > 10:  # Only consider significant contours
                    total_edges += 1
                    
                    # Check for sudden direction changes
                    points = contour.reshape(-1, 2)
                    
                    for i in range(2, len(points) - 2):
                        # Calculate angle changes
                        v1 = points[i] - points[i-1]
                        v2 = points[i+1] - points[i]
                        
                        # Calculate angle between vectors
                        angle = np.arccos(np.clip(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8), -1, 1))
                        
                        # Check for sharp angle changes (potential splicing indicators)
                        if angle > np.pi / 3:  # More than 60 degrees
                            discontinuity_count += 1
                            break
            
            # Calculate discontinuity score
            discontinuity_score = discontinuity_count / max(total_edges, 1)
            
            return discontinuity_score
            
        except Exception as e:
            logger.error(f"❌ Error checking edge discontinuities: {e}")
            return 0.0
    
    async def _analyze_exif_data(self, image: Image.Image) -> Dict[str, Any]:
        """Analyze EXIF data for authenticity indicators"""
        try:
            exif_data = image._getexif() if hasattr(image, '_getexif') else None
            suspicious = False
            issues = []
            
            if exif_data is None:
                issues.append("No EXIF data found")
                suspicious = True
            else:
                # Check for common editing software traces
                software_tags = [272, 305]  # Make, Software
                for tag in software_tags:
                    if tag in exif_data:
                        software = str(exif_data[tag]).lower()
                        if any(editor in software for editor in ['photoshop', 'gimp', 'paint', 'editor']):
                            issues.append(f"Image editing software detected: {software}")
                            suspicious = True
                
                # Check for modification date vs creation date
                date_tags = {306: "DateTime", 36867: "DateTimeOriginal", 36868: "DateTimeDigitized"}
                dates = {}
                for tag, name in date_tags.items():
                    if tag in exif_data:
                        dates[name] = exif_data[tag]
                
                if len(dates) > 1:
                    date_values = list(dates.values())
                    if not all(d == date_values[0] for d in date_values):
                        issues.append("Inconsistent date/time stamps in EXIF")
                        suspicious = True
            
            return {
                "suspicious": suspicious,
                "issues": issues,
                "has_exif": exif_data is not None,
                "exif_tags_count": len(exif_data) if exif_data else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Error analyzing EXIF data: {e}")
            return {"suspicious": False, "issues": [], "error": str(e)}
    
    async def _analyze_content(self, image: Image.Image, opencv_image: np.ndarray, analysis_type: str) -> Dict[str, Any]:
        """Analyze image content based on type"""
        try:
            content_analysis = {}
            
            # Object detection (simplified)
            detected_objects = await self._detect_objects(opencv_image, analysis_type)
            content_analysis["detected_objects"] = detected_objects
            
            # Text detection in image
            detected_text = await self._detect_text_in_image(opencv_image)
            content_analysis["detected_text"] = detected_text
            
            # Scene analysis
            scene_analysis = await self._analyze_scene(opencv_image, analysis_type)
            content_analysis["scene_analysis"] = scene_analysis
            
            return content_analysis
            
        except Exception as e:
            logger.error(f"❌ Error in content analysis: {e}")
            return {"error": str(e)}
    
    async def _detect_objects(self, image: np.ndarray, analysis_type: str) -> List[Dict[str, Any]]:
        """Detect objects relevant to the claim type"""
        try:
            # This is a simplified implementation
            # In production, use YOLO, SSD, or other object detection models
            
            detected_objects = []
            
            # Use color-based detection as a simple example
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            if analysis_type == "vehicle":
                # Look for car-like shapes and colors
                # This is very simplified - real implementation would use trained models
                car_colors = [
                    ([0, 0, 0], [180, 255, 50]),      # Dark colors (black, dark blue, etc.)
                    ([0, 0, 200], [180, 30, 255]),    # Light colors (white, silver, etc.)
                ]
                
                for i, (lower, upper) in enumerate(car_colors):
                    mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
                    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    
                    for contour in contours:
                        area = cv2.contourArea(contour)
                        if area > 1000:  # Significant area
                            x, y, w, h = cv2.boundingRect(contour)
                            detected_objects.append({
                                "type": "vehicle_part",
                                "confidence": 0.6,  # Simplified confidence
                                "bbox": [x, y, w, h],
                                "area": area
                            })
            
            return detected_objects[:10]  # Limit to top 10 detections
            
        except Exception as e:
            logger.error(f"❌ Error detecting objects: {e}")
            return []
    
    async def _detect_text_in_image(self, image: np.ndarray) -> List[str]:
        """Detect text in the image"""
        try:
            # This would integrate with OCR service in a real implementation
            # For now, return empty list
            return []
        except Exception as e:
            logger.error(f"❌ Error detecting text: {e}")
            return []
    
    async def _analyze_scene(self, image: np.ndarray, analysis_type: str) -> Dict[str, Any]:
        """Analyze the scene context"""
        try:
            scene_analysis = {}
            
            # Lighting analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            brightness = np.mean(gray)
            contrast = np.std(gray)
            
            scene_analysis["lighting"] = {
                "brightness": float(brightness),
                "contrast": float(contrast),
                "quality": "good" if 50 < brightness < 200 and contrast > 20 else "poor"
            }
            
            # Color analysis
            dominant_colors = await self._get_dominant_colors(image)
            scene_analysis["dominant_colors"] = dominant_colors
            
            # Focus/blur analysis
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            scene_analysis["focus_quality"] = {
                "blur_score": float(blur_score),
                "quality": "sharp" if blur_score > 100 else "blurred"
            }
            
            return scene_analysis
            
        except Exception as e:
            logger.error(f"❌ Error analyzing scene: {e}")
            return {"error": str(e)}
    
    async def _get_dominant_colors(self, image: np.ndarray, k: int = 5) -> List[List[int]]:
        """Get dominant colors in the image"""
        try:
            # Reshape image to be a list of pixels
            pixels = image.reshape(-1, 3)
            
            # Use k-means clustering to find dominant colors
            from sklearn.cluster import KMeans
            
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            # Get the dominant colors
            dominant_colors = kmeans.cluster_centers_.astype(int)
            
            return dominant_colors.tolist()
            
        except Exception as e:
            logger.error(f"❌ Error getting dominant colors: {e}")
            return []
    
    async def _assess_damage(self, image: Image.Image, opencv_image: np.ndarray, damage_type: str) -> Dict[str, Any]:
        """Assess damage based on claim type"""
        try:
            damage_assessment = {}
            
            # Damage severity analysis
            severity = await self._assess_damage_severity(opencv_image, damage_type)
            damage_assessment["severity"] = severity
            
            # Cost estimation based on damage
            estimated_cost = await self._estimate_damage_cost(opencv_image, damage_type, severity)
            damage_assessment["estimated_cost"] = estimated_cost
            
            # Damage location analysis
            damage_locations = await self._identify_damage_locations(opencv_image, damage_type)
            damage_assessment["damage_locations"] = damage_locations
            
            # Consistency check
            consistency_score = await self._check_damage_consistency(opencv_image, damage_type, severity)
            damage_assessment["consistency_score"] = consistency_score
            
            return damage_assessment
            
        except Exception as e:
            logger.error(f"❌ Error assessing damage: {e}")
            return {"error": str(e)}
    
    async def _assess_damage_severity(self, image: np.ndarray, damage_type: str) -> Dict[str, Any]:
        """Assess the severity of damage in the image"""
        try:
            # Convert to different color spaces for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Edge detection to find damage patterns
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
            
            # Color variance analysis (damaged areas often have different colors)
            color_variance = np.var(image, axis=(0, 1))
            total_variance = np.sum(color_variance)
            
            # Texture analysis
            texture_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Calculate damage indicators
            damage_indicators = {
                "edge_density": float(edge_density),
                "color_variance": float(total_variance),
                "texture_irregularity": float(texture_score)
            }
            
            # Determine severity based on indicators
            if damage_type == "vehicle":
                if edge_density > 0.1 and total_variance > 1000:
                    severity_level = "severe"
                    severity_score = 0.8
                elif edge_density > 0.05 and total_variance > 500:
                    severity_level = "moderate"
                    severity_score = 0.5
                else:
                    severity_level = "minor"
                    severity_score = 0.2
            else:
                # Generic severity assessment
                severity_score = min(1.0, (edge_density * 5 + total_variance / 1000) / 2)
                if severity_score > 0.7:
                    severity_level = "severe"
                elif severity_score > 0.4:
                    severity_level = "moderate"
                else:
                    severity_level = "minor"
            
            return {
                "level": severity_level,
                "score": severity_score,
                "indicators": damage_indicators
            }
            
        except Exception as e:
            logger.error(f"❌ Error assessing damage severity: {e}")
            return {"level": "unknown", "score": 0.5, "error": str(e)}
    
    async def _estimate_damage_cost(self, image: np.ndarray, damage_type: str, severity: Dict[str, Any]) -> float:
        """Estimate repair/replacement cost based on damage"""
        try:
            base_costs = {
                "vehicle": {"minor": 500, "moderate": 2000, "severe": 8000},
                "health": {"minor": 200, "moderate": 1000, "severe": 5000},
                "property": {"minor": 300, "moderate": 1500, "severe": 10000}
            }
            
            severity_level = severity.get("level", "moderate")
            base_cost = base_costs.get(damage_type, base_costs["property"])[severity_level]
            
            # Adjust based on severity score
            severity_score = severity.get("score", 0.5)
            adjusted_cost = base_cost * (0.5 + severity_score)
            
            return round(adjusted_cost, 2)
            
        except Exception as e:
            logger.error(f"❌ Error estimating damage cost: {e}")
            return 1000.0  # Default estimate
    
    async def _identify_damage_locations(self, image: np.ndarray, damage_type: str) -> List[Dict[str, Any]]:
        """Identify locations of damage in the image"""
        try:
            locations = []
            
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Find areas with high edge density (potential damage)
            edges = cv2.Canny(gray, 50, 150)
            kernel = np.ones((10, 10), np.uint8)
            dilated = cv2.dilate(edges, kernel, iterations=1)
            
            # Find contours
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 500:  # Significant damage area
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    # Calculate relative position
                    img_h, img_w = image.shape[:2]
                    rel_x = x / img_w
                    rel_y = y / img_h
                    
                    # Determine location description
                    location_desc = self._get_location_description(rel_x, rel_y, damage_type)
                    
                    locations.append({
                        "description": location_desc,
                        "bbox": [x, y, w, h],
                        "relative_position": [rel_x, rel_y],
                        "area": area
                    })
            
            return locations[:5]  # Return top 5 damage locations
            
        except Exception as e:
            logger.error(f"❌ Error identifying damage locations: {e}")
            return []
    
    def _get_location_description(self, rel_x: float, rel_y: float, damage_type: str) -> str:
        """Get location description based on relative position"""
        if damage_type == "vehicle":
            if rel_y < 0.3:
                return "Upper section"
            elif rel_y > 0.7:
                return "Lower section"
            
            if rel_x < 0.3:
                return "Left side"
            elif rel_x > 0.7:
                return "Right side"
            else:
                return "Center section"
        else:
            # Generic location description
            h_pos = "left" if rel_x < 0.33 else "right" if rel_x > 0.66 else "center"
            v_pos = "upper" if rel_y < 0.33 else "lower" if rel_y > 0.66 else "middle"
            return f"{v_pos} {h_pos}"
    
    async def _check_damage_consistency(self, image: np.ndarray, damage_type: str, severity: Dict[str, Any]) -> float:
        """Check if damage is consistent with claim type and severity"""
        try:
            # This is a simplified consistency check
            # In production, use trained models for specific damage types
            
            consistency_score = 1.0
            
            # Check if damage patterns match expected type
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # Different damage types have different edge patterns
            edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
            expected_edge_density = {
                "vehicle": 0.05,  # Vehicles have moderate edge density when damaged
                "health": 0.02,   # Medical images typically have lower edge density
                "property": 0.08  # Property damage often has high edge density
            }
            
            expected = expected_edge_density.get(damage_type, 0.05)
            density_diff = abs(edge_density - expected) / expected
            
            if density_diff > 0.5:  # More than 50% difference
                consistency_score -= 0.3
            
            # Check severity consistency
            severity_score = severity.get("score", 0.5)
            if damage_type == "vehicle" and severity_score > 0.8:
                # Very severe vehicle damage should have specific characteristics
                # This is simplified - real implementation would check for specific patterns
                pass
            
            return max(0.0, consistency_score)
            
        except Exception as e:
            logger.error(f"❌ Error checking damage consistency: {e}")
            return 0.5
    
    async def _assess_quality(self, image: Image.Image, opencv_image: np.ndarray) -> Dict[str, Any]:
        """Assess overall image quality"""
        try:
            quality_metrics = {}
            
            # Resolution quality
            width, height = image.size
            total_pixels = width * height
            quality_metrics["resolution"] = {
                "width": width,
                "height": height,
                "total_pixels": total_pixels,
                "quality": "high" if total_pixels > 1000000 else "medium" if total_pixels > 300000 else "low"
            }
            
            # Blur detection
            gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            quality_metrics["sharpness"] = {
                "score": float(blur_score),
                "quality": "sharp" if blur_score > 100 else "acceptable" if blur_score > 50 else "blurred"
            }
            
            # Brightness and contrast
            brightness = np.mean(gray)
            contrast = np.std(gray)
            quality_metrics["exposure"] = {
                "brightness": float(brightness),
                "contrast": float(contrast),
                "quality": "good" if 50 < brightness < 200 and contrast > 20 else "poor"
            }
            
            # Overall quality score
            resolution_score = min(1.0, total_pixels / 1000000)
            sharpness_score = min(1.0, blur_score / 200)
            exposure_score = 1.0 if 50 < brightness < 200 and contrast > 20 else 0.5
            
            overall_score = (resolution_score + sharpness_score + exposure_score) / 3
            quality_metrics["overall_score"] = overall_score
            
            return quality_metrics
            
        except Exception as e:
            logger.error(f"❌ Error assessing quality: {e}")
            return {"overall_score": 0.5, "error": str(e)} 