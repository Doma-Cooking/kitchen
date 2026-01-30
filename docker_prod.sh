#!/bin/bash

docker build -t kitchen-base:latest -f Dockerfile.base .
docker compose up --build