# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.10.0
ARG PNPM_VERSION=9.6.0
FROM node:${NODE_VERSION}-slim as base

# NestJS app lives here
WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential libcairo2-dev libpango1.0-dev 

# Throw-away build stage to reduce size of final image
FROM base as builder

# Install pnpm
RUN npm install -g pnpm@$PNPM_VERSION

# Replace <your-major-version> with the major version installed in your repository. For example:
RUN npm install --global turbo@^2
COPY . .
  
# Generate a partial monorepo with a pruned lockfile for a target workspace.
RUN turbo prune queue --docker
  
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer

WORKDIR /app

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 

# Install pnpm
RUN npm install -g pnpm@$PNPM_VERSION
  
# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

RUN pnpm install

# Build the project
COPY --from=builder /app/out/full/ .

ENV NODE_ENV="production"
RUN pnpm turbo run build --filter=queue...

# Final stage for app image
FROM base AS runner

# Set production environment
ENV NODE_ENV="production"
ENV PORT=3000

# Copy built application
COPY --from=installer /app/apps/queue/package.json /app/apps/queue/package.json
COPY --from=installer /app/apps/queue/dist /app/apps/queue/dist
COPY --from=installer /app/apps/queue/node_modules /app/apps/queue/node_modules

COPY --from=installer /app/packages/ /app/packages/
RUN find /app/packages -type d -name "src" -exec rm -rf {} +

COPY --from=installer /app/node_modules /app/node_modules

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}
CMD [ "node", "apps/queue/dist/index.js" ]