import os
import sys
from loguru import logger
from datetime import datetime

def setup_logger():
    """Setup logging configuration for the AI service"""
    
    # Remove default logger
    logger.remove()
    
    # Get log level from environment
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Console logging with colors
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=log_level,
        colorize=True
    )
    
    # File logging
    log_dir = os.getenv("LOG_DIR", "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    # Main log file
    logger.add(
        f"{log_dir}/ai_service.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level=log_level,
        rotation="100 MB",
        retention="7 days",
        compression="zip"
    )
    
    # Error log file
    logger.add(
        f"{log_dir}/errors.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="ERROR",
        rotation="50 MB",
        retention="30 days",
        compression="zip"
    )
    
    # Performance log file
    logger.add(
        f"{log_dir}/performance.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {message}",
        filter=lambda record: "PERFORMANCE" in record["message"],
        rotation="50 MB",
        retention="7 days",
        compression="zip"
    )
    
    logger.info("🚀 Logger initialized for GuardChain AI Service")

def log_performance(operation: str, duration: float, details: dict = None):
    """Log performance metrics"""
    message = f"PERFORMANCE | {operation} | Duration: {duration:.3f}s"
    if details:
        message += f" | Details: {details}"
    logger.info(message)

def log_api_request(endpoint: str, client: str, processing_time: float = None):
    """Log API request"""
    message = f"API_REQUEST | {endpoint} | Client: {client}"
    if processing_time:
        message += f" | Time: {processing_time:.3f}s"
    logger.info(message)

def log_error_with_context(error: Exception, context: dict = None):
    """Log error with additional context"""
    message = f"ERROR | {type(error).__name__}: {str(error)}"
    if context:
        message += f" | Context: {context}"
    logger.error(message)

def log_security_event(event_type: str, details: dict = None):
    """Log security-related events"""
    message = f"SECURITY | {event_type}"
    if details:
        message += f" | Details: {details}"
    logger.warning(message) 