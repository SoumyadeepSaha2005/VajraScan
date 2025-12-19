# 1. Use Python as the base image
FROM python:3.9-slim

# 2. Install Node.js
RUN apt-get update && apt-get install -y nodejs npm

# 3. Set working directory
WORKDIR /app

# 4. Copy all files into the container
COPY . .

# 5. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 6. Install Node dependencies
WORKDIR /app/web-dashboard
RUN npm install

# 7. Expose the port
ENV PORT=3000
EXPOSE 3000

# 8. Start the Server
CMD ["node", "server.js"]