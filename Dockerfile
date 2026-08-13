# syntax=docker/dockerfile:1.6
# Production-grade image for the Suspect Tracing & Fugitive Investigation Support skill.
# Provides a reproducible runtime for the CLI scripts (no LLM/Git operations inside).

FROM node:20-slim AS base
WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Copy source
COPY tsconfig.json ./
COPY config ./config
COPY scripts ./scripts
COPY examples ./examples
COPY tests ./tests
COPY assets ./assets
COPY references ./references

# Smoke-check the build compiles
RUN yarn typecheck

# Default entrypoint: run the full investigation pipeline on a mounted case bundle.
# Usage: docker run --rm -v "$(pwd)/my-case.json:/case.json" <image> /case.json
ENTRYPOINT ["npx", "ts-node", "scripts/investigate.ts"]
CMD ["examples/sample-case.json"]
