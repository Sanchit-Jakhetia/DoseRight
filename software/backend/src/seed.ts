import { Types } from 'mongoose';
import {
  connectDB,
  disconnectDB,
  dropDatabase,
  User,
  Patient,
  Device,
  MedicationPlan,
  DoseLog,
} from './models';
import { hashPassword } from './utils/auth';

async function seedDatabase() {
  try {
    await connectDB();

    // Drop existing data
    console.log('\n🔄 Clearing existing data...');
    await dropDatabase();

    // Create Users
    console.log('\n👤 Creating users...');

    const patientUser = await User.create({
      name: 'Ravi Kumar',
      email: 'ravi.kumar@example.com',
      phone: '+919876543210',
      role: 'patient',
      passwordHash: await hashPassword('ravi123'),
      isActive: true,
    });

    const caretakerUser = await User.create({
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+919876543211',
      role: 'caretaker',
      passwordHash: await hashPassword('priya123'),
      isActive: true,
    });

    const doctorUser = await User.create({
      name: 'Dr. Amit Patel',
      email: 'dr.amit@hospital.com',
      phone: '+919876543212',
      role: 'doctor',
      passwordHash: await hashPassword('doctor123'),
      isActive: true,
    });

    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@doseright.com',
      phone: '+919876543213',
      role: 'admin',
      passwordHash: await hashPassword('admin123'),
      isActive: true,
    });

    console.log('✓ Created 4 users');

    // Create Device
    console.log('\n📱 Creating device...');

    const device = await Device.create({
      deviceId: 'DR-ESP32-001',
      patientId: new Types.ObjectId(),
      name: 'Main Pill Dispenser',
      timezone: 'Asia/Kolkata',
      slotCount: 5,
      lastHeartbeatAt: new Date(),
      lastStatus: 'online',
      batteryLevel: 85,
      wifiStrength: -45,
    });

    console.log('✓ Created device:', device.deviceId);

    // Create Patient
    console.log('\n🏥 Creating patient profile...');

    const patient = await Patient.create({
      userId: patientUser._id,
      deviceId: device._id,
      medicalProfile: {
        illnesses: [
          {
            name: 'Type 2 Diabetes',
            diagnosedAt: new Date('2020-05-15'),
            status: 'ongoing',
            notes: 'Managed with medication and diet',
          },
          {
            name: 'Hypertension',
            diagnosedAt: new Date('2018-10-20'),
            status: 'under_control',
            notes: 'Well controlled with current medication',
          },
        ],
        allergies: ['Penicillin', 'Sulfa drugs'],
        otherNotes: 'Avoid NSAIDs due to kidney concerns',
      },
      caretakers: [
        {
          userId: caretakerUser._id,
          relationship: 'Daughter',
          approved: true,
          requestedAt: new Date('2025-01-01'),
          approvedAt: new Date('2025-01-02'),
        },
      ],
      doctors: [doctorUser._id],
    });

    // Update device with patient ID
    await Device.findByIdAndUpdate(device._id, { patientId: patient._id });

    console.log('✓ Created patient profile');

    // Create Medication Plans
    console.log('\n💊 Creating medication plans...');

    const med1 = await MedicationPlan.create({
      patientId: patient._id,
      deviceId: device._id,
      slotIndex: 0,
      medicationName: 'Metformin',
      medicationStrength: '500mg',
      medicationForm: 'tablet',
      dosagePerIntake: 1,
      times: ['08:00', '20:00'],
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      active: true,
      startDate: new Date('2025-01-01'),
      endDate: null,
      stock: {
        totalLoaded: 60,
        remaining: 45,
        lastRefilledAt: new Date('2025-12-01'),
      },
    });

    const med2 = await MedicationPlan.create({
      patientId: patient._id,
      deviceId: device._id,
      slotIndex: 1,
      medicationName: 'Lisinopril',
      medicationStrength: '10mg',
      medicationForm: 'tablet',
      dosagePerIntake: 1,
      times: ['08:00'],
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      active: true,
      startDate: new Date('2025-01-15'),
      endDate: null,
      stock: {
        totalLoaded: 30,
        remaining: 28,
        lastRefilledAt: new Date('2025-12-05'),
      },
    });

    const med3 = await MedicationPlan.create({
      patientId: patient._id,
      deviceId: device._id,
      slotIndex: 2,
      medicationName: 'Aspirin',
      medicationStrength: '100mg',
      medicationForm: 'tablet',
      dosagePerIntake: 1,
      times: ['20:00'],
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      active: true,
      startDate: new Date('2025-02-01'),
      endDate: null,
      stock: {
        totalLoaded: 30,
        remaining: 20,
        lastRefilledAt: new Date('2025-11-20'),
      },
    });

    console.log('✓ Created 3 medication plans');

    // Create Dose Logs (sample data for last 7 days)
    console.log('\n📊 Creating dose logs...');

    const today = new Date();
    const doseLogs = [];

    for (let i = 6; i >= 0; i--) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(scheduleDate.getDate() - i);

      // Morning Metformin doses
      doseLogs.push({
        patientId: patient._id,
        deviceId: device._id,
        medicationPlanId: med1._id,
        slotIndex: 0,
        scheduledAt: new Date(scheduleDate.setHours(8, 0, 0, 0)),
        status: i > 1 ? 'taken' : 'pending',
        dispensedAt: i > 1 ? new Date(scheduleDate.setHours(8, 2, 0, 0)) : undefined,
        takenAt: i > 1 ? new Date(scheduleDate.setHours(8, 5, 0, 0)) : undefined,
      });

      // Morning Lisinopril doses
      doseLogs.push({
        patientId: patient._id,
        deviceId: device._id,
        medicationPlanId: med2._id,
        slotIndex: 1,
        scheduledAt: new Date(scheduleDate.setHours(8, 0, 0, 0)),
        status: i > 2 ? 'taken' : i === 1 ? 'missed' : 'pending',
        dispensedAt: i > 2 ? new Date(scheduleDate.setHours(8, 3, 0, 0)) : undefined,
        takenAt: i > 2 ? new Date(scheduleDate.setHours(8, 5, 0, 0)) : undefined,
        missedReason: i === 1 ? 'Forgot to take' : undefined,
      });

      // Evening Metformin doses
      doseLogs.push({
        patientId: patient._id,
        deviceId: device._id,
        medicationPlanId: med1._id,
        slotIndex: 0,
        scheduledAt: new Date(scheduleDate.setHours(20, 0, 0, 0)),
        status: i > 2 ? 'taken' : 'pending',
        dispensedAt: i > 2 ? new Date(scheduleDate.setHours(20, 2, 0, 0)) : undefined,
        takenAt: i > 2 ? new Date(scheduleDate.setHours(20, 5, 0, 0)) : undefined,
      });

      // Evening Aspirin doses
      doseLogs.push({
        patientId: patient._id,
        deviceId: device._id,
        medicationPlanId: med3._id,
        slotIndex: 2,
        scheduledAt: new Date(scheduleDate.setHours(20, 0, 0, 0)),
        status: i > 1 ? 'taken' : 'pending',
        dispensedAt: i > 1 ? new Date(scheduleDate.setHours(20, 2, 0, 0)) : undefined,
        takenAt: i > 1 ? new Date(scheduleDate.setHours(20, 5, 0, 0)) : undefined,
      });
    }

    await DoseLog.insertMany(doseLogs);
    console.log(`✓ Created ${doseLogs.length} dose logs`);

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📋 Test Credentials:');
    console.log(`   Patient:    ravi.kumar@example.com / ravi123`);
    console.log(`   Caretaker:  priya.sharma@example.com / priya123`);
    console.log(`   Doctor:     dr.amit@hospital.com / doctor123`);
    console.log(`   Admin:      admin@doseright.com / admin123\n`);

    console.log('📊 Database Summary:');
    console.log(`   Users: 4`);
    console.log(`   Devices: 1`);
    console.log(`   Patients: 1`);
    console.log(`   Medication Plans: 3`);
    console.log(`   Dose Logs: ${doseLogs.length}\n`);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seedDatabase();
