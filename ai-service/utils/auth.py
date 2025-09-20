import os
from fastapi import HTTPException, status
from loguru import logger
import hashlib
import hmac
import time
from typing import Dict, Any

# API key configuration
API_KEYS = {
    "chainsure_backend": os.getenv("BACKEND_API_KEY", "chainsure_dev_key_2024"),
    "chainsure_admin": os.getenv("ADMIN_API_KEY", "chainsure_admin_key_2024"),
    "chainsure_test": os.getenv("TEST_API_KEY", "chainsure_test_key_2024")
}

# Rate limiting storage (in production, use Redis)
rate_limit_storage = {}

async def verify_api_key(api_key: str) -> Dict[str, Any]:
    """Verify API key and return client info"""
    try:
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key is required"
            )
        
        # Check if API key is valid
        client_info = None
        for client_name, valid_key in API_KEYS.items():
            if api_key == valid_key:
                client_info = {
                    "client_name": client_name,
                    "permissions": get_client_permissions(client_name),
                    "rate_limit": get_rate_limit(client_name)
                }
                break
        
        if not client_info:
            logger.warning(f"Invalid API key attempted: {api_key[:10]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # Check rate limiting
        await check_rate_limit(api_key, client_info["rate_limit"])
        
        logger.info(f"API key verified for client: {client_info['client_name']}")
        return client_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

def get_client_permissions(client_name: str) -> Dict[str, bool]:
    """Get permissions for client"""
    permissions = {
        "chainsure_backend": {
            "analyze_claim": True,
            "process_document": True,
            "analyze_image": True,
            "batch_process": True,
            "admin_endpoints": False
        },
        "chainsure_admin": {
            "analyze_claim": True,
            "process_document": True,
            "analyze_image": True,
            "batch_process": True,
            "admin_endpoints": True
        },
        "chainsure_test": {
            "analyze_claim": True,
            "process_document": True,
            "analyze_image": False,
            "batch_process": False,
            "admin_endpoints": False
        }
    }
    
    return permissions.get(client_name, {})

def get_rate_limit(client_name: str) -> Dict[str, int]:
    """Get rate limits for client (requests per minute)"""
    rate_limits = {
        "chainsure_backend": {"requests_per_minute": 100},
        "chainsure_admin": {"requests_per_minute": 200},
        "chainsure_test": {"requests_per_minute": 10}
    }
    
    return rate_limits.get(client_name, {"requests_per_minute": 10})

async def check_rate_limit(api_key: str, rate_limit: Dict[str, int]):
    """Check rate limiting for API key"""
    try:
        current_time = int(time.time())
        window_start = current_time - 60  # 1-minute window
        
        # Clean old entries
        if api_key in rate_limit_storage:
            rate_limit_storage[api_key] = [
                timestamp for timestamp in rate_limit_storage[api_key]
                if timestamp > window_start
            ]
        else:
            rate_limit_storage[api_key] = []
        
        # Check current request count
        current_requests = len(rate_limit_storage[api_key])
        max_requests = rate_limit["requests_per_minute"]
        
        if current_requests >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {max_requests} requests per minute."
            )
        
        # Add current request
        rate_limit_storage[api_key].append(current_time)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking rate limit: {e}")
        # Don't block on rate limit errors in development
        pass

def generate_api_key(client_name: str) -> str:
    """Generate a new API key for a client"""
    timestamp = str(int(time.time()))
    data = f"{client_name}:{timestamp}"
    
    # Use HMAC for secure key generation
    secret = os.getenv("API_KEY_SECRET", "chainsure_secret_key_2024")
    signature = hmac.new(
        secret.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return f"cs_{client_name}_{timestamp}_{signature[:16]}"

def hash_api_key(api_key: str) -> str:
    """Hash API key for secure storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()

async def validate_permissions(client_info: Dict[str, Any], required_permission: str) -> bool:
    """Validate if client has required permission"""
    permissions = client_info.get("permissions", {})
    return permissions.get(required_permission, False) 