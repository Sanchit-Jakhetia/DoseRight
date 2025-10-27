package com.doseright.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DashboardController {

    @GetMapping("/medicines")
    public ResponseEntity<List<Map<String, Object>>> medicines() {
        List<Map<String, Object>> list = new ArrayList<>();

        list.add(makeMed(1, "Aspirin", "100mg", "Daily", 15, "Taken"));
        list.add(makeMed(2, "Metformin", "500mg", "Twice Daily", 8, "Upcoming"));
        list.add(makeMed(3, "Lisinopril", "10mg", "Daily", 3, "Upcoming"));
        list.add(makeMed(4, "Atorvastatin", "20mg", "Daily", 20, "Upcoming"));
        list.add(makeMed(5, "Vitamin D", "1000 IU", "Daily", 2, "Missed"));

        return ResponseEntity.ok(list);
    }

    @GetMapping("/schedule/today")
    public ResponseEntity<List<Map<String, Object>>> scheduleToday() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(makeSchedule(1, "Aspirin", "100mg", "08:00 AM", 15, "Taken"));
        list.add(makeSchedule(2, "Metformin", "500mg", "12:00 PM", 8, "Upcoming"));
        list.add(makeSchedule(3, "Lisinopril", "10mg", "02:00 PM", 3, "Upcoming"));
        list.add(makeSchedule(4, "Atorvastatin", "20mg", "08:00 PM", 20, "Upcoming"));
        list.add(makeSchedule(5, "Vitamin D", "1000 IU", "09:00 AM", 2, "Missed"));
        return ResponseEntity.ok(list);
    }

    @GetMapping("/adherence")
    public ResponseEntity<Map<String, Object>> adherence() {
        Map<String, Object> map = new HashMap<>();
        map.put("taken", 7);
        map.put("missed", 1);
        map.put("rate", 87.5);
        map.put("takenPercent", 88);
        return ResponseEntity.ok(map);
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        Map<String, Object> map = new HashMap<>();
        map.put("activeMedicines", 5);
        map.put("dosesTaken", 7);
        map.put("dosesMissed", 1);
        return ResponseEntity.ok(map);
    }

    private Map<String, Object> makeMed(int id, String name, String dose, String freq, int remaining, String status) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("dose", dose);
        m.put("frequency", freq);
        m.put("remaining", remaining);
        m.put("status", status);
        return m;
    }

    private Map<String, Object> makeSchedule(int id, String name, String dose, String time, int remaining, String status) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("dose", dose);
        m.put("time", time);
        m.put("remaining", remaining);
        m.put("status", status);
        return m;
    }
}
