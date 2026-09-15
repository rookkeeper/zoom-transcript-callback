# Agent callback server

A small server in front of my agents that exposes an API for webhooks. Zoom transcript processing is the first integration; other callbacks can be added later.

It records each callback and its processing outcome. A local events endpoint and web page show what ran, which endpoint received it, when it ran, and whether it succeeded, failed, or stopped incomplete.
