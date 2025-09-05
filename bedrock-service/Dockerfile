# Use an official Python runtime as a parent image
FROM python:3.10-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install wkhtmltopdf and its dependencies
RUN apt-get update && apt-get install -y \
    pandoc \
    wkhtmltopdf \
    xfonts-75dpi \
    xfonts-base \
    xz-utils \
    fontconfig \
    libjpeg62-turbo \
    libxrender1 \
    libfontconfig1 \
    libx11-6 \
    libxext6 \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install any needed packages specified in requirements.txt
COPY ./src/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the current directory contents into the container at /app
COPY ./src/ /app

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable
ENV PYTHONUNBUFFERED=1

# Run app.py when the container launches
CMD ["python", "main.py"]