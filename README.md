# 🏥 ProHuman Health — Scheduling Application

> **A clinic management and patient scheduling platform purpose-built for physiotherapy and rehabilitation clinics.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/prohuman/scheduling-app)
[![Status](https://img.shields.io/badge/status-In%20Development-orange.svg)]()
[![Industry](https://img.shields.io/badge/industry-Healthcare-green.svg)]()

---

## 📋 Table of Contents

- [Overview](#overview)
- [Core Goals](#core-goals)
- [User Roles](#user-roles)
- [Features](#features)
  - [Patient Intake & Profile Management](#patient-intake--profile-management)
  - [Appointment Scheduling](#appointment-scheduling)
  - [Cancellation, Rescheduling & Waitlist](#cancellation-rescheduling--waitlist)
  - [Recurring Appointments](#recurring-appointments)
  - [Session Management & Clinical Notes](#session-management--clinical-notes)
  - [Treatment Plans & Progress Tracking](#treatment-plans--progress-tracking)
  - [Attendance & No-Show Tracking](#attendance--no-show-tracking)
  - [Notifications & Reminders](#notifications--reminders)
  - [Billing & Payments](#billing--payments)
  - [Referral Tracking](#referral-tracking)
  - [Document & File Uploads](#document--file-uploads)
  - [Patient Consent Forms](#patient-consent-forms)
  - [Doctor Dashboard](#doctor-dashboard)
  - [Multi-Clinic / Branch Support](#multi-clinic--branch-support)
  - [Admin Panel](#admin-panel)
- [End-to-End Workflow](#end-to-end-workflow)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Contributing](#contributing)

---

## Overview

**ProHuman Health Scheduling App** manages the complete patient journey — from the first inquiry call through ongoing treatment sessions — enabling front-desk staff, doctors, and administrators to work efficiently within a single unified platform.

---

## Core Goals

- 📞 **Streamline patient intake** and profile management
- 🗓️ **Intelligently match** available doctors to requested appointment slots
- 📋 **Support flexible session types** and customizable clinical forms
- ⚙️ **Provide administrators** with full control over clinic configuration
- 🗂️ **Maintain a living patient database** that grows with each visit
- 📈 **Track patient progress** across treatment plans and sessions
- 🏢 **Scale across multiple clinic branches** from a single platform

---

## User Roles

| Role | Responsibilities |
|------|-----------------|
| **Front Desk Staff** | Handles incoming inquiry calls, captures patient information, schedules sessions by viewing doctor availability in real time, manages cancellations and rescheduling |
| **Doctor / Clinician** | Conducts sessions, fills in session note forms, reviews patient history, tracks treatment plan progress, completes outcome measures |
| **Administrator** | Manages all system configuration: doctor schedules, session types, form templates, question bank, billing, clinic branches, and settings |

---

## Features

### Patient Intake & Profile Management

#### Inquiry Call Flow
When a patient calls the clinic, front-desk staff capture the following mandatory details:

| Field | Description |
|-------|-------------|
| **Full Name** | Patient's legal name for identification and records |
| **Age** | Used for clinical context and eligibility |
| **Gender** | Relevant for physiotherapy treatment planning |
| **Problems / Complaints** | Free-text or structured description of presenting issues (e.g. lower back pain, post-surgical rehab, sports injury) |
| **Referral Source** | Referring doctor, hospital, or self-referral *(optional)* |
| **Contact Details** | Phone number and/or email for reminders and follow-ups |

> Additional fields may be configured by the Admin as needed.

#### Patient Database
- **New patients** receive a unique patient ID and a fresh profile automatically.
- **Returning patients** are detected by name, phone number, or other identifier — new intake notes are appended to the existing profile (no duplicates).
- Patient profiles serve as **persistent clinical records**, accumulating session history, notes, treatment plans, uploaded documents, and treatment data over time.
- Authorized staff can **search and retrieve** patient profiles at any time.

---

### Appointment Scheduling

#### Calendar Interface
Front-desk staff use a **day-by-day, time-slot calendar** to book patient sessions after intake.

#### Doctor Availability Logic
The system automatically filters doctors based on their configured availability. Only doctors available for the selected date and time window are shown — preventing scheduling conflicts.

**Example:**
```
Dr. A  →  Monday 8:00 AM – 10:00 AM
Dr. B  →  Monday 9:00 AM – 3:00 PM

Booking for Monday at 10:00 AM:
✅ Dr. B is available
❌ Dr. A is NOT shown (schedule ends at 10:00 AM)
```

#### Session Creation
When booking a session, front-desk staff complete:

- **Patient** — linked to existing patient profile
- **Doctor** — selected from available doctors for the chosen time
- **Date & Time** — chosen from the calendar
- **Session Type** — selected from Admin-configured types
- **Duration** — default from session type, adjustable if needed
- **Branch / Location** — for multi-clinic setups
- **Notes** *(optional)* — any pre-session notes from the intake call

---

### Cancellation, Rescheduling & Waitlist

#### Cancellation
- Any authorized staff member can cancel a booked session.
- Cancellation reason is recorded (patient request, doctor unavailable, no-show, etc.).
- The freed slot is immediately made available for new bookings.
- The patient is automatically notified of the cancellation via their preferred channel.

#### Rescheduling
- Sessions can be rescheduled to a new date, time, or doctor directly from the calendar.
- The system re-validates doctor availability for the new slot before confirming.
- Both the old and new slot details are logged in the session history.

#### Waitlist
- If a preferred doctor or time slot is fully booked, a patient can be added to a **waitlist**.
- When a cancellation frees up a matching slot, waitlisted patients are **automatically notified** and given a window to confirm the new booking.
- Front desk can also manually assign waitlisted patients to newly opened slots.

---

### Recurring Appointments

- Front desk can book a **series of recurring sessions** in a single action (e.g. every Tuesday at 10:00 AM for 8 weeks).
- Recurrence patterns supported: daily, weekly, bi-weekly, or custom intervals.
- Individual sessions within a series can be cancelled or rescheduled without affecting the rest of the series.
- Recurring sessions are linked to a **treatment plan** for unified progress tracking.

---

### Session Management & Clinical Notes

#### Session Types
Sessions are categorized by type, fully managed by the Admin. Examples include:

- Initial Evaluation
- Follow-Up Session
- Discharge Assessment
- Group Therapy

Each session type may have its own associated documentation form.

#### Session Notes & Forms
During or after a session, the assigned doctor fills in structured notes via the form linked to that session type.

**Form Rules:**
- One session type = **one form** (1:1 relationship)
- Forms are created and managed by the Admin
- Questions are drawn from a shared **Question Bank**
- Completed forms are stored permanently in the session record
- Session types without a form assigned use **free-text notes only**

#### Question Bank
A centralized library of reusable clinical questions. Admins can:

- Browse and search existing questions
- Add questions from the bank into any form
- Create new questions for future reuse
- Define answer types: **free text, yes/no, scale rating, multiple choice**, etc.

This ensures standardization, reduces duplication, and speeds up form creation.

---

### Treatment Plans & Progress Tracking

#### Treatment Plans
A treatment plan groups a defined set of sessions under a single clinical goal, giving doctors and staff a structured view of a patient's rehabilitation journey.

- **Create a treatment plan** at or after the initial evaluation, specifying:
  - Clinical goal (e.g. "Restore full shoulder mobility post-surgery")
  - Planned number of sessions
  - Target completion date
  - Assigned doctor
- All sessions within the plan are linked, allowing progress to be tracked holistically.
- Plans can be extended, modified, or closed (with a discharge summary) by the treating doctor.

#### Progress & Outcome Tracking
- Doctors can record **standardized outcome measures** at each session (e.g. pain scale 0–10, range of motion in degrees, functional scores).
- The system displays **trend charts** showing improvement over time across key metrics.
- Outcome data is stored as part of the session form responses and is visible in the patient's profile.
- At discharge, a summary of progress from initial evaluation to final session is auto-generated.

---

### Attendance & No-Show Tracking

- After each session time slot passes, the doctor or front desk marks the session as one of:
  - ✅ **Attended** — patient was present
  - ❌ **No-Show** — patient did not attend without notice
  - 🔁 **Late Cancellation** — cancelled within a defined window (e.g. < 24 hours)
  - 📅 **Rescheduled** — moved to a new slot
- No-show and late cancellation history is visible on the patient profile.
- Attendance data feeds into **billing** (e.g. late cancellation fees) and **reporting**.

---

### Notifications & Reminders

Automated notifications keep patients and staff informed at every stage.

| Trigger | Recipient | Channel |
|---------|-----------|---------|
| Session booked | Patient | SMS / WhatsApp / Email |
| Session reminder (24h before) | Patient | SMS / WhatsApp / Email |
| Session reminder (1h before) | Patient | SMS / WhatsApp |
| Session cancelled | Patient | SMS / WhatsApp / Email |
| Waitlist slot available | Waitlisted patient | SMS / WhatsApp / Email |
| Session assigned | Doctor | In-app / Email |
| Pending form completion | Doctor | In-app |

- Notification preferences (channel, timing) are configurable per patient and globally by the Admin.
- Clinic can customize message templates.

---

### Billing & Payments

- Each **session type** has a configurable fee set by the Admin.
- After a session is marked as attended, an **invoice is automatically generated** for the patient.
- Billing features include:
  - Session-level invoicing
  - Package / treatment plan pricing (e.g. pay for 10 sessions upfront)
  - Insurance / third-party billing notes
  - Late cancellation and no-show fee rules
  - Payment status tracking: Pending, Paid, Waived
- Admins can view billing summaries per patient, per doctor, or per time period.

---

### Referral Tracking

- During patient intake, the referral source is captured:
  - **Self-referral**
  - **GP / Specialist referral** — doctor name, clinic, and contact
  - **Hospital referral** — hospital name and department
  - **Internal referral** — from another doctor within the clinic
- Referral data is stored on the patient profile and can be used for reporting (e.g. which referral sources bring the most patients).
- Referral letters or documents can be uploaded and attached to the patient profile.

---

### Document & File Uploads

Patients often arrive with supporting clinical documents. The system allows:

- Uploading files directly to a patient's profile:
  - X-rays, MRI / CT scan reports
  - GP referral letters
  - Previous physiotherapy notes
  - Insurance documents
- Files are organized by type and date, and are accessible to authorized staff and doctors.
- Doctors can also attach files to individual session records (e.g. annotated exercise sheets).
- Supported formats: PDF, JPEG, PNG, DICOM *(configurable)*.

---

### Patient Consent Forms

- Before the first session, patients are required to complete a **consent form** covering:
  - Consent to physiotherapy treatment
  - Data privacy and record-keeping acknowledgment
  - Any clinic-specific policies
- Consent forms can be:
  - Sent digitally to the patient (via email/SMS link) for self-completion before arrival
  - Completed in-clinic on a tablet or front-desk terminal
- Signed consent is stored permanently on the patient profile with a timestamp.
- Admins can create and manage consent form templates.

---

### Doctor Dashboard

Each doctor has a **personal dashboard** providing a focused view of their workload:

- **Today's Schedule** — list of all sessions for the current day with patient names, session types, and times
- **Upcoming Sessions** — week-ahead view of booked sessions
- **Pending Form Completions** — sessions where the clinical form has not yet been filled in
- **Active Treatment Plans** — patients currently under their care with plan progress
- **Patient Quick Access** — search and open any patient profile directly from the dashboard
- **Notifications** — new assignments, cancellations, and system alerts

---

### Multi-Clinic / Branch Support

ProHuman supports clinics operating across **multiple locations or branches**:

- Each branch has its own:
  - Doctor roster and availability schedules
  - Calendar and session bookings
  - Operating hours and room/resource configuration
- Patients can be seen across branches — their profile and history is shared clinic-wide.
- Administrators can manage all branches from a single Admin Panel or restrict access per branch.
- Reporting can be viewed per branch or aggregated across all locations.

---

### Admin Panel

The Admin Panel is the configuration backbone of the entire application.

#### 🩺 Doctor & Availability Management
- Add, edit, or deactivate doctor profiles
- Define each doctor's weekly availability schedule (day, start time, end time)
- Schedules can be recurring or vary by week
- Assign doctors to specific branches
- Availability changes reflect in **real time** on the scheduling calendar

#### 📁 Session Type Management
- Create, edit, or archive session types
- Assign display name, description, default duration, and fee
- Associate a form with each session type

#### 🛠️ Form Builder
- Create forms by selecting from the Question Bank or writing new questions
- Organize questions (reorder, group, mark as required)
- Preview forms before publishing
- Link forms to session types
- Edit forms *(changes apply to future sessions only — historical records are preserved)*

#### ❓ Question Bank Management
- Add questions with defined answer types
- Edit or retire existing questions
- Tag and categorize questions for easy searching
- View which forms currently use a given question

#### 🏢 Branch Management
- Add and configure clinic branches
- Set branch-specific operating hours and staff assignments
- View branch-level reporting

#### 💰 Billing Configuration
- Set fees per session type
- Define late cancellation and no-show policies
- Configure package pricing rules
- Manage payment status and generate billing reports

#### 📄 Consent Form Management
- Create and manage consent form templates
- Set which forms are required before a patient's first session

#### ⚙️ General Clinic Settings
- Clinic operating hours
- Staff accounts and role assignments
- Patient ID format
- Notification templates and preferences
- Other clinic-specific configurations

---

## End-to-End Workflow

```
1. 📞 Inquiry Call
   └─ Front desk captures: name, age, gender, contact, referral source, presenting problems

2. 👤 Patient Profile Created
   └─ New profile created OR existing profile updated for returning patients

3. 📄 Consent Form Sent
   └─ Digital consent form sent to patient before first session

4. 🗓️ Schedule Session
   └─ Front desk selects date/time → system shows only available doctors

5. ✅ Session Booked
   └─ Doctor and session type selected → session appears on calendar
   └─ Patient receives automated confirmation and reminder

6. 🏥 Session Conducted
   └─ Doctor meets patient and opens the session record

7. 📝 Form Completed
   └─ Doctor fills in the session form (questions from the Question Bank)
   └─ Outcome measures recorded for progress tracking

8. 📊 Attendance Marked
   └─ Session marked as Attended / No-Show / Late Cancellation

9. 💾 Record Saved
   └─ Completed form and notes saved to the patient's profile

10. 💳 Invoice Generated
    └─ Billing record created for the session

11. 🔄 Next Steps
    └─ Follow-up sessions scheduled as part of a treatment plan
    └─ Recurring appointments set if applicable
```

---

## Data Model

| Entity | Key Attributes |
|--------|---------------|
| **Patient** | Patient ID, Name, Age, Gender, Contact, Complaints, Referral Source, Session History, Documents |
| **Doctor** | Doctor ID, Name, Specialty, Weekly Availability Schedule, Branch |
| **Session** | Session ID, Patient, Doctor, Date/Time, Session Type, Status, Attendance, Notes/Form Responses |
| **Session Type** | Type ID, Name, Description, Duration, Fee, Linked Form |
| **Form** | Form ID, Title, Ordered List of Questions, Linked Session Type |
| **Question** | Question ID, Text, Answer Type, Tags, Used-In (Forms) |
| **Treatment Plan** | Plan ID, Patient, Doctor, Goal, Planned Sessions, Start Date, Target End Date, Status |
| **Appointment** | Appointment ID, Session ID, Recurrence Pattern, Series ID |
| **Waitlist Entry** | Entry ID, Patient, Preferred Doctor, Preferred Time, Status |
| **Invoice** | Invoice ID, Session ID, Patient, Amount, Status, Payment Date |
| **Referral** | Referral ID, Patient ID, Source Type, Referring Doctor/Hospital, Date |
| **Branch** | Branch ID, Name, Address, Operating Hours, Assigned Staff |
| **Consent Record** | Consent ID, Patient ID, Form Template, Signed At, Signature |

---

## Getting Started

> ⚠️ Setup instructions will be added as the project is developed.

```bash
# Clone the repository
git clone https://github.com/prohuman/scheduling-app.git
cd scheduling-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start the development server
npm run dev
```

---

## Contributing

This project is currently in active development. Contribution guidelines will be published once the initial version is stable.

---

<div align="center">
  <sub>ProHuman Health Scheduling App — Version 1.0 | 2025</sub><br/>
  <sub>Healthcare · Physiotherapy & Rehabilitation</sub>
</div>