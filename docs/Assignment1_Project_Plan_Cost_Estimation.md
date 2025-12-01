# SSE3310 SOFTWARE PROJECT MANAGEMENT
## Assignment 1: Project Plan and Software Cost Estimation

---

**FACULTY OF SCIENCE COMPUTER AND TECHNOLOGY AND INFORMATION**  
**DEPARTMENT OF SOFTWARE ENGINEERING AND INFORMATION TECHNOLOGY**

---

### PREPARED BY:
| Name | Matric Number |
|------|---------------|
| NGOOI XUE YANG | - |
| KYLE JOHN BOUDVILLE | 224901 |
| LI JIA QI | 218451 |
| EWING HO GAWING | 224807 |
| LEE YEE HAN | 223139 |
| LOW JIA QING | 225328 |

**SUPERVISED BY:** PROF. MADYA DR. YUSMADI YAH BINTI JUSOH

**SEMESTER:** 1 2025/2026

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Methodology](#4-methodology)
5. [Stakeholders](#5-stakeholders)
6. [Project Planning and Cost Estimation Tools](#6-project-planning-and-cost-estimation-tools)
7. [Work Breakdown Structure (WBS)](#7-work-breakdown-structure-wbs)
8. [Gantt Chart](#8-gantt-chart)
9. [Network Diagram](#9-network-diagram)
10. [Cost Estimation](#10-cost-estimation)
11. [Conclusions](#11-conclusions)
12. [References](#12-references)

---

## 1. Project Overview

### 1.1 Project Title
**Edutech Platform** - A Comprehensive Online Education Marketplace

### 1.2 Project Description
The Edutech Platform is a full-featured online education marketplace designed to facilitate seamless learning experiences. The platform connects verified teachers with students, supporting multiple learning formats including live sessions, recorded content, and hybrid delivery modes.

### 1.3 Key Features
| Module | Description |
|--------|-------------|
| **User Management** | Multi-role system (Student, Teacher, Admin) with JWT authentication |
| **Teacher Verification** | Document upload and certification verification workflow |
| **Course Management** | Support for Live, Recorded, and Hybrid course types |
| **Live Sessions** | Real-time video conferencing integration with Socket.io |
| **Payment System** | Stripe integration with commission management |
| **Wallet & Earnings** | Teacher earnings tracking with multiple payout methods |
| **Community** | Social learning features (posts, comments, likes, follows) |
| **Support System** | Ticketing system for customer issues and refund processing |
| **Review System** | Ratings, reviews, and quality assurance mechanisms |

### 1.4 Technical Stack
| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18.2.0, TypeScript 5.3.3, Vite, TailwindCSS, Zustand |
| **Backend** | Node.js 18+, Express 4.18.2, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 14, Redis (caching) |
| **Real-time** | Socket.io 4.6.0 |
| **Payments** | Stripe API |
| **DevOps** | Docker, Docker Compose, Nginx |

---

## 2. Problem Statement

The current Educational Technology (Edutech) market faces several critical challenges:

1. **Limited Real-time Interaction**: Existing platforms like Udemy, Coursera, and Skillshare primarily support asynchronous, pre-recorded content, limiting teacher-student interaction.

2. **Fragmented Content Distribution**: Independent educators distribute content across multiple platforms (YouTube, TikTok, WhatsApp, Telegram), making it difficult for students to discover and compare teaching options.

3. **Teacher Credibility Gap**: Most platforms lack systematic certification checks, leading to concerns about unqualified instructors.

4. **Inadequate Quality Assurance**: Students lack centralized mechanisms for complaints, refunds, and quality reporting.

5. **Inflexible Learning Formats**: Current solutions do not adequately support teachers' freedom to design their preferred delivery methods (live, recorded, or hybrid).

6. **Limited K-12 Coverage**: Existing online learning platforms mainly provide higher-education and industry-focused digital courses with limited content for primary and secondary school students.

---

## 3. Project Objectives

### 3.1 Primary Objectives
1. **Develop a unified Edutech platform** that integrates teacher verification, multiple learning formats, and quality assurance mechanisms.

2. **Implement systematic teacher verification** with document upload, certification management, and status tracking.

3. **Support flexible course delivery** including Live, Recorded, and Hybrid formats.

4. **Create a sustainable revenue model** through commission-based pricing.

### 3.2 SMART Objectives
| Objective | Specific | Measurable | Achievable | Relevant | Time-bound |
|-----------|----------|------------|------------|----------|------------|
| User Authentication | Implement JWT-based multi-role auth | 100% role coverage | Using proven libraries | Core requirement | Week 2-3 |
| Course Management | Create CRUD for courses & lessons | 3 course types | Incremental development | Market need | Week 4-6 |
| Payment Integration | Stripe checkout implementation | Full payment flow | Stripe SDK available | Revenue critical | Week 7-8 |
| Real-time Features | Socket.io messaging | <500ms latency | Socket.io proven | User engagement | Week 9-10 |
| Quality Assurance | Review & reporting system | All modules tested | Jest framework | Platform trust | Week 11-12 |

---

## 4. Methodology

### 4.1 Development Methodology: Agile Scrum

We adopted **Agile Scrum** methodology for this project due to its flexibility and iterative nature.

#### Sprint Structure
- **Sprint Duration**: 2 weeks
- **Total Sprints**: 6 sprints (12 weeks)
- **Team Size**: 6 members

#### Scrum Events
| Event | Frequency | Duration | Purpose |
|-------|-----------|----------|---------|
| Sprint Planning | Start of sprint | 2 hours | Plan sprint backlog |
| Daily Standup | Daily | 15 minutes | Progress sync |
| Sprint Review | End of sprint | 1 hour | Demo deliverables |
| Sprint Retrospective | End of sprint | 1 hour | Process improvement |

### 4.2 Development Phases

```
Phase 1: Planning & Setup (Week 1-2)
├── Requirements gathering
├── Architecture design
├── Development environment setup
└── Database schema design

Phase 2: Core Development (Week 3-8)
├── User authentication system
├── Course management module
├── Teacher verification system
├── Payment integration
└── Enrollment system

Phase 3: Advanced Features (Week 9-10)
├── Real-time messaging
├── Community features
├── Live session management
└── Wallet & earnings system

Phase 4: Quality Assurance (Week 11-12)
├── Unit testing
├── Integration testing
├── Performance optimization
└── Security audit

Phase 5: Deployment (Week 12)
├── Docker containerization
├── Production deployment
└── Documentation
```

---

## 5. Stakeholders

### 5.1 Stakeholder Analysis

| Stakeholder | Role | Interest | Influence | Engagement Strategy |
|-------------|------|----------|-----------|---------------------|
| **Students** | Primary users | High | Medium | User testing, feedback loops |
| **Teachers** | Content providers | High | High | Feature consultation, beta testing |
| **Administrators** | Platform managers | High | High | Requirements workshops |
| **Development Team** | Builders | High | High | Daily standups, sprint reviews |
| **Project Supervisor** | Academic oversight | Medium | High | Weekly progress reports |
| **University** | Academic institution | Low | Medium | Final deliverable review |

### 5.2 RACI Matrix

| Activity | Ngooi XY | Kyle JB | Li JQ | Ewing HG | Lee YH | Low JQ |
|----------|----------|---------|-------|----------|--------|--------|
| Backend Development | C | R | A | R | C | I |
| Frontend Development | R | C | R | A | R | C |
| Database Design | I | R | A | C | R | I |
| Testing | C | R | C | R | A | R |
| Documentation | R | C | R | C | C | A |
| Deployment | C | A | R | R | C | R |

**Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 6. Project Planning and Cost Estimation Tools

### 6.1 Selected Tools

#### 6.1.1 Project Planning Tool: **GanttProject**
- **Website**: https://www.ganttproject.biz/
- **License**: Free and Open Source (GPL)
- **Features**:
  - Gantt chart creation and management
  - Resource allocation
  - Task dependencies
  - Critical path analysis
  - Export to PDF, PNG, CSV

**Justification**: GanttProject is a free, cross-platform tool that provides comprehensive project planning features including Gantt charts, PERT charts, and resource management—ideal for academic projects.

#### 6.1.2 Cost Estimation Tool: **COCOMO II Calculator**
- **Method**: Constructive Cost Model II
- **Website**: http://csse.usc.edu/csse/research/COCOMOII/
- **Features**:
  - Lines of Code (LOC) based estimation
  - Function Point analysis
  - Effort and schedule calculation
  - Multiple cost drivers

**Justification**: COCOMO II is an industry-standard cost estimation model that provides reliable estimates based on project size and complexity factors.

### 6.2 Tool Exploration

#### GanttProject Features Used
1. **Task Creation**: Hierarchical task structure with WBS codes
2. **Dependencies**: Finish-to-Start (FS), Start-to-Start (SS)
3. **Resources**: Team member assignment and workload tracking
4. **Baselines**: Compare planned vs actual progress
5. **Reports**: Gantt chart export for documentation

#### COCOMO II Model Application
- **Model Used**: Post-Architecture Model
- **Size Metric**: Source Lines of Code (SLOC)
- **Scale Factors**: Precedentedness, Development Flexibility, Risk Resolution, Team Cohesion, Process Maturity
- **Cost Drivers**: Product, Platform, Personnel, Project factors

---

## 7. Work Breakdown Structure (WBS)

### 7.1 WBS Dictionary

```
1.0 Edutech Platform
│
├── 1.1 Project Management
│   ├── 1.1.1 Project Planning
│   ├── 1.1.2 Risk Management
│   ├── 1.1.3 Progress Tracking
│   └── 1.1.4 Documentation
│
├── 1.2 Requirements & Design
│   ├── 1.2.1 Requirements Analysis
│   ├── 1.2.2 Use Case Development
│   ├── 1.2.3 System Architecture Design
│   ├── 1.2.4 Database Schema Design
│   └── 1.2.5 UI/UX Design
│
├── 1.3 Backend Development
│   ├── 1.3.1 Project Setup
│   │   ├── 1.3.1.1 Express Configuration
│   │   ├── 1.3.1.2 Prisma Setup
│   │   └── 1.3.1.3 Middleware Configuration
│   ├── 1.3.2 Authentication Module
│   │   ├── 1.3.2.1 JWT Implementation
│   │   ├── 1.3.2.2 Role-based Access Control
│   │   └── 1.3.2.3 Token Refresh System
│   ├── 1.3.3 User Management
│   │   ├── 1.3.3.1 User CRUD Operations
│   │   ├── 1.3.3.2 Profile Management
│   │   └── 1.3.3.3 Admin User Management
│   ├── 1.3.4 Teacher Verification
│   │   ├── 1.3.4.1 Document Upload
│   │   ├── 1.3.4.2 Verification Workflow
│   │   └── 1.3.4.3 Status Management
│   ├── 1.3.5 Course Management
│   │   ├── 1.3.5.1 Course CRUD
│   │   ├── 1.3.5.2 Lesson Management
│   │   ├── 1.3.5.3 Package System
│   │   └── 1.3.5.4 Material Upload
│   ├── 1.3.6 Payment System
│   │   ├── 1.3.6.1 Stripe Integration
│   │   ├── 1.3.6.2 Order Processing
│   │   ├── 1.3.6.3 Commission Calculation
│   │   └── 1.3.6.4 Refund Processing
│   ├── 1.3.7 Enrollment System
│   │   ├── 1.3.7.1 Enrollment Management
│   │   ├── 1.3.7.2 Progress Tracking
│   │   └── 1.3.7.3 Completion Certificates
│   ├── 1.3.8 Messaging System
│   │   ├── 1.3.8.1 Socket.io Setup
│   │   ├── 1.3.8.2 Thread Management
│   │   └── 1.3.8.3 Real-time Notifications
│   ├── 1.3.9 Community Module
│   │   ├── 1.3.9.1 Post Management
│   │   ├── 1.3.9.2 Comments & Likes
│   │   └── 1.3.9.3 Follow System
│   ├── 1.3.10 Wallet System
│   │   ├── 1.3.10.1 Balance Management
│   │   ├── 1.3.10.2 Transaction History
│   │   └── 1.3.10.3 Payout Processing
│   └── 1.3.11 Support System
│       ├── 1.3.11.1 Ticket Management
│       ├── 1.3.11.2 Review System
│       └── 1.3.11.3 Reporting System
│
├── 1.4 Frontend Development
│   ├── 1.4.1 Project Setup
│   │   ├── 1.4.1.1 Vite Configuration
│   │   ├── 1.4.1.2 TailwindCSS Setup
│   │   └── 1.4.1.3 Router Configuration
│   ├── 1.4.2 Common Components
│   │   ├── 1.4.2.1 Layout Components
│   │   ├── 1.4.2.2 Form Components
│   │   └── 1.4.2.3 UI Components
│   ├── 1.4.3 Authentication Pages
│   │   ├── 1.4.3.1 Login Page
│   │   ├── 1.4.3.2 Registration Page
│   │   └── 1.4.3.3 Auth Guards
│   ├── 1.4.4 Student Dashboard
│   │   ├── 1.4.4.1 Course Discovery
│   │   ├── 1.4.4.2 My Courses
│   │   ├── 1.4.4.3 Cart & Checkout
│   │   └── 1.4.4.4 Order History
│   ├── 1.4.5 Teacher Dashboard
│   │   ├── 1.4.5.1 Course Management
│   │   ├── 1.4.5.2 Student Analytics
│   │   ├── 1.4.5.3 Earnings Dashboard
│   │   └── 1.4.5.4 Profile Management
│   ├── 1.4.6 Admin Dashboard
│   │   ├── 1.4.6.1 User Management
│   │   ├── 1.4.6.2 Course Moderation
│   │   ├── 1.4.6.3 Financial Reports
│   │   └── 1.4.6.4 Support Management
│   ├── 1.4.7 Community Pages
│   │   ├── 1.4.7.1 Feed Page
│   │   ├── 1.4.7.2 Post Creation
│   │   └── 1.4.7.3 User Profiles
│   └── 1.4.8 Messaging Interface
│       ├── 1.4.8.1 Thread List
│       └── 1.4.8.2 Chat Interface
│
├── 1.5 Testing
│   ├── 1.5.1 Unit Testing
│   ├── 1.5.2 Integration Testing
│   ├── 1.5.3 End-to-End Testing
│   └── 1.5.4 Performance Testing
│
├── 1.6 Deployment
│   ├── 1.6.1 Docker Configuration
│   ├── 1.6.2 CI/CD Setup
│   ├── 1.6.3 Production Deployment
│   └── 1.6.4 Monitoring Setup
│
└── 1.7 Documentation
    ├── 1.7.1 API Documentation
    ├── 1.7.2 User Manual
    ├── 1.7.3 Technical Documentation
    └── 1.7.4 Final Report
```

### 7.2 WBS Summary Table

| WBS Code | Task Name | Duration | Predecessor |
|----------|-----------|----------|-------------|
| 1.1 | Project Management | 12 weeks | - |
| 1.2 | Requirements & Design | 2 weeks | - |
| 1.3 | Backend Development | 8 weeks | 1.2 |
| 1.4 | Frontend Development | 8 weeks | 1.2 |
| 1.5 | Testing | 2 weeks | 1.3, 1.4 |
| 1.6 | Deployment | 1 week | 1.5 |
| 1.7 | Documentation | 2 weeks | 1.6 |

---

## 8. Gantt Chart

### 8.1 Project Timeline

```
Week:        1    2    3    4    5    6    7    8    9   10   11   12
            |----|----|----|----|----|----|----|----|----|----|----|----|

1.1 Project Management
            |============================================================|

1.2 Requirements & Design
            |====|====|

1.3 Backend Development
                      |====|====|====|====|====|====|====|====|

1.3.1 Project Setup
                      |====|

1.3.2 Auth Module
                           |====|====|

1.3.3 User Management
                                     |====|

1.3.4 Teacher Verification
                                          |====|

1.3.5 Course Management
                                               |====|====|

1.3.6 Payment System
                                                         |====|

1.3.7 Enrollment System
                                                              |====|

1.3.8 Messaging System
                                                                   |====|

1.4 Frontend Development
                      |====|====|====|====|====|====|====|====|

1.4.1 Project Setup
                      |====|

1.4.2 Common Components
                           |====|

1.4.3 Auth Pages
                                |====|

1.4.4 Student Dashboard
                                     |====|====|

1.4.5 Teacher Dashboard
                                               |====|====|

1.4.6 Admin Dashboard
                                                         |====|====|

1.5 Testing
                                                                   |====|====|

1.6 Deployment
                                                                             |====|

1.7 Documentation
                                                                   |====|====|

MILESTONES:
M1: Requirements Complete (Week 2) ◆
M2: Core Backend Ready (Week 6) ◆
M3: MVP Complete (Week 8) ◆
M4: Testing Complete (Week 11) ◆
M5: Project Delivery (Week 12) ◆
```

### 8.2 Critical Path

The **critical path** identifies the longest sequence of dependent tasks:

```
Requirements & Design → Backend Setup → Auth Module → Course Management → 
Payment System → Enrollment → Testing → Deployment

Critical Path Duration: 12 weeks
Total Float: 0 days (no delay allowed on critical path)
```

---

## 9. Network Diagram

### 9.1 Activity-on-Node (AON) Network

```
                                    ┌─────────────┐
                                    │   START     │
                                    │   (0 days)  │
                                    └──────┬──────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │ 1.2 Req &   │
                                    │ Design      │
                                    │ (14 days)   │
                                    └──────┬──────┘
                                           │
                         ┌─────────────────┼─────────────────┐
                         │                 │                 │
                         ▼                 ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
                  │ 1.3.1 BE    │   │ 1.4.1 FE    │   │ 1.7.1 API   │
                  │ Setup       │   │ Setup       │   │ Docs        │
                  │ (7 days)    │   │ (7 days)    │   │ (7 days)    │
                  └──────┬──────┘   └──────┬──────┘   └─────────────┘
                         │                 │
                         ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐
                  │ 1.3.2 Auth  │   │ 1.4.2 Comp  │
                  │ Module      │   │ Library     │
                  │ (14 days)   │   │ (7 days)    │
                  └──────┬──────┘   └──────┬──────┘
                         │                 │
                         ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐
                  │ 1.3.3-4     │   │ 1.4.3 Auth  │
                  │ User & Tchr │   │ Pages       │
                  │ (14 days)   │   │ (7 days)    │
                  └──────┬──────┘   └──────┬──────┘
                         │                 │
                         ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐
                  │ 1.3.5 Course│   │ 1.4.4-6     │
                  │ Management  │   │ Dashboards  │
                  │ (14 days)   │   │ (28 days)   │
                  └──────┬──────┘   └──────┬──────┘
                         │                 │
                         ▼                 │
                  ┌─────────────┐          │
                  │ 1.3.6-7     │          │
                  │ Payment &   │          │
                  │ Enrollment  │          │
                  │ (14 days)   │          │
                  └──────┬──────┘          │
                         │                 │
                         ▼                 │
                  ┌─────────────┐          │
                  │ 1.3.8-11    │          │
                  │ Messaging & │          │
                  │ Community   │          │
                  │ (7 days)    │          │
                  └──────┬──────┘          │
                         │                 │
                         └────────┬────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ 1.5 Testing │
                           │ (14 days)   │
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ 1.6 Deploy  │
                           │ (7 days)    │
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │    END      │
                           │   (0 days)  │
                           └─────────────┘
```

### 9.2 Critical Path Analysis

| Activity | Duration | ES | EF | LS | LF | Slack |
|----------|----------|----|----|----|----|-------|
| 1.2 Requirements | 14 | 0 | 14 | 0 | 14 | 0* |
| 1.3.1 BE Setup | 7 | 14 | 21 | 14 | 21 | 0* |
| 1.3.2 Auth | 14 | 21 | 35 | 21 | 35 | 0* |
| 1.3.3-4 User/Teacher | 14 | 35 | 49 | 35 | 49 | 0* |
| 1.3.5 Course | 14 | 49 | 63 | 49 | 63 | 0* |
| 1.3.6-7 Payment | 14 | 63 | 77 | 63 | 77 | 0* |
| 1.5 Testing | 14 | 77 | 91 | 77 | 91 | 0* |
| 1.6 Deployment | 7 | 91 | 98 | 91 | 98 | 0* |

**ES** = Early Start, **EF** = Early Finish, **LS** = Late Start, **LF** = Late Finish  
\* = Critical Path (Slack = 0)

---

## 10. Cost Estimation

### 10.1 COCOMO II Estimation

#### 10.1.1 Project Size Estimation

| Component | Files | Estimated SLOC |
|-----------|-------|----------------|
| **Backend** | | |
| Controllers | 20 | 4,000 |
| Services | 19 | 5,700 |
| Routes | 18 | 1,800 |
| Middleware | 10 | 1,500 |
| Utils | 8 | 1,200 |
| Types/Config | 15 | 1,500 |
| **Backend Subtotal** | **90** | **15,700** |
| **Frontend** | | |
| Components | 77 | 15,400 |
| Pages | 55 | 16,500 |
| Hooks | 26 | 2,600 |
| Services | 20 | 3,000 |
| Store/Types | 15 | 1,500 |
| **Frontend Subtotal** | **193** | **39,000** |
| **Infrastructure** | | |
| Docker/Nginx | 5 | 300 |
| Prisma Schema | 1 | 500 |
| Tests | 10 | 1,500 |
| **Infrastructure Subtotal** | **16** | **2,300** |
| **TOTAL** | **299** | **57,000 SLOC** |

#### 10.1.2 COCOMO II Parameters

**Scale Factors (SF):**
| Factor | Rating | Value |
|--------|--------|-------|
| PREC (Precedentedness) | Nominal | 3.72 |
| FLEX (Development Flexibility) | High | 2.03 |
| RESL (Risk Resolution) | Nominal | 4.24 |
| TEAM (Team Cohesion) | High | 2.19 |
| PMAT (Process Maturity) | Nominal | 4.68 |
| **Total SF** | | **16.86** |

**Exponent E** = 0.91 + 0.01 × 16.86 = **1.0786**

**Effort Multipliers (EM):**
| Factor | Rating | Value |
|--------|--------|-------|
| RELY (Required Reliability) | High | 1.10 |
| DATA (Database Size) | High | 1.14 |
| CPLX (Product Complexity) | High | 1.17 |
| RUSE (Required Reusability) | Nominal | 1.00 |
| DOCU (Documentation) | Nominal | 1.00 |
| TIME (Execution Time) | Nominal | 1.00 |
| STOR (Storage Constraint) | Nominal | 1.00 |
| PVOL (Platform Volatility) | Low | 0.87 |
| ACAP (Analyst Capability) | High | 0.85 |
| PCAP (Programmer Capability) | High | 0.88 |
| PCON (Personnel Continuity) | High | 0.90 |
| APEX (Applications Experience) | High | 0.88 |
| PLEX (Platform Experience) | Nominal | 1.00 |
| LTEX (Language Experience) | High | 0.91 |
| TOOL (Tool Use) | High | 0.90 |
| SITE (Multi-site Development) | High | 0.93 |
| SCED (Schedule Constraint) | Nominal | 1.00 |
| **Product of EMs** | | **0.547** |

#### 10.1.3 Effort Calculation

**Formula:** Effort = A × Size^E × EM

Where:
- A = 2.94 (COCOMO II constant)
- Size = 57 KSLOC
- E = 1.0786
- EM = 0.547

**Calculation:**
```
Effort = 2.94 × (57)^1.0786 × 0.547
Effort = 2.94 × 82.94 × 0.547
Effort = 133.4 Person-Months
```

#### 10.1.4 Schedule Calculation

**Formula:** Duration = C × Effort^F

Where:
- C = 3.67 (COCOMO II constant)
- F = 0.28 + 0.2 × (E - 0.91) = 0.28 + 0.2 × 0.1686 = 0.3137
- Effort = 133.4 PM

**Calculation:**
```
Duration = 3.67 × (133.4)^0.3137
Duration = 3.67 × 4.38
Duration = 16.1 months
```

**Adjusted for Academic Project (Compression Factor 0.75):**
```
Duration = 16.1 × 0.75 = 12.1 months ≈ 12 weeks (one semester)
```

### 10.2 Cost Breakdown

#### 10.2.1 Development Cost (Hypothetical Industry Rates)

| Role | Rate/Hour (MYR) | Hours | Total (MYR) |
|------|-----------------|-------|-------------|
| Senior Developer | 150 | 480 | 72,000 |
| Full-stack Developer | 100 | 960 | 96,000 |
| Frontend Developer | 80 | 480 | 38,400 |
| QA Engineer | 70 | 240 | 16,800 |
| UI/UX Designer | 90 | 160 | 14,400 |
| Project Manager | 120 | 200 | 24,000 |
| **Development Subtotal** | | **2,520** | **261,600** |

#### 10.2.2 Infrastructure Cost (Monthly)

| Item | Monthly Cost (MYR) | Duration | Total (MYR) |
|------|-------------------|----------|-------------|
| Cloud Hosting (AWS/GCP) | 500 | 12 | 6,000 |
| Database (PostgreSQL) | 200 | 12 | 2,400 |
| Redis Cache | 100 | 12 | 1,200 |
| CDN & Storage | 150 | 12 | 1,800 |
| Domain & SSL | 50 | 12 | 600 |
| **Infrastructure Subtotal** | **1,000** | | **12,000** |

#### 10.2.3 Third-party Services

| Service | Monthly Cost (MYR) | Duration | Total (MYR) |
|---------|-------------------|----------|-------------|
| Stripe Fees (2.9% + 0.30) | 300 | 12 | 3,600 |
| Email Service (SendGrid) | 100 | 12 | 1,200 |
| Monitoring (Sentry) | 150 | 12 | 1,800 |
| Video Hosting | 200 | 12 | 2,400 |
| **Services Subtotal** | **750** | | **9,000** |

#### 10.2.4 Total Project Cost Summary

| Category | Cost (MYR) | Percentage |
|----------|------------|------------|
| Development | 261,600 | 92.6% |
| Infrastructure | 12,000 | 4.2% |
| Third-party Services | 9,000 | 3.2% |
| **TOTAL** | **282,600** | **100%** |

### 10.3 Academic Project Cost (Actual)

For an academic project with 6 student developers:

| Item | Cost (MYR) |
|------|------------|
| Domain Registration | 50 |
| Cloud Credits (Student) | 0 (Free tier) |
| Development Tools | 0 (Open source) |
| Testing Services | 0 (Free tier) |
| **Total Academic Cost** | **50** |

---

## 11. Conclusions

### 11.1 Project Viability Assessment

Based on the planning and cost estimation analysis:

1. **Technical Feasibility**: The project is technically feasible using modern open-source technologies (React, Node.js, PostgreSQL). The team has adequate skills for full-stack development.

2. **Schedule Feasibility**: The 12-week timeline aligns with COCOMO II estimates when compression factors are applied. The critical path analysis shows no scheduling conflicts.

3. **Resource Feasibility**: The 6-member team is sufficient for parallel frontend and backend development streams.

4. **Economic Feasibility**: While industry cost estimates are ~MYR 282,600, the academic project can be completed with minimal actual costs using free tools and cloud credits.

### 11.2 Key Success Factors

1. **Clear WBS**: Comprehensive work breakdown ensures no task is overlooked
2. **Realistic Timeline**: Gantt chart provides achievable milestones
3. **Risk-aware Planning**: Network diagram identifies critical path dependencies
4. **Tool Selection**: GanttProject and COCOMO II provide reliable planning foundations

### 11.3 Recommendations

1. **Adopt Agile Practices**: Weekly sprints with regular demos ensure continuous progress
2. **Prioritize MVP Features**: Focus on core modules (Auth, Courses, Payments) first
3. **Automate Testing**: Implement CI/CD early to maintain code quality
4. **Document Continuously**: Maintain API docs and code comments throughout development

---

## 12. References

[1] Grand View Research. (2024). "Education Technology Market Size, Share & Trends Analysis Report." Retrieved from https://www.grandviewresearch.com/industry-analysis/education-technology-market

[2] Boehm, B., et al. (2000). "Software Cost Estimation with COCOMO II." Prentice Hall.

[3] GanttProject. (2024). "Free Project Scheduling and Management App." Retrieved from https://www.ganttproject.biz/

[4] Project Management Institute. (2021). "A Guide to the Project Management Body of Knowledge (PMBOK Guide)." 7th Edition.

[5] Pressman, R. S., & Maxim, B. R. (2020). "Software Engineering: A Practitioner's Approach." 9th Edition. McGraw-Hill.

[6] Amir, A. F., & Borhan, R. (2022). "Students' perception and preference towards open and distance learning (ODL) during COVID-19 pandemic." Malaysian Journal of Sustainable Environment, 9(1), 285.

---

**Document Prepared By:**  
Edutech Platform Development Team  
SSE3310 Software Project Management  
Semester 1, 2025/2026
