# Docker Setup for Accident Detection Backend

This guide will help you build and run the accident detection backend application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Environment Variables

Create a `.env` file in the Backend_Sys directory with the following variables:

```env
# Database Configuration
DB_HOST=mysql
DB_USER=appuser
DB_PASSWORD=apppassword
DB_DATABASE=accident_detection
DB_PORT=3306

# Twilio Configuration (for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Flask Configuration
FLASK_ENV=production
FLASK_APP=server.py
```

## Building and Running with Docker Compose (Recommended)

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Run in background:**
   ```bash
   docker-compose up -d --build
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f backend
   ```

## Building Docker Image Manually

1. **Build the image:**
   ```bash
   docker build -t accident-detection-backend .
   ```

2. **Run the container:**
   ```bash
   docker run -p 5000:5000 \
     -e DB_HOST=your_mysql_host \
     -e DB_USER=your_db_user \
     -e DB_PASSWORD=your_db_password \
     -e DB_DATABASE=accident_detection \
     -e TWILIO_ACCOUNT_SID=your_twilio_sid \
     -e TWILIO_AUTH_TOKEN=your_twilio_token \
     -e TWILIO_PHONE_NUMBER=your_twilio_number \
     accident-detection-backend
   ```

## Services

### Backend Service
- **Port:** 5000
- **Health Check:** Available at `/test_connection`
- **Main Application:** Flask server with accident detection capabilities

### MySQL Database
- **Port:** 3306
- **Database:** accident_detection
- **Initialization:** Automatically runs `accident_detection.sql` on first startup

## Volumes

The following directories are mounted as volumes:
- `./videos` - Uploaded videos
- `./processed_videos` - Processed video results
- `./stream_frames` - Video streaming frames
- `./uploads` - File uploads
- `./data` - Application data
- `./accident_clips` - Accident video clips

## API Endpoints

Once running, the following endpoints will be available:

- `GET /test_connection` - Health check
- `POST /login` - User authentication
- `POST /signup` - User registration
- `POST /upload` - Video upload and processing
- `GET /get_user_videos` - Get user's uploaded videos
- `POST /report_accident` - Report accident detection
- `GET /fetch_database` - Get database records

## Troubleshooting

1. **Database Connection Issues:**
   - Ensure MySQL container is running: `docker-compose ps`
   - Check MySQL logs: `docker-compose logs mysql`

2. **Port Conflicts:**
   - Change ports in `docker-compose.yml` if 5000 or 3306 are already in use

3. **Permission Issues:**
   - Ensure the mounted directories have proper permissions

4. **Memory Issues:**
   - The YOLOv8 model requires significant memory
   - Consider increasing Docker memory limits

## Development

For development, you can override the environment:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Production Deployment

For production deployment:

1. Use proper secrets management
2. Set up reverse proxy (nginx)
3. Configure SSL certificates
4. Set up monitoring and logging
5. Use production-grade database 