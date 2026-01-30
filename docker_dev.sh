#!/bin/bash

docker build -t kitchen-base:latest -f Dockerfile.base .
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build