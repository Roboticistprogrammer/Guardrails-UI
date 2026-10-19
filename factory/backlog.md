# Backlog

`/factory next` builds the first unchecked item and checks it off with its job id.

- [ ] Chat playground: a conversation panel where the user sends messages to /api/chat and each reply is marked as allowed or blocked by the topic rail
- [ ] Light/dark theme switch in the header that overrides the system setting and remembers the choice
- [ ] Sample prompt runner: a list of on-topic and off-topic example prompts with their expected outcome, a button to run them all through /api/chat, and a pass/fail result per prompt
- [ ] Topic policy viewer: show the current topic-control guidelines from prompts.yml read-only, served by a new GET /api/policy endpoint
- [ ] Connection panel: show the model mode, and in local mode whether the NIM at TOPIC_CONTROL_URL answers its /v1/health/ready check
- [ ] Local deployment page: the docker run steps for the TopicControl NIM with a copy button for each command
