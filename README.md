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
  - [Session Management & Clinical Notes](#session-management--clinical-notes)
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

---

## User Roles

| Role | Responsibilities |
|------|-----------------|
| **Front Desk Staff** | Handles incoming inquiry calls, captures patient information, schedules sessions by viewing doctor availability in real time |
| **Doctor / Clinician** | Conducts sessions, fills in session note forms during or after the session, reviews patient history |
| **Administrator** | Manages all system configuration: doctor schedules, session types, form templates, question bank, and clinic settings |

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

> Additional fields may be configured by the Admin as needed.

#### Patient Database
- **New patients** receive a unique patient ID and a fresh profile automatically.
- **Returning patients** are detected by name, phone number, or other identifier — new intake notes are appended to the existing profile (no duplicates).
- Patient profiles serve as **persistent clinical records**, accumulating session history, notes, and treatment data over time.
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
- **Notes** *(optional)* — any pre-session notes from the intake call

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

### Admin Panel

The Admin Panel is the configuration backbone of the entire application.

#### 🩺 Doctor & Availability Management
- Add, edit, or deactivate doctor profiles
- Define each doctor's weekly availability schedule (day, start time, end time)
- Schedules can be recurring or vary by week
- Availability changes reflect in **real time** on the scheduling calendar

#### 📁 Session Type Management
- Create, edit, or archive session types
- Assign display name, description, and default duration
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

#### ⚙️ General Clinic Settings
- Clinic operating hours
- Staff accounts and role assignments
- Patient ID format
- Notification preferences
- Other clinic-specific configurations

---

## End-to-End Workflow

```
1. 📞 Inquiry Call
   └─ Front desk captures: name, age, gender, presenting problems

2. 👤 Patient Profile Created
   └─ New profile created OR existing profile updated for returning patients

3. 🗓️ Schedule Session
   └─ Front desk selects date/time → system shows only available doctors

4. ✅ Session Booked
   └─ Doctor and session type selected → session appears on calendar

5. 🏥 Session Conducted
   └─ Doctor meets patient and opens the session record

6. 📝 Form Completed
   └─ Doctor fills in the session form (questions from the Question Bank)

7. 💾 Record Saved
   └─ Completed form and notes saved to the patient's profile

8. 🔄 Next Steps
   └─ Follow-up sessions scheduled using the same workflow
```

---

## Data Model

| Entity | Key Attributes |
|--------|---------------|
| **Patient** | Patient ID, Name, Age, Gender, Complaints, Session History |
| **Doctor** | Doctor ID, Name, Specialty, Weekly Availability Schedule |
| **Session** | Session ID, Patient, Doctor, Date/Time, Session Type, Status, Notes/Form Responses |
| **Session Type** | Type ID, Name, Description, Duration, Linked Form |
| **Form** | Form ID, Title, Ordered List of Questions, Linked Session Type |
| **Question** | Question ID, Text, Answer Type, Tags, Used-In (Forms) |

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