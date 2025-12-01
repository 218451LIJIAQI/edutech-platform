# SSE3310 SOFTWARE PROJECT MANAGEMENT

## Assignment 2: Risk Management

---

**FACULTY OF SCIENCE COMPUTER AND TECHNOLOGY AND INFORMATION**  
**DEPARTMENT OF SOFTWARE ENGINEERING AND INFORMATION TECHNOLOGY**

---

### PREPARED BY

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

1. [Introduction](#1-introduction)
2. [Risk Management Tool Selection](#2-risk-management-tool-selection)
3. [Risk Identification](#3-risk-identification)
4. [Risk Analysis](#4-risk-analysis)
5. [Risk Prioritization Matrix](#5-risk-prioritization-matrix)
6. [Risk Response Planning](#6-risk-response-planning)
7. [Risk Monitoring and Control](#7-risk-monitoring-and-control)
8. [Conclusions](#8-conclusions)
9. [References](#9-references)

---

## 1. Introduction

### 1.1 Purpose

This document presents the Risk Management Plan for the Edutech Platform project. It identifies potential risks that could affect the project's success, analyzes their probability and impact, and outlines response strategies to mitigate or avoid these risks.

### 1.2 Project Context

The Edutech Platform is a comprehensive online education marketplace connecting verified teachers with students. The project involves:

- **Duration**: 12 weeks (1 semester)
- **Team Size**: 6 members
- **Technology Stack**: React, Node.js, PostgreSQL, Socket.io, Stripe
- **Key Modules**: User Management, Course Management, Payment System, Real-time Messaging, Community Features

### 1.3 Risk Management Approach

Our risk management follows the PMI (Project Management Institute) framework:

1. **Risk Identification** - Identify potential risks
2. **Risk Analysis** - Assess probability and impact
3. **Risk Prioritization** - Rank risks by severity
4. **Risk Response Planning** - Develop mitigation strategies
5. **Risk Monitoring** - Track risks throughout the project

---

## 2. Risk Management Tool Selection

### 2.1 Selected Tool: RiskWatch (Free Tier) / Microsoft Excel Risk Matrix

For this academic project, we use a combination of:

1. **Microsoft Excel / Google Sheets** - For Risk Register and Matrix
2. **Risk Matrix Template** - Standard 5x5 probability-impact matrix
3. **Trello / GitHub Issues** - For tracking risk mitigation tasks

### 2.2 Tool Justification

| Criteria | Excel/Sheets | Dedicated Risk Tool |
|----------|--------------|---------------------|
| Cost | Free | Paid (mostly) |
| Learning Curve | Low | Medium-High |
| Customization | High | Limited |
| Team Accessibility | Easy | Requires licenses |
| Academic Suitability | Excellent | Overkill |

**Decision**: Excel/Google Sheets with standardized templates provides sufficient functionality for our academic project while being accessible to all team members.

### 2.3 Risk Assessment Scales

#### Probability Scale

| Level | Rating | Description | Percentage |
|-------|--------|-------------|------------|
| 1 | Very Low | Unlikely to occur | 0-10% |
| 2 | Low | Could occur occasionally | 11-30% |
| 3 | Medium | Likely to occur | 31-50% |
| 4 | High | Very likely to occur | 51-70% |
| 5 | Very High | Almost certain | 71-100% |

#### Impact Scale

| Level | Rating | Schedule Impact | Cost Impact | Quality Impact |
|-------|--------|-----------------|-------------|----------------|
| 1 | Negligible | < 1 day delay | < 1% budget | Minor defects |
| 2 | Minor | 1-3 days delay | 1-5% budget | Some rework |
| 3 | Moderate | 1-2 weeks delay | 5-10% budget | Major rework |
| 4 | Major | 2-4 weeks delay | 10-20% budget | Feature removal |
| 5 | Catastrophic | > 1 month delay | > 20% budget | Project failure |

---

## 3. Risk Identification

### 3.1 Risk Categories

We identified risks across six categories:

1. **Technical Risks** - Technology, architecture, integration
2. **Schedule Risks** - Timeline, milestones, dependencies
3. **Resource Risks** - Team, skills, availability
4. **External Risks** - Third-party services, APIs
5. **Scope Risks** - Requirements changes, feature creep
6. **Quality Risks** - Testing, performance, security

### 3.2 Risk Register

| Risk ID | Category | Risk Description | Risk Owner |
|---------|----------|------------------|------------|
| R01 | Technical | Stripe API integration complexity | Kyle |
| R02 | Technical | Socket.io real-time performance issues | Li Jia Qi |
| R03 | Technical | PostgreSQL database scalability | Ewing |
| R04 | Technical | JWT authentication security vulnerabilities | Lee |
| R05 | Technical | File upload storage limitations | Low |
| R06 | Schedule | Delayed backend API completion | Ngooi |
| R07 | Schedule | Frontend-backend integration delays | Kyle |
| R08 | Schedule | Testing phase time underestimation | Li Jia Qi |
| R09 | Resource | Team member unavailability (illness/emergency) | Ewing |
| R10 | Resource | Skill gaps in specific technologies | Lee |
| R11 | Resource | Conflicting academic workload | Low |
| R12 | External | Stripe API changes or downtime | Ngooi |
| R13 | External | PostgreSQL hosting service issues | Kyle |
| R14 | Scope | Requirements changes from stakeholders | Li Jia Qi |
| R15 | Scope | Feature creep adding unnecessary complexity | Ewing |
| R16 | Quality | Insufficient test coverage | Lee |
| R17 | Quality | Security vulnerabilities in authentication | Low |
| R18 | Quality | Performance issues under load | Ngooi |

---

## 4. Risk Analysis

### 4.1 Detailed Risk Assessment

#### R01: Stripe API Integration Complexity

| Attribute | Assessment |
|-----------|------------|
| **Description** | Stripe payment integration may be complex with webhooks, error handling, and edge cases |
| **Probability** | 3 (Medium - 40%) |
| **Impact** | 4 (Major) |
| **Risk Score** | 12 (High) |
| **Indicators** | Delayed payment testing, webhook failures, incomplete error handling |

#### R02: Socket.io Real-time Performance Issues

| Attribute | Assessment |
|-----------|------------|
| **Description** | Real-time messaging may experience latency or connection stability issues |
| **Probability** | 3 (Medium - 45%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 9 (Medium) |
| **Indicators** | Message delays > 500ms, frequent disconnections, memory leaks |

#### R03: PostgreSQL Database Scalability

| Attribute | Assessment |
|-----------|------------|
| **Description** | Database queries may become slow with increased data volume |
| **Probability** | 2 (Low - 25%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 6 (Medium) |
| **Indicators** | Query response time > 1s, database lock issues |

#### R04: JWT Authentication Security Vulnerabilities

| Attribute | Assessment |
|-----------|------------|
| **Description** | Security flaws in JWT implementation could expose user data |
| **Probability** | 2 (Low - 20%) |
| **Impact** | 5 (Catastrophic) |
| **Risk Score** | 10 (High) |
| **Indicators** | Security audit failures, token manipulation |

#### R05: File Upload Storage Limitations

| Attribute | Assessment |
|-----------|------------|
| **Description** | Local storage may run out, or file management becomes complex |
| **Probability** | 3 (Medium - 35%) |
| **Impact** | 2 (Minor) |
| **Risk Score** | 6 (Medium) |
| **Indicators** | Disk space warnings, upload failures |

#### R06: Delayed Backend API Completion

| Attribute | Assessment |
|-----------|------------|
| **Description** | Backend APIs may not be ready for frontend integration on schedule |
| **Probability** | 4 (High - 60%) |
| **Impact** | 4 (Major) |
| **Risk Score** | 16 (Critical) |
| **Indicators** | Missed sprint deliverables, blocked frontend tasks |

#### R07: Frontend-Backend Integration Delays

| Attribute | Assessment |
|-----------|------------|
| **Description** | API contract mismatches causing integration rework |
| **Probability** | 3 (Medium - 50%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 9 (Medium) |
| **Indicators** | Type errors, missing endpoints, response format issues |

#### R08: Testing Phase Time Underestimation

| Attribute | Assessment |
|-----------|------------|
| **Description** | Insufficient time allocated for thorough testing |
| **Probability** | 4 (High - 55%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 12 (High) |
| **Indicators** | Rushed testing, increasing bug count post-release |

#### R09: Team Member Unavailability

| Attribute | Assessment |
|-----------|------------|
| **Description** | Team member illness or emergency causing work stoppage |
| **Probability** | 2 (Low - 25%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 6 (Medium) |
| **Indicators** | Unplanned absences, missed daily standups |

#### R10: Skill Gaps in Specific Technologies

| Attribute | Assessment |
|-----------|------------|
| **Description** | Team lacks experience in some required technologies |
| **Probability** | 3 (Medium - 40%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 9 (Medium) |
| **Indicators** | Frequent questions, slow progress on specific modules |

#### R11: Conflicting Academic Workload

| Attribute | Assessment |
|-----------|------------|
| **Description** | Other courses' deadlines affecting project commitment |
| **Probability** | 4 (High - 65%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 12 (High) |
| **Indicators** | Reduced velocity during exam periods |

#### R12: Stripe API Changes or Downtime

| Attribute | Assessment |
|-----------|------------|
| **Description** | Stripe service issues affecting payment functionality |
| **Probability** | 1 (Very Low - 10%) |
| **Impact** | 4 (Major) |
| **Risk Score** | 4 (Low) |
| **Indicators** | API deprecation notices, service status alerts |

#### R13: PostgreSQL Hosting Service Issues

| Attribute | Assessment |
|-----------|------------|
| **Description** | Database hosting downtime or data loss |
| **Probability** | 1 (Very Low - 5%) |
| **Impact** | 5 (Catastrophic) |
| **Risk Score** | 5 (Low) |
| **Indicators** | Connection failures, backup issues |

#### R14: Requirements Changes from Stakeholders

| Attribute | Assessment |
|-----------|------------|
| **Description** | Supervisor or team requests significant changes mid-project |
| **Probability** | 3 (Medium - 35%) |
| **Impact** | 4 (Major) |
| **Risk Score** | 12 (High) |
| **Indicators** | New feature requests, changed priorities |

#### R15: Feature Creep Adding Complexity

| Attribute | Assessment |
|-----------|------------|
| **Description** | Team adds features beyond original scope |
| **Probability** | 4 (High - 55%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 12 (High) |
| **Indicators** | Expanding backlog, "nice-to-have" features in sprints |

#### R16: Insufficient Test Coverage

| Attribute | Assessment |
|-----------|------------|
| **Description** | Critical paths not adequately tested |
| **Probability** | 3 (Medium - 45%) |
| **Impact** | 4 (Major) |
| **Risk Score** | 12 (High) |
| **Indicators** | Coverage < 60%, production bugs |

#### R17: Security Vulnerabilities in Authentication

| Attribute | Assessment |
|-----------|------------|
| **Description** | XSS, CSRF, or injection vulnerabilities |
| **Probability** | 2 (Low - 25%) |
| **Impact** | 5 (Catastrophic) |
| **Risk Score** | 10 (High) |
| **Indicators** | Failed security scans, OWASP issues |

#### R18: Performance Issues Under Load

| Attribute | Assessment |
|-----------|------------|
| **Description** | System becomes slow with concurrent users |
| **Probability** | 3 (Medium - 40%) |
| **Impact** | 3 (Moderate) |
| **Risk Score** | 9 (Medium) |
| **Indicators** | Response time > 3s, timeout errors |

---

## 5. Risk Prioritization Matrix

### 5.1 Risk Heat Map

```
                           IMPACT
           │ Negligible │  Minor   │ Moderate │  Major   │Catastrophic│
           │     (1)    │   (2)    │    (3)   │   (4)    │    (5)     │
    ───────┼────────────┼──────────┼──────────┼──────────┼────────────│
    Very   │            │          │          │          │            │
    High   │            │          │          │          │            │
    (5)    │            │          │          │          │            │
    ───────┼────────────┼──────────┼──────────┼──────────┼────────────│
    High   │            │          │ R08,R11  │   R06    │            │
    (4)    │            │          │   R15    │          │            │
    ───────┼────────────┼──────────┼──────────┼──────────┼────────────│
    Medium │            │   R05    │ R02,R07  │ R01,R14  │            │
    (3)    │            │          │ R10,R18  │   R16    │            │
    ───────┼────────────┼──────────┼──────────┼──────────┼────────────│
    Low    │            │          │   R03    │   R12    │  R04,R17   │
    (2)    │            │          │   R09    │          │            │
    ───────┼────────────┼──────────┼──────────┼──────────┼────────────│
    Very   │            │          │          │          │    R13     │
    Low    │            │          │          │          │            │
    (1)    │            │          │          │          │            │
```

### 5.2 Risk Priority Ranking

| Priority | Risk ID | Risk Description | Score | Status |
|----------|---------|------------------|-------|--------|
| 1 | R06 | Delayed Backend API Completion | 16 | Critical |
| 2 | R01 | Stripe API Integration Complexity | 12 | High |
| 3 | R08 | Testing Phase Time Underestimation | 12 | High |
| 4 | R11 | Conflicting Academic Workload | 12 | High |
| 5 | R14 | Requirements Changes | 12 | High |
| 6 | R15 | Feature Creep | 12 | High |
| 7 | R16 | Insufficient Test Coverage | 12 | High |
| 8 | R04 | JWT Security Vulnerabilities | 10 | High |
| 9 | R17 | Security Vulnerabilities | 10 | High |
| 10 | R02 | Socket.io Performance | 9 | Medium |
| 11 | R07 | Integration Delays | 9 | Medium |
| 12 | R10 | Skill Gaps | 9 | Medium |
| 13 | R18 | Performance Under Load | 9 | Medium |
| 14 | R03 | Database Scalability | 6 | Medium |
| 15 | R05 | File Upload Limitations | 6 | Medium |
| 16 | R09 | Team Unavailability | 6 | Medium |
| 17 | R13 | Database Hosting Issues | 5 | Low |
| 18 | R12 | Stripe API Changes | 4 | Low |

### 5.3 Risk Categories Summary

| Category | Risk Score | Priority Actions |
|----------|-----------|------------------|
| **Legend:** | | |
| Critical (15-25) | 1 risk | Immediate action required |
| High (10-14) | 8 risks | Mitigation plans essential |
| Medium (5-9) | 7 risks | Monitor closely |
| Low (1-4) | 2 risks | Accept with monitoring |

---

## 6. Risk Response Planning

### 6.1 Response Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Avoid** | Eliminate the risk entirely | High probability, high impact |
| **Mitigate** | Reduce probability or impact | Medium-high risks |
| **Transfer** | Shift risk to third party | External dependencies |
| **Accept** | Acknowledge without action | Low probability/impact |

### 6.2 Risk Response Plan

#### Critical Risks (Score 15-25)

**R06: Delayed Backend API Completion**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Mitigate |
| **Actions** | 1. Implement API-first design with OpenAPI specs<br>2. Create mock APIs for frontend development<br>3. Daily integration sync meetings<br>4. Parallel development of frontend/backend |
| **Owner** | Ngooi XY |
| **Timeline** | Throughout development |
| **Success Criteria** | All critical APIs ready 1 week before integration |
| **Cost** | 4 hours/week coordination time |

#### High Priority Risks (Score 10-14)

**R01: Stripe API Integration Complexity**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Mitigate + Transfer |
| **Actions** | 1. Use Stripe's pre-built Checkout UI<br>2. Implement comprehensive webhook handling<br>3. Test with Stripe test mode extensively<br>4. Document all Stripe integration patterns |
| **Owner** | Kyle JB |
| **Timeline** | Week 7-8 |
| **Success Criteria** | All payment flows tested successfully |
| **Contingency** | Fall back to simplified payment flow if complex scenarios fail |

**R08: Testing Phase Time Underestimation**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Avoid + Mitigate |
| **Actions** | 1. Start testing from Sprint 1 (TDD approach)<br>2. Allocate 20% of each sprint to testing<br>3. Automated testing pipeline with Jest<br>4. Define minimum coverage threshold (70%) |
| **Owner** | Li JQ |
| **Timeline** | Throughout project |
| **Success Criteria** | 70% code coverage, zero critical bugs at release |

**R11: Conflicting Academic Workload**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Mitigate + Accept |
| **Actions** | 1. Front-load work before exam periods<br>2. Cross-train team on critical modules<br>3. Build buffer time into schedule<br>4. Identify overlapping deadlines early |
| **Owner** | Low JQ |
| **Timeline** | Pre-project planning |
| **Success Criteria** | No major delays during exam weeks |

**R14: Requirements Changes from Stakeholders**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Mitigate + Accept |
| **Actions** | 1. Freeze requirements after Week 2<br>2. Document change request process<br>3. Evaluate impact before accepting changes<br>4. Maintain requirements traceability |
| **Owner** | Li JQ |
| **Timeline** | Week 1-2 |
| **Success Criteria** | <10% scope change after freeze |

**R15: Feature Creep Adding Complexity**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Avoid |
| **Actions** | 1. Define MVP scope clearly<br>2. Use MoSCoW prioritization<br>3. Require team vote for new features<br>4. Defer non-essential features to backlog |
| **Owner** | Ewing HG |
| **Timeline** | Sprint planning meetings |
| **Success Criteria** | MVP delivered on time |

**R16: Insufficient Test Coverage**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Mitigate |
| **Actions** | 1. Enforce code review with test requirements<br>2. Set up coverage gates in CI<br>3. Prioritize testing of critical paths<br>4. Weekly test coverage reports |
| **Owner** | Lee YH |
| **Timeline** | Throughout development |
| **Success Criteria** | 70% coverage, 100% critical path coverage |

**R04 & R17: Security Vulnerabilities**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Mitigate |
| **Actions** | 1. Use established auth libraries (jsonwebtoken, bcrypt)<br>2. Implement helmet, CORS, rate limiting<br>3. Input validation and sanitization<br>4. Security checklist review before deployment |
| **Owner** | Lee YH, Low JQ |
| **Timeline** | Week 3, Week 11 |
| **Success Criteria** | Pass OWASP top 10 checklist |

#### Medium Priority Risks (Score 5-9)

**R02, R07, R10, R18: Technical & Integration Risks**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Mitigate + Accept |
| **Actions** | 1. Early prototypes for risky components<br>2. API contract documentation<br>3. Knowledge sharing sessions<br>4. Performance testing benchmarks |
| **Owner** | Various |
| **Success Criteria** | Issues identified and resolved early |

#### Low Priority Risks (Score 1-4)

**R12, R13: External Service Risks**

| Response Element | Details |
|------------------|---------|
| **Strategy** | Accept + Monitor |
| **Actions** | 1. Monitor service status pages<br>2. Implement error handling and fallbacks<br>3. Regular database backups |
| **Owner** | Kyle JB, Ngooi XY |
| **Success Criteria** | Graceful degradation when services fail |

---

## 7. Risk Monitoring and Control

### 7.1 Risk Review Schedule

| Activity | Frequency | Participants | Duration |
|----------|-----------|--------------|----------|
| Daily Risk Check | Daily standup | All team | 5 min |
| Risk Register Update | Weekly | Risk owners | 30 min |
| Risk Review Meeting | Bi-weekly | All team | 1 hour |
| Risk Audit | End of sprint | Team lead | 2 hours |

### 7.2 Risk Indicators and Triggers

| Risk ID | Key Risk Indicator (KRI) | Trigger Threshold | Action |
|---------|-------------------------|-------------------|--------|
| R06 | API completion rate | <80% by Week 6 | Escalate, add resources |
| R01 | Payment test success | <90% pass rate | Seek external help |
| R08 | Test coverage % | <50% by Week 10 | Testing sprint |
| R11 | Sprint velocity | <60% during exams | Scope reduction |
| R16 | Bug count | >20 critical bugs | Code freeze |

### 7.3 Risk Status Tracking Template

| Date | Risk ID | Previous Score | Current Score | Status | Notes |
|------|---------|----------------|---------------|--------|-------|
| Week 1 | R06 | 16 | 16 | Open | API specs in progress |
| Week 2 | R06 | 16 | 12 | Reduced | Mock APIs ready |
| Week 3 | R06 | 12 | 8 | Reduced | 50% APIs complete |
| ... | ... | ... | ... | ... | ... |

### 7.4 Escalation Procedure

```
Level 1: Risk Owner
├── Monitor daily
├── Implement mitigation
└── Report weekly

Level 2: Team Lead
├── Review weekly
├── Reallocate resources
└── Adjust scope if needed

Level 3: Project Supervisor
├── Escalate if risk score increases
├── Request deadline extension
└── Major scope decisions
```

---

## 8. Conclusions

### 8.1 Summary of Findings

The risk management analysis for the Edutech Platform project identified:

- **18 total risks** across 6 categories
- **1 critical risk** (R06: Delayed Backend API Completion)
- **8 high priority risks** requiring active mitigation
- **7 medium priority risks** for monitoring
- **2 low priority risks** accepted with monitoring

### 8.2 Key Risk Areas

| Area | Count | Primary Concern |
|------|-------|-----------------|
| Technical | 5 | Integration complexity |
| Schedule | 3 | Timeline pressure |
| Resource | 3 | Academic workload conflicts |
| Quality | 3 | Test coverage |
| Scope | 2 | Feature creep |
| External | 2 | Third-party dependencies |

### 8.3 Recommendations

1. **Prioritize API Development**: The critical risk (R06) requires immediate attention with API-first development and mock services.

2. **Implement Continuous Testing**: Start testing early to avoid the compressed testing phase (R08, R16).

3. **Manage Scope Strictly**: Use MoSCoW prioritization to prevent feature creep (R15).

4. **Plan for Academic Conflicts**: Build buffers around exam periods (R11).

5. **Security First**: Address authentication and security vulnerabilities early (R04, R17).

### 8.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Critical risks resolved | 100% | End of Week 8 |
| High risks mitigated | 80% | End of Week 10 |
| Risk review compliance | 100% | Weekly checks |
| Contingency triggers | <3 | Throughout project |

---

## 9. References

[1] Project Management Institute. (2021). "A Guide to the Project Management Body of Knowledge (PMBOK Guide)." 7th Edition. PMI.

[2] Pressman, R. S., & Maxim, B. R. (2020). "Software Engineering: A Practitioner's Approach." 9th Edition. McGraw-Hill.

[3] Boehm, B. (1991). "Software Risk Management: Principles and Practices." IEEE Software, 8(1), 32-41.

[4] Charette, R. N. (1989). "Software Engineering Risk Analysis and Management." McGraw-Hill.

[5] OWASP Foundation. (2021). "OWASP Top Ten Web Application Security Risks." Retrieved from https://owasp.org/Top10/

---

**Document Prepared By:**  
Edutech Platform Development Team  
SSE3310 Software Project Management  
Semester 1, 2025/2026
