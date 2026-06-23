# Grounded Chatbot, Observability, And Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai chatbot grounded cho end-user trước, sau đó mở rộng provider routing, audit, data pipeline, và monitoring theo đúng thứ tự ưu tiên.

**Architecture:** Backend tiếp tục là lớp authoritative cho nghiệp vụ y tế và safety filtering. `ai-service` chỉ xử lý natural-language generation trên grounded payload. Observability sẽ được đẩy xuống cả backend lẫn `ai-service`, còn data pipeline tiếp tục là offline seed/sync, không trở thành runtime dependency.

**Tech Stack:** Node.js, Express, Awilix, React, FastAPI, httpx, PostgreSQL/Supabase, local scripts

---

## Phase 0: Discovery Summary

- [x] Xác định mount point tốt nhất cho chatbot là `frontend/src/pages/DrugSuggestion.jsx`
- [x] Xác định backend cần route mới thay vì expose trực tiếp `ai-service /ai/chat`
- [x] Xác định fixed fallback chain hiện tại chưa có health-aware routing
- [x] Xác định schema hiện tại chưa có durable audit store đầy đủ
- [x] Xác định data pipeline hiện ở mức seed/review, chưa phải production sync hoàn chỉnh

## Phase 1: Grounded Chatbot

- [x] Thêm endpoint grounded chat ở `ai-service`
- [x] Thêm backend service/controller/route cho grounded chat
- [x] Gắn UI chatbot vào `DrugSuggestion`
- [x] Thêm tests cho `ai-service`, backend, frontend
- [x] Chạy verify `pytest`, `npm test`, `vitest`, `vite build`

## Phase 2: Provider Health Router

- [x] Trích provider metrics store dùng chung trong `ai-service`
- [x] Bổ sung circuit breaker + cooldown + half-open probe
- [x] Thay provider chain cố định bằng dynamic routing theo health/cost/latency
- [x] Mở rộng `/health` để trả provider health summary
- [x] Thêm tests cho healthy path, open-breaker path, recovery path

## Phase 3: Audit Log

- [x] Thiết kế migration cho bảng audit AI events
- [x] Persist grounded explain/chat request và response metadata
- [x] Gắn audit emission ở backend orchestration points
- [x] Gắn provider/latency/fallback metadata vào bản ghi audit
- [x] Thêm tests/review cho audit payload canonicalization

## Phase 4: Production Data Pipeline

- [x] Loại synthetic filler khỏi chế độ production-ready output
- [x] Thêm strict mode cho `seed-disease-graph-data.js`
- [x] Thêm canonical report counts cho disease/drug/public-source coverage
- [x] Sinh import artifacts phù hợp hơn cho curated disease graph import
- [x] Cập nhật docs import flow và guardrails

## Phase 5: Monitoring And CI

- [x] Thêm health payload giàu thông tin cho backend và `ai-service`
- [x] Thêm script/check theo dõi fallback rate, provider health, contract smoke
- [x] Tách monitoring/live suites khỏi default CI
- [x] Bổ sung CI steps cho grounded chatbot và pipeline minimum checks
- [x] Cập nhật README/docs phase AI
