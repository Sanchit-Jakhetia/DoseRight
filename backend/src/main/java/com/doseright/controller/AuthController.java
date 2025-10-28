package com.doseright.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // Simple in-memory user store for testing. Keys are patientId.
    private static final Map<String, User> USERS = new ConcurrentHashMap<>();

    static {
        // Pre-seeded users for testing
        USERS.put("patient1", new User("patient1", "Alice Patient", "9990001111", "patient1", "patient"));
        USERS.put("patient2", new User("patient2", "Bob Patient", "9990002222", "patient2", "patient"));
        USERS.put("caretaker1", new User("caretaker1", "Carol Care", "9990003333", "caretaker1", "caretaker"));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
        if (req == null || req.patientId == null || req.patientId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("message", "patientId required"));
        }
        if (USERS.containsKey(req.patientId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Collections.singletonMap("message", "patientId already exists"));
        }
        String role = (req.role == null || req.role.isEmpty()) ? "patient" : req.role;
        User u = new User(req.patientId, req.name, req.mobile, req.password, role);
        USERS.put(req.patientId, u);
        return ResponseEntity.ok(u.toSafeMap());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req == null || req.patientId == null || req.patientId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("message", "patientId required"));
        }
        User u = USERS.get(req.patientId);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("message", "invalid credentials"));
        }
        if (!u.password.equals(req.password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("message", "invalid credentials"));
        }
        return ResponseEntity.ok(u.toSafeMap());
    }

    // For debugging: list users (not for production)
    @GetMapping("/users")
    public Collection<Map<String, Object>> users() {
        return USERS.values().stream().map(User::toSafeMap).toList();
    }

    // --- DTOs and simple user class ---
    public static class SignupRequest {
        public String name;
        public String mobile;
        public String patientId;
        public String password;
        public String role; // optional: patient or caretaker
    }

    public static class LoginRequest {
        public String patientId;
        public String password;
    }

    public static class User {
        public String patientId;
        public String name;
        public String mobile;
        public String password; // plain text for testing only
        public String role;

        public User() {}

        public User(String patientId, String name, String mobile, String password, String role) {
            this.patientId = patientId;
            this.name = name;
            this.mobile = mobile;
            this.password = password;
            this.role = role;
        }

        public Map<String, Object> toSafeMap() {
            return Map.of(
                    "patientId", patientId,
                    "name", name,
                    "mobile", mobile,
                    "role", role
            );
        }
    }
}
