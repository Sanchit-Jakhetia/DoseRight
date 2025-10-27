# DoseRight Backend (Spring Boot)

Simple Spring Boot (Maven) backend that exposes mock REST endpoints for the dashboard UI.

Run (requires JDK 21 and Maven):

```cmd
cd d:\Codes\GitHub\DoseRight\backend
mvn spring-boot:run
```

Endpoints (defaults)
- GET http://localhost:8080/api/medicines
- GET http://localhost:8080/api/schedule/today
- GET http://localhost:8080/api/adherence
- GET http://localhost:8080/api/summary

The backend enables CORS for http://localhost:5173 so the frontend (Vite) can request data during development.
