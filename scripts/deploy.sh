#!/usr/bin/env bash
npm install && \
  cd dist && \
  git switch deploy && \
  cd .. && \
  npm run icons && \
  npm run lint && \
  npm run build && \
  cd dist && \
  git add . && \
  git status
