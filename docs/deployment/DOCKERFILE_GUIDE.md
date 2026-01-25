# Dockerfile Guide

## Overview

The Dockerfile for the domain-config-service implements a production-ready, secure, and optimized container image using Docker best practices.

## Key Features

### 1. Multi-Stage Build

The Dockerfile uses a two-stage build process to minimize the final image size:

#### Stage 1: Builder
- **Base Image**: `node:18-alpine`
- **Purpose**: Compile TypeScript to JavaScript
- **Actions**:
  - Install all dependencies (including devDependencies)
  - Build TypeScript code using `npm run build`
  - Prune devDependencies to reduce size

#### Stage 2: Production
- **Base Image**: `node:18-alpine`
- **Purpose**: Run the application
- **Actions**:
  - Copy only production dependencies and built code
  - Configure non-root user
  - Set up health checks

**Benefits**:
- Smaller final image (no TypeScript compiler, no devDependencies)
- Faster deployment and startup times
- Reduced attack surface

### 2. Non-Root User

The container runs as a non-root user for enhanced security:

```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

**Security Benefits**:
- Limits potential damage from container breakout
- Follows principle of least privilege
- Complies with security best practices

**User Details**:
- Username: `nodejs`
- UID: `1001`
- GID: `1001`

### 3. Health Check

The Dockerfile includes a built-in health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

**Parameters**:
- **Interval**: 30 seconds between checks
- **Timeout**: 3 seconds for each check
- **Start Period**: 40 seconds grace period for initialization
- **Retries**: 3 consecutive failures before marking unhealthy

**Benefits**:
- Automatic container restart on failure
- Integration with orchestration platforms (Kubernetes, Docker Swarm)
- Monitoring and alerting capabilities

### 4. Signal Handling with dumb-init

The container uses `dumb-init` as PID 1:

```dockerfile
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

**Benefits**:
- Proper signal forwarding (SIGTERM, SIGINT)
- Zombie process reaping
- Graceful shutdown support

## Building the Image

### Basic Build

```bash
docker build -t domain-config-service:latest .
```

### Build with Version Tag

```bash
docker build -t domain-config-service:1.0.0 .
```

### Build with Build Arguments

```bash
docker build \
  --build-arg NODE_ENV=production \
  -t domain-config-service:latest \
  .
```

## Running the Container

### Basic Run

```bash
docker run -p 3000:3000 domain-config-service:latest
```

### Run with Environment Variables

```bash
docker run \
  -p 3000:3000 \
  -e DB_HOST=mysql \
  -e DB_NAME=domain_config \
  -e REDIS_ENABLED=true \
  domain-config-service:latest
```

### Run with Environment File

```bash
docker run \
  -p 3000:3000 \
  --env-file .env \
  domain-config-service:latest
```

### Run with Docker Compose

See `docker-compose.yml` for the complete setup including MySQL and Redis.

```bash
docker-compose up -d
```

## Image Size Optimization

The multi-stage build significantly reduces image size:

| Component | Size Impact |
|-----------|-------------|
| Base Alpine Image | ~50 MB |
| Node.js Runtime | ~50 MB |
| Production Dependencies | ~30-50 MB |
| Application Code | ~5-10 MB |
| **Total** | **~135-160 MB** |

Without multi-stage build, the image would be 300-400 MB larger due to:
- TypeScript compiler
- Development dependencies
- Source TypeScript files
- Build tools

## Security Considerations

### 1. Non-Root User
- Application runs as UID 1001
- Limited file system access
- Cannot bind to privileged ports (<1024)

### 2. Minimal Base Image
- Alpine Linux reduces attack surface
- Fewer packages = fewer vulnerabilities
- Regular security updates

### 3. No Secrets in Image
- Environment variables for configuration
- Secrets should be injected at runtime
- Never commit `.env` files

### 4. Read-Only File System (Optional)

For enhanced security, run with read-only root filesystem:

```bash
docker run \
  --read-only \
  --tmpfs /tmp \
  -p 3000:3000 \
  domain-config-service:latest
```

## Health Check Details

### Endpoint
The health check calls `GET /health` which returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "database": "connected",
  "redis": "connected"
}
```

### Status Codes
- **200**: Service is healthy
- **503**: Service is degraded (database or Redis issues)

### Monitoring

Check container health status:

```bash
docker ps
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

View health check logs:

```bash
docker inspect --format='{{json .State.Health}}' <container-id> | jq
```

## Troubleshooting

### Build Failures

**Issue**: npm install fails
```bash
# Clear npm cache
docker build --no-cache -t domain-config-service:latest .
```

**Issue**: TypeScript compilation errors
```bash
# Check TypeScript locally first
npm run build
```

### Runtime Issues

**Issue**: Container exits immediately
```bash
# Check logs
docker logs <container-id>

# Run interactively
docker run -it domain-config-service:latest sh
```

**Issue**: Health check fails
```bash
# Check health endpoint manually
docker exec <container-id> wget -O- http://localhost:3000/health

# Check application logs
docker logs <container-id>
```

**Issue**: Permission denied errors
```bash
# Verify file ownership
docker run -it domain-config-service:latest sh
ls -la /app
```

## Best Practices Implemented

1. ✅ **Multi-stage build** - Reduces image size
2. ✅ **Non-root user** - Enhances security
3. ✅ **Health check** - Enables monitoring
4. ✅ **Alpine Linux** - Minimal base image
5. ✅ **Specific versions** - Reproducible builds
6. ✅ **dumb-init** - Proper signal handling
7. ✅ **Layer caching** - Faster builds
8. ✅ **.dockerignore** - Excludes unnecessary files
9. ✅ **npm ci** - Reproducible dependency installation
10. ✅ **Proper WORKDIR** - Organized file structure

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t domain-config-service:${{ github.sha }} .
      
      - name: Run tests
        run: docker run domain-config-service:${{ github.sha }} npm test
      
      - name: Push to registry
        run: |
          docker tag domain-config-service:${{ github.sha }} registry.example.com/domain-config-service:latest
          docker push registry.example.com/domain-config-service:latest
```

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Alpine Linux](https://alpinelinux.org/)
- [dumb-init](https://github.com/Yelp/dumb-init)
