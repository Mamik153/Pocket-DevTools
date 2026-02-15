---
name: senior-python-ai-dev
description: Expert-level Python development with AI/ML integration, FastAPI applications, message queues, async patterns, logging, monitoring, and production-ready architecture. Use when building production Python applications, AI-powered services, REST APIs with FastAPI, implementing message queues (RabbitMQ, Kafka, Redis), designing microservices, or requiring sophisticated logging and observability. Also applies to refactoring legacy code, optimizing performance, implementing CI/CD pipelines, or architecting scalable backend systems.
---

# Senior Python Developer with AI Skills

This skill provides expert guidance for building production-grade Python applications with AI/ML integration, modern web frameworks, message queues, and enterprise-grade logging and monitoring.

## Core Principles

### 1. Production-First Mindset
- Write code that's maintainable, testable, and observable from day one
- Implement proper error handling, retries, and circuit breakers
- Design for failure - assume external services will fail
- Include comprehensive logging and metrics from the start
- Use type hints consistently for better IDE support and fewer runtime errors

### 2. Async-First Architecture
- Leverage async/await for I/O-bound operations
- Use asyncio for concurrent operations
- Understand when to use threading vs multiprocessing vs async
- Properly handle async context managers and cleanup

### 3. Observability by Default
- Structured logging with context
- Distributed tracing for microservices
- Metrics and health checks
- Proper exception tracking with stack traces

## Technology Stack Patterns

### FastAPI Applications

FastAPI is the modern choice for building Python APIs. Follow these patterns:

```python
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import Optional, List
import structlog
from prometheus_client import Counter, Histogram
import time

# Structured logging setup
logger = structlog.get_logger()

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])

app = FastAPI(
    title="Production API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Middleware for logging and metrics
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    
    # Add request ID to context
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    structlog.contextvars.bind_contextvars(request_id=request_id)
    
    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
    )
    
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        logger.info(
            "request_completed",
            status_code=response.status_code,
            duration=duration,
        )
        
        response.headers["X-Request-ID"] = request_id
        return response
        
    except Exception as e:
        logger.exception("request_failed", error=str(e))
        raise

# Pydantic models with validation
class InferenceRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Input text for inference")
    model: str = Field(default="default", description="Model identifier")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=1, le=4096)
    
    @validator('text')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError('Text cannot be empty or only whitespace')
        return v.strip()

class InferenceResponse(BaseModel):
    result: str
    model: str
    tokens_used: int
    processing_time_ms: float

# Dependency injection for services
async def get_ai_service():
    # This would return your AI service instance
    # Use dependency injection to manage lifecycle
    return ai_service

# Endpoints with proper error handling
@app.post("/api/v1/inference", response_model=InferenceResponse)
async def run_inference(
    request: InferenceRequest,
    background_tasks: BackgroundTasks,
    ai_service = Depends(get_ai_service)
):
    """
    Run AI inference on input text.
    
    - Validates input using Pydantic
    - Implements timeout and retry logic
    - Returns structured response
    - Logs all operations
    """
    start_time = time.time()
    
    try:
        logger.info(
            "inference_started",
            model=request.model,
            text_length=len(request.text),
            temperature=request.temperature
        )
        
        # Call AI service with timeout
        result = await ai_service.generate(
            text=request.text,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            timeout=30.0  # 30 second timeout
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Background task for analytics (non-blocking)
        background_tasks.add_task(
            log_inference_analytics,
            model=request.model,
            tokens=result.tokens_used,
            duration=processing_time
        )
        
        logger.info(
            "inference_completed",
            tokens_used=result.tokens_used,
            processing_time_ms=processing_time
        )
        
        return InferenceResponse(
            result=result.text,
            model=request.model,
            tokens_used=result.tokens_used,
            processing_time_ms=processing_time
        )
        
    except asyncio.TimeoutError:
        logger.error("inference_timeout", model=request.model)
        raise HTTPException(
            status_code=504,
            detail="Inference request timed out"
        )
    except Exception as e:
        logger.exception("inference_failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(e)}"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers"""
    return {
        "status": "healthy",
        "timestamp": time.time()
    }

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("application_starting")
    # Initialize database connections, message queues, etc.
    await initialize_services()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("application_shutting_down")
    # Cleanup resources
    await cleanup_services()
```

### Key FastAPI Patterns:
1. **Always use Pydantic models** for request/response validation
2. **Implement middleware** for logging, metrics, and request tracking
3. **Use dependency injection** for services and database connections
4. **Background tasks** for non-blocking operations
5. **Proper HTTP status codes** and error responses
6. **Health check endpoints** for orchestration
7. **API versioning** in URLs (`/api/v1/`)
8. **OpenAPI documentation** is auto-generated

### AI/ML Integration

When integrating AI models into production applications:

```python
import asyncio
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import anthropic
import openai
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

logger = structlog.get_logger()

class AIServiceError(Exception):
    """Custom exception for AI service errors"""
    pass

class AIService:
    """
    Production-ready AI service with proper error handling,
    retries, and resource management.
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.model = None
        self.tokenizer = None
        self.client = None
        self._lock = asyncio.Lock()
        
    async def initialize(self):
        """Initialize AI models and clients"""
        try:
            logger.info("initializing_ai_service", config=self.config)
            
            if self.config.get("use_local_model"):
                # Local model initialization
                await self._load_local_model()
            else:
                # API-based initialization
                await self._initialize_api_client()
                
            logger.info("ai_service_initialized")
            
        except Exception as e:
            logger.exception("ai_service_initialization_failed", error=str(e))
            raise AIServiceError(f"Failed to initialize AI service: {e}")
    
    async def _load_local_model(self):
        """Load local transformer model"""
        model_name = self.config["model_name"]
        
        # Use asyncio.to_thread for CPU-bound loading
        self.tokenizer = await asyncio.to_thread(
            AutoTokenizer.from_pretrained,
            model_name
        )
        
        self.model = await asyncio.to_thread(
            AutoModelForCausalLM.from_pretrained,
            model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        
        logger.info("local_model_loaded", model=model_name)
    
    async def _initialize_api_client(self):
        """Initialize API client (OpenAI, Anthropic, etc.)"""
        provider = self.config["provider"]
        
        if provider == "anthropic":
            self.client = anthropic.AsyncAnthropic(
                api_key=self.config["api_key"]
            )
        elif provider == "openai":
            self.client = openai.AsyncOpenAI(
                api_key=self.config["api_key"]
            )
        
        logger.info("api_client_initialized", provider=provider)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def generate(
        self,
        text: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout: float = 30.0
    ) -> Dict[str, Any]:
        """
        Generate text with retry logic and timeout.
        
        Uses exponential backoff for retries.
        Properly handles timeouts and rate limits.
        """
        try:
            async with asyncio.timeout(timeout):
                if self.config.get("use_local_model"):
                    return await self._generate_local(text, temperature, max_tokens)
                else:
                    return await self._generate_api(text, model, temperature, max_tokens)
                    
        except asyncio.TimeoutError:
            logger.error("generation_timeout", timeout=timeout)
            raise
        except Exception as e:
            logger.exception("generation_failed", error=str(e))
            raise AIServiceError(f"Generation failed: {e}")
    
    async def _generate_local(
        self,
        text: str,
        temperature: float,
        max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """Generate using local model"""
        async with self._lock:  # Prevent concurrent GPU access
            inputs = await asyncio.to_thread(
                self.tokenizer,
                text,
                return_tensors="pt"
            )
            
            # Move to GPU
            inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
            
            # Generate
            outputs = await asyncio.to_thread(
                self.model.generate,
                **inputs,
                max_new_tokens=max_tokens or 512,
                temperature=temperature,
                do_sample=True
            )
            
            # Decode
            generated_text = await asyncio.to_thread(
                self.tokenizer.decode,
                outputs[0],
                skip_special_tokens=True
            )
            
            return {
                "text": generated_text,
                "tokens_used": len(outputs[0])
            }
    
    async def _generate_api(
        self,
        text: str,
        model: str,
        temperature: float,
        max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """Generate using API"""
        provider = self.config["provider"]
        
        if provider == "anthropic":
            response = await self.client.messages.create(
                model=model,
                max_tokens=max_tokens or 1024,
                temperature=temperature,
                messages=[{"role": "user", "content": text}]
            )
            
            return {
                "text": response.content[0].text,
                "tokens_used": response.usage.output_tokens
            }
            
        elif provider == "openai":
            response = await self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": text}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return {
                "text": response.choices[0].message.content,
                "tokens_used": response.usage.total_tokens
            }
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("cleaning_up_ai_service")
        
        if self.model is not None:
            # Clear GPU memory
            del self.model
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        if self.client is not None:
            # Close API client if needed
            if hasattr(self.client, 'close'):
                await self.client.close()
        
        logger.info("ai_service_cleaned_up")
```

### Key AI Integration Patterns:
1. **Async context managers** for resource management
2. **Retry logic with exponential backoff** for API calls
3. **Timeouts** on all external calls
4. **Locks for GPU access** when using local models
5. **Proper cleanup** of GPU memory and connections
6. **Structured logging** for debugging
7. **Custom exceptions** for better error handling
8. **Support for both local and API-based models**

### Message Queue Patterns

Implement robust message queue patterns for async processing:

```python
import asyncio
import json
from typing import Callable, Dict, Any, Optional
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
from aio_pika.abc import AbstractIncomingMessage
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger()

class MessageQueueService:
    """
    Production-ready RabbitMQ service with:
    - Connection pooling
    - Automatic reconnection
    - Dead letter queues
    - Message retries
    - Proper error handling
    """
    
    def __init__(self, connection_url: str):
        self.connection_url = connection_url
        self.connection: Optional[aio_pika.RobustConnection] = None
        self.channel: Optional[aio_pika.RobustChannel] = None
        self.consumers: Dict[str, asyncio.Task] = {}
        
    async def connect(self):
        """Establish connection with automatic reconnection"""
        try:
            self.connection = await aio_pika.connect_robust(
                self.connection_url,
                timeout=10.0,
                reconnect_interval=5.0,
                fail_fast=False
            )
            
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=10)  # Rate limiting
            
            logger.info("message_queue_connected")
            
        except Exception as e:
            logger.exception("message_queue_connection_failed", error=str(e))
            raise
    
    async def setup_queue(
        self,
        queue_name: str,
        durable: bool = True,
        with_dlq: bool = True
    ):
        """
        Setup queue with optional dead letter queue.
        
        Dead letter queues capture failed messages for later analysis.
        """
        # Setup dead letter exchange and queue
        if with_dlq:
            dlx_name = f"{queue_name}.dlx"
            dlq_name = f"{queue_name}.dlq"
            
            dlx = await self.channel.declare_exchange(
                dlx_name,
                ExchangeType.DIRECT,
                durable=True
            )
            
            dlq = await self.channel.declare_queue(
                dlq_name,
                durable=True
            )
            
            await dlq.bind(dlx)
            
            logger.info("dead_letter_queue_created", queue=queue_name)
            
            # Main queue with DLX
            queue = await self.channel.declare_queue(
                queue_name,
                durable=durable,
                arguments={
                    "x-dead-letter-exchange": dlx_name,
                    "x-message-ttl": 86400000,  # 24 hours
                }
            )
        else:
            queue = await self.channel.declare_queue(
                queue_name,
                durable=durable
            )
        
        logger.info("queue_created", queue=queue_name, durable=durable)
        return queue
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def publish(
        self,
        queue_name: str,
        message: Dict[str, Any],
        priority: int = 0
    ):
        """
        Publish message with retry logic.
        
        Messages are persistent and survive broker restarts.
        """
        try:
            body = json.dumps(message).encode()
            
            await self.channel.default_exchange.publish(
                Message(
                    body=body,
                    delivery_mode=DeliveryMode.PERSISTENT,
                    priority=priority,
                    content_type="application/json",
                    headers={
                        "x-published-at": time.time()
                    }
                ),
                routing_key=queue_name
            )
            
            logger.info(
                "message_published",
                queue=queue_name,
                message_size=len(body),
                priority=priority
            )
            
        except Exception as e:
            logger.exception(
                "message_publish_failed",
                queue=queue_name,
                error=str(e)
            )
            raise
    
    async def consume(
        self,
        queue_name: str,
        callback: Callable,
        max_retries: int = 3
    ):
        """
        Consume messages with automatic retries and error handling.
        
        Failed messages are sent to DLQ after max_retries.
        """
        queue = await self.setup_queue(queue_name, with_dlq=True)
        
        async def process_message(message: AbstractIncomingMessage):
            async with message.process(requeue=False):
                retry_count = message.headers.get("x-retry-count", 0)
                
                try:
                    logger.info(
                        "message_received",
                        queue=queue_name,
                        retry_count=retry_count
                    )
                    
                    # Parse message
                    body = json.loads(message.body.decode())
                    
                    # Process with timeout
                    async with asyncio.timeout(60.0):
                        await callback(body)
                    
                    logger.info(
                        "message_processed",
                        queue=queue_name,
                        retry_count=retry_count
                    )
                    
                except asyncio.TimeoutError:
                    logger.error(
                        "message_processing_timeout",
                        queue=queue_name,
                        retry_count=retry_count
                    )
                    await self._handle_retry(message, retry_count, max_retries)
                    
                except Exception as e:
                    logger.exception(
                        "message_processing_failed",
                        queue=queue_name,
                        retry_count=retry_count,
                        error=str(e)
                    )
                    await self._handle_retry(message, retry_count, max_retries)
        
        # Start consuming
        consumer_tag = await queue.consume(process_message)
        logger.info("consumer_started", queue=queue_name)
        
        return consumer_tag
    
    async def _handle_retry(
        self,
        message: AbstractIncomingMessage,
        retry_count: int,
        max_retries: int
    ):
        """Handle message retry logic"""
        if retry_count < max_retries:
            # Republish with incremented retry count
            await self.channel.default_exchange.publish(
                Message(
                    body=message.body,
                    delivery_mode=DeliveryMode.PERSISTENT,
                    headers={
                        **message.headers,
                        "x-retry-count": retry_count + 1
                    }
                ),
                routing_key=message.routing_key
            )
            logger.info("message_requeued", retry_count=retry_count + 1)
        else:
            # Max retries exceeded - message goes to DLQ automatically
            logger.error("message_max_retries_exceeded", retry_count=retry_count)
            raise Exception("Max retries exceeded")
    
    async def close(self):
        """Close connection gracefully"""
        if self.connection:
            await self.connection.close()
            logger.info("message_queue_disconnected")


# Example usage with AI inference
async def handle_inference_message(message: Dict[str, Any]):
    """Process inference request from queue"""
    request_id = message.get("request_id")
    text = message.get("text")
    
    structlog.contextvars.bind_contextvars(request_id=request_id)
    
    try:
        # Run inference
        result = await ai_service.generate(text=text)
        
        # Store result or send to another queue
        await store_result(request_id, result)
        
        logger.info("inference_completed", request_id=request_id)
        
    except Exception as e:
        logger.exception("inference_failed", request_id=request_id, error=str(e))
        raise


# Integration with FastAPI
@app.on_event("startup")
async def startup():
    # Initialize message queue
    mq = MessageQueueService("amqp://guest:guest@localhost/")
    await mq.connect()
    
    # Start consuming
    await mq.consume("inference_queue", handle_inference_message)
```

### Alternative: Redis Queue Pattern

For simpler use cases, Redis with async workers:

```python
import asyncio
from typing import Callable, Any, Dict
import redis.asyncio as redis
import json
import structlog
from dataclasses import dataclass, asdict

logger = structlog.get_logger()

@dataclass
class Task:
    task_id: str
    task_type: str
    payload: Dict[str, Any]
    priority: int = 0
    max_retries: int = 3
    retry_count: int = 0

class RedisQueueService:
    """Simple Redis-based task queue"""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client: Optional[redis.Redis] = None
        
    async def connect(self):
        self.client = await redis.from_url(self.redis_url)
        logger.info("redis_connected")
    
    async def enqueue(self, queue_name: str, task: Task):
        """Add task to queue"""
        task_json = json.dumps(asdict(task))
        
        # Use sorted set for priority queue
        await self.client.zadd(
            queue_name,
            {task_json: -task.priority}  # Negative for high priority first
        )
        
        logger.info(
            "task_enqueued",
            queue=queue_name,
            task_id=task.task_id,
            priority=task.priority
        )
    
    async def dequeue(self, queue_name: str) -> Optional[Task]:
        """Get highest priority task"""
        # ZPOPMIN gets lowest score (highest priority)
        result = await self.client.zpopmin(queue_name)
        
        if not result:
            return None
        
        task_json, _ = result[0]
        task_data = json.loads(task_json)
        return Task(**task_data)
    
    async def worker(
        self,
        queue_name: str,
        handler: Callable[[Task], Any],
        poll_interval: float = 1.0
    ):
        """Process tasks from queue"""
        logger.info("worker_started", queue=queue_name)
        
        while True:
            try:
                task = await self.dequeue(queue_name)
                
                if task is None:
                    await asyncio.sleep(poll_interval)
                    continue
                
                logger.info("task_processing", task_id=task.task_id)
                
                try:
                    await handler(task)
                    logger.info("task_completed", task_id=task.task_id)
                    
                except Exception as e:
                    logger.exception(
                        "task_failed",
                        task_id=task.task_id,
                        error=str(e)
                    )
                    
                    # Retry logic
                    if task.retry_count < task.max_retries:
                        task.retry_count += 1
                        await self.enqueue(f"{queue_name}:retry", task)
                        logger.info("task_requeued", task_id=task.task_id)
                    else:
                        # Move to failed queue
                        await self.enqueue(f"{queue_name}:failed", task)
                        logger.error("task_max_retries", task_id=task.task_id)
                        
            except Exception as e:
                logger.exception("worker_error", error=str(e))
                await asyncio.sleep(poll_interval)
```

### Message Queue Best Practices:
1. **Always use dead letter queues** for failed messages
2. **Implement retry logic** with exponential backoff
3. **Set message TTL** to prevent queue bloat
4. **Use priority queues** when needed
5. **Implement circuit breakers** for downstream services
6. **Monitor queue depth** and processing rates
7. **Use durable queues** for important messages
8. **Rate limit consumers** with prefetch_count

## Logging and Observability

Production-grade logging with structured logging:

```python
import structlog
import logging
import sys
from typing import Any
from pythonjsonlogger import jsonlogger

def setup_logging(
    log_level: str = "INFO",
    json_logs: bool = True,
    log_file: Optional[str] = None
):
    """
    Configure structured logging with:
    - JSON output for production
    - Colored console output for development
    - Request ID tracking
    - Automatic exception logging
    """
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper())
    )
    
    # Processors for structlog
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    
    if json_logs:
        # JSON output for production
        processors.append(structlog.processors.JSONRenderer())
    else:
        # Colored console output for development
        processors.append(structlog.dev.ConsoleRenderer())
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Optional file handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(
            jsonlogger.JsonFormatter(
                '%(timestamp)s %(level)s %(name)s %(message)s'
            )
        )
        logging.getLogger().addHandler(file_handler)
    
    logger = structlog.get_logger()
    logger.info(
        "logging_configured",
        log_level=log_level,
        json_logs=json_logs,
        log_file=log_file
    )

# Context managers for logging scopes
from contextlib import asynccontextmanager

@asynccontextmanager
async def log_context(**kwargs):
    """Add context to all logs within this scope"""
    structlog.contextvars.bind_contextvars(**kwargs)
    try:
        yield
    finally:
        structlog.contextvars.unbind_contextvars(*kwargs.keys())

# Usage example
async def process_request(user_id: str, request_id: str):
    async with log_context(user_id=user_id, request_id=request_id):
        logger.info("processing_request")
        # All logs within this scope will include user_id and request_id
        await do_work()
        logger.info("request_completed")
```

### Distributed Tracing with OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

def setup_tracing(service_name: str, otlp_endpoint: str):
    """Setup distributed tracing"""
    
    # Configure tracer provider
    provider = TracerProvider(resource=Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0"
    }))
    
    # Add OTLP exporter (for Jaeger, Tempo, etc.)
    otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    
    trace.set_tracer_provider(provider)
    
    # Auto-instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    # Auto-instrument HTTP clients
    HTTPXClientInstrumentor().instrument()
    
    logger.info("tracing_configured", service=service_name)

# Manual span creation
tracer = trace.get_tracer(__name__)

async def process_with_tracing():
    with tracer.start_as_current_span("process_data") as span:
        span.set_attribute("user_id", "123")
        span.set_attribute("operation", "data_processing")
        
        # Your code here
        result = await process_data()
        
        span.set_attribute("result_size", len(result))
        
        return result
```

### Metrics with Prometheus

```python
from prometheus_client import Counter, Histogram, Gauge, Summary
from prometheus_client import make_asgi_app
from fastapi import FastAPI

# Define metrics
INFERENCE_REQUESTS = Counter(
    'inference_requests_total',
    'Total inference requests',
    ['model', 'status']
)

INFERENCE_DURATION = Histogram(
    'inference_duration_seconds',
    'Inference duration',
    ['model'],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0]
)

QUEUE_DEPTH = Gauge(
    'queue_depth',
    'Current queue depth',
    ['queue_name']
)

MODEL_TOKEN_USAGE = Summary(
    'model_token_usage',
    'Token usage per request',
    ['model']
)

# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Use metrics
@app.post("/inference")
async def inference(request: InferenceRequest):
    start_time = time.time()
    
    try:
        result = await ai_service.generate(request.text)
        
        INFERENCE_REQUESTS.labels(
            model=request.model,
            status="success"
        ).inc()
        
        MODEL_TOKEN_USAGE.labels(
            model=request.model
        ).observe(result.tokens_used)
        
        return result
        
    except Exception as e:
        INFERENCE_REQUESTS.labels(
            model=request.model,
            status="error"
        ).inc()
        raise
        
    finally:
        duration = time.time() - start_time
        INFERENCE_DURATION.labels(
            model=request.model
        ).observe(duration)
```

## Testing Patterns

### Unit Tests with pytest

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import AsyncMock, Mock, patch

@pytest_asyncio.fixture
async def client():
    """Test client for FastAPI"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def mock_ai_service():
    """Mock AI service for testing"""
    service = AsyncMock()
    service.generate.return_value = {
        "text": "Generated response",
        "tokens_used": 50
    }
    return service

@pytest.mark.asyncio
async def test_inference_endpoint(client, mock_ai_service):
    """Test inference endpoint"""
    
    # Override dependency
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service
    
    try:
        response = await client.post(
            "/api/v1/inference",
            json={
                "text": "Test input",
                "model": "test-model",
                "temperature": 0.7
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "Generated response"
        assert data["tokens_used"] == 50
        
        # Verify mock was called
        mock_ai_service.generate.assert_called_once()
        
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_inference_timeout(client, mock_ai_service):
    """Test inference timeout handling"""
    
    # Configure mock to timeout
    mock_ai_service.generate.side_effect = asyncio.TimeoutError()
    
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service
    
    try:
        response = await client.post(
            "/api/v1/inference",
            json={"text": "Test"}
        )
        
        assert response.status_code == 504
        assert "timeout" in response.json()["detail"].lower()
        
    finally:
        app.dependency_overrides.clear()

# Integration tests
@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_inference_pipeline():
    """Integration test with real services"""
    
    # This would use real AI service in test environment
    # Mark with @pytest.mark.integration to skip in CI
    
    service = AIService(config={
        "provider": "anthropic",
        "api_key": os.getenv("TEST_API_KEY")
    })
    
    await service.initialize()
    
    try:
        result = await service.generate(
            text="Say hello",
            model="claude-sonnet-4-20250514",
            temperature=0.7
        )
        
        assert result["text"]
        assert result["tokens_used"] > 0
        
    finally:
        await service.cleanup()
```

### Load Testing with Locust

```python
from locust import HttpUser, task, between
import random

class InferenceLoadTest(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def inference_request(self):
        """Simulate inference requests"""
        self.client.post(
            "/api/v1/inference",
            json={
                "text": f"Test request {random.randint(1, 1000)}",
                "model": "default",
                "temperature": random.uniform(0.5, 1.0)
            }
        )
    
    @task(1)
    def health_check(self):
        """Health check requests"""
        self.client.get("/health")
```

## Deployment and Configuration

### Environment Configuration with Pydantic Settings

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Application
    app_name: str = "AI Service"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 4
    
    # AI Service
    ai_provider: str = "anthropic"
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    model_name: str = "claude-sonnet-4-20250514"
    
    # Message Queue
    rabbitmq_url: str = "amqp://guest:guest@localhost/"
    redis_url: str = "redis://localhost:6379"
    
    # Database
    database_url: str = "postgresql://user:pass@localhost/db"
    
    # Observability
    log_level: str = "INFO"
    json_logs: bool = True
    otlp_endpoint: Optional[str] = None
    sentry_dsn: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

### Docker Configuration

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with Gunicorn + Uvicorn workers
CMD ["gunicorn", "main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--graceful-timeout", "30"]
```

### Docker Compose for Local Development

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=true
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq/
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:postgres@postgres/ai_service
    depends_on:
      - rabbitmq
      - redis
      - postgres
    volumes:
      - ./:/app
    command: uvicorn main:app --reload --host 0.0.0.0 --port 8000
  
  worker:
    build: .
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq/
      - REDIS_URL=redis://redis:6379
    depends_on:
      - rabbitmq
      - redis
    command: python worker.py
  
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=ai_service
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Performance Optimization

### Connection Pooling

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager

# Database connection pool
engine = create_async_engine(
    settings.database_url,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,  # Verify connections
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=settings.debug
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@asynccontextmanager
async def get_db():
    """Database session with automatic cleanup"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### Caching with Redis

```python
import redis.asyncio as redis
from functools import wraps
import hashlib
import json
from typing import Callable, Any

class CacheService:
    """Redis-based caching service"""
    
    def __init__(self, redis_url: str):
        self.client = redis.from_url(redis_url)
    
    def cache(
        self,
        ttl: int = 3600,
        key_prefix: str = ""
    ):
        """Decorator for caching function results"""
        
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs) -> Any:
                # Generate cache key
                key_data = f"{key_prefix}:{func.__name__}:{args}:{kwargs}"
                cache_key = hashlib.md5(key_data.encode()).hexdigest()
                
                # Try to get from cache
                cached = await self.client.get(cache_key)
                if cached:
                    logger.debug("cache_hit", key=cache_key)
                    return json.loads(cached)
                
                # Execute function
                logger.debug("cache_miss", key=cache_key)
                result = await func(*args, **kwargs)
                
                # Store in cache
                await self.client.setex(
                    cache_key,
                    ttl,
                    json.dumps(result)
                )
                
                return result
            
            return wrapper
        return decorator

# Usage
cache = CacheService(settings.redis_url)

@cache.cache(ttl=300, key_prefix="inference")
async def get_model_info(model_name: str):
    """Cached model info lookup"""
    # Expensive operation
    return await fetch_model_info(model_name)
```

## Security Best Practices

### API Key Management

```python
from fastapi import Security, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
import hmac

security = HTTPBearer()

async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """Verify API key from Authorization header"""
    
    api_key = credentials.credentials
    
    # Hash comparison to prevent timing attacks
    expected = settings.api_key_hash.encode()
    provided = hashlib.sha256(api_key.encode()).hexdigest().encode()
    
    if not hmac.compare_digest(expected, provided):
        logger.warning("invalid_api_key_attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return api_key

# Use in endpoints
@app.post("/api/v1/secure-endpoint")
async def secure_endpoint(
    request: Request,
    api_key: str = Depends(verify_api_key)
):
    """Endpoint requiring API key"""
    # Your code here
    pass
```

### Rate Limiting

```python
from fastapi import Request, HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/v1/inference")
@limiter.limit("10/minute")
async def inference(request: Request, data: InferenceRequest):
    """Rate-limited endpoint"""
    # Your code here
    pass
```

## Common Patterns Summary

### When to Use What:

**FastAPI**:
- Building REST APIs
- Real-time requirements
- Need auto-generated docs
- Modern async Python

**Message Queues**:
- Async processing
- Decoupling services
- Load leveling
- Reliable delivery

**RabbitMQ** vs **Redis**:
- RabbitMQ: Complex routing, guaranteed delivery, large scale
- Redis: Simple queues, high performance, already using Redis

**Structured Logging**:
- Always in production
- Helps debugging
- Enables monitoring
- Required for distributed systems

**Retries & Timeouts**:
- All external service calls
- Network operations
- AI/ML inference
- Database queries

### Final Checklist

Before deploying Python + AI services:

- [ ] Type hints on all functions
- [ ] Comprehensive error handling
- [ ] Structured logging configured
- [ ] Metrics exposed (/metrics endpoint)
- [ ] Health check endpoint (/health)
- [ ] Environment-based configuration
- [ ] Docker containerization
- [ ] Database connection pooling
- [ ] Message queue with DLQ
- [ ] Retry logic on external calls
- [ ] Timeouts on all I/O operations
- [ ] Rate limiting on public endpoints
- [ ] API key authentication
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] Load tests
- [ ] CI/CD pipeline
- [ ] Documentation (OpenAPI)
- [ ] Monitoring dashboards
- [ ] Alert configuration

## Additional Resources

- FastAPI docs: https://fastapi.tiangolo.com/
- Pydantic: https://docs.pydantic.dev/
- Structlog: https://www.structlog.org/
- OpenTelemetry Python: https://opentelemetry.io/docs/languages/python/
- aio-pika (RabbitMQ): https://aio-pika.readthedocs.io/
- Tenacity (retries): https://tenacity.readthedocs.io/
