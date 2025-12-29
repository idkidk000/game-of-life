#!/usr/bin/env bash
npm install && \
  npm run lint && \
  cd dist && \
  git switch deploy && \
  npm run build && \
  git add . && \
  git status
