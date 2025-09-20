# GuardChain AI - AI Processing Service

AI-powered document processing, OCR, fraud detection, and image analysis service for the GuardChain insurance platform.

## Features

- **Document Processing**: OCR extraction from PDFs and images using Tesseract and EasyOCR
- **Fraud Detection**: ML-based fraud analysis with pattern detection and risk scoring
- **Image Analysis**: Authenticity verification, damage assessment, and quality analysis
- **Document Validation**: Structure validation and data integrity checks
- **Batch Processing**: Handle multiple documents simultaneously
- **API Security**: JWT authentication and rate limiting

## Installation

### Local Development

1. **Install Python Dependencies**:
```bash
pip install -r requirements.txt
```

2. **Install System Dependencies**:
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract

# Windows
# Download and install from: https://github.com/UB-Mannheim/tesseract/wiki
```

3. **Setup Environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run the Service**:
```bash
python main.py
```

### Docker Deployment

1. **Build and Run**:
```bash
docker-compose up -d
```

2. **View Logs**:
```bash
docker-compose logs -f ai-service
```

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health check with service status

### Document Processing
- `POST /process-document` - Process single document
- `POST /batch-process` - Process multiple documents

### Claim Analysis
- `POST /analyze-claim` - Complete claim analysis
- `POST /analyze-image` - Image analysis only

## Authentication

All endpoints require an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8001/health
```

### API Keys
- `guardchain_backend`: Backend service integration
- `guardchain_admin`: Admin panel access
- `guardchain_test`: Testing and development

## Usage Examples

### Analyze Claim
```python
import requests

url = "http://localhost:8001/analyze-claim"
headers = {"Authorization": "Bearer guardchain_dev_key_2024"}

data = {
    "claimId": "claim_123",
    "claimType": "health",
    "requestedAmount": 1500.00,
    "description": "Emergency room visit for injury",
    "documents": ["QmDocumentHash1", "QmDocumentHash2"],
    "images": ["QmImageHash1"]
}

response = requests.post(url, json=data, headers=headers)
result = response.json()

print(f"Fraud Score: {result['fraudScore']}")
print(f"Recommendation: {result['recommendation']}")
```

### Process Document
```python
url = "http://localhost:8001/process-document"
headers = {"Authorization": "Bearer guardchain_dev_key_2024"}

with open("medical_bill.pdf", "rb") as f:
    files = {"file": f}
    data = {"document_type": "medical_bill"}
    
    response = requests.post(url, files=files, data=data, headers=headers)
    result = response.json()

print(f"Extracted Text: {result['text']}")
print(f"Confidence: {result['confidence']}")
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 8001 |
| `LOG_LEVEL` | Logging level | INFO |
| `USE_GPU` | Enable GPU acceleration | false |
| `MAX_FILE_SIZE_MB` | Maximum file size | 50 |
| `PROCESSING_TIMEOUT_SECONDS` | Processing timeout | 300 |

### Model Configuration

- **OCR Engines**: Tesseract + EasyOCR for best accuracy
- **Fraud Detection**: Scikit-learn based anomaly detection
- **Image Analysis**: OpenCV + PIL for image processing

## Performance

### Typical Processing Times
- Document OCR: 2-10 seconds
- Image Analysis: 1-5 seconds
- Fraud Detection: 0.5-2 seconds
- Complete Claim Analysis: 5-20 seconds

### Optimization Tips
- Enable GPU acceleration for faster processing
- Use batch processing for multiple documents
- Implement result caching for repeated analyses

## Monitoring

### Health Checks
The service provides comprehensive health checks:

```bash
curl http://localhost:8001/health
```

### Logs
- Application logs: `logs/ai_service.log`
- Error logs: `logs/errors.log`
- Performance logs: `logs/performance.log`

### Metrics
Monitor key metrics:
- Request rate and response times
- Processing accuracy scores
- Error rates by endpoint
- Resource utilization

## Development

### Adding New Features

1. **New Document Type**:
   - Add validation rules in `services/document_validator.py`
   - Update extraction logic in `services/ocr_service.py`
   - Add test cases

2. **New Analysis Type**:
   - Extend `services/image_analysis_service.py`
   - Update models in `models/analysis_models.py`
   - Add endpoint in `main.py`

### Testing

```bash
# Run tests
python -m pytest tests/

# Test specific endpoint
curl -X POST http://localhost:8001/analyze-claim \
  -H "Authorization: Bearer chainsure_test_key_2024" \
  -H "Content-Type: application/json" \
  -d '{"claimId": "test_001", "claimType": "health", "requestedAmount": 100, "description": "Test claim"}'
```

## Production Deployment

### Scaling
- Deploy multiple instances behind a load balancer
- Use Redis for rate limiting and caching
- Implement horizontal pod autoscaling in Kubernetes

### Security
- Use strong API keys and rotate regularly
- Implement request signing for critical operations
- Set up proper network isolation
- Enable audit logging

### Monitoring
- Set up Prometheus metrics collection
- Configure alerting for service health
- Monitor processing queues and response times

## Troubleshooting

### Common Issues

1. **Tesseract Not Found**:
   ```bash
   # Install tesseract-ocr
   sudo apt-get install tesseract-ocr tesseract-ocr-eng
   ```

2. **Memory Issues**:
   - Reduce batch size
   - Increase container memory limits
   - Enable swap if needed

3. **Processing Timeouts**:
   - Increase `PROCESSING_TIMEOUT_SECONDS`
   - Optimize image preprocessing
   - Use GPU acceleration

### Support
For issues and support:
- Check logs in `logs/` directory
- Review health check status
- Contact development team

## License

This project is part of the GuardChain AI insurance platform. 