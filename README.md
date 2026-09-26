# 🥗 NutriPlan
### Enterprise Nutrition & Meal Planning Platform
*(ระบบจัดการโภชนาการและวางแผนมื้ออาหารระดับองค์กร)*

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![.NET 8](https://img.shields.io/badge/.NET_8-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

<br/>

[🌐 เข้าสู่ระบบจริง (Live Frontend)](https://nutri-plan-chi-two.vercel.app) • [⚙️ API Endpoint (Render)](https://nutriplan-b3i6.onrender.com/api/v1/food-items) • [📂 GitHub Repository](https://github.com/6731470008-web/NutriPlan)

<br/>

**[ 🇹🇭 ภาษาไทย ](#-ภาษาไทย)** | **[ 🇬🇧 English ](#-english)**

---

</div>

<br/>

# 🇹🇭 ภาษาไทย

## 📌 บทนำและวัตถุประสงค์ของระบบ

**NutriPlan** คือแพลตฟอร์มจัดการโภชนาการและวางแผนมื้ออาหารแบบครบวงจร ออกแบบมาเพื่อยกระดับการดูแลสุขภาพส่วนบุคคลและการทำงานของนักโภชนาการมืออาชีพ ระบบช่วยแก้ปัญหาความซับซ้อนในการคำนวณพลังงาน สารอาหารหลัก (Macronutrients) การจัดรายการอาหารที่สอดคล้องกับข้อจำกัดด้านสุขภาพ การติดตามความต่อเนื่องในการรับประทานอาหารของผู้ใช้ และการนำ **ปัญญาประดิษฐ์ (AI Computer Vision)** มาช่วยประเมินสารอาหารจากภาพถ่ายมื้ออาหารจริง

โปรเจกต์นี้ได้รับการพัฒนาภายใต้สถาปัตยกรรม **Clean Architecture (Onion Architecture)** ร่วมกับหลักการ **SOLID Principles** และ **Domain-Driven Design (DDD)** โดยมีการนำเสนอการประยุกต์ใช้ **Object-Oriented Design (OOD)** และ **Design Patterns** ระดับสูง เพื่อให้โค้ดมีความยืดหยุ่น รองรับการขยายตัว (Scalability) และมีประสิทธิภาพสูง

---

## 🌐 ลิงก์ระบบออนไลน์ (Live Deployments)

* **Frontend Application (Vercel):** [https://nutri-plan-chi-two.vercel.app](https://nutri-plan-chi-two.vercel.app)
* **Backend RESTful API (Render):** `https://nutriplan-b3i6.onrender.com/api/v1`
* **Cloud Database (Neon PostgreSQL):** Serverless PostgreSQL 16 (AWS Singapore Data Center)

---

## 🔑 ข้อมูลบัญชีสำหรับทดสอบระบบ (Demo Accounts)

สามารถใช้บัญชีที่เตรียมไว้ในระบบเพื่อทดสอบการทำงานในแต่ละ Role ได้ทันที:

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์และความสามารถหลัก |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@admin.com` | `00000000` | จัดการผู้ใช้ทั้งหมด, ดูแลฐานข้อมูลอาหาร, ควบคุมระบบส่วนกลาง |
| **Nutritionist** | `nutritionist@test.com` | `00000000` | จัดทำแผนอาหารให้ลูกค้า, จัดการวัตถุดิบ, ตรวจสอบผลการปฏิบัติตามแผน |
| **Client** | `client@test.com` | `00000000` | ดูแผนอาหาร, บันทึกการกิน, สแกนอาหารด้วย AI, เพิ่มเมนูอาหารเอง |

---

## ✨ ฟีเจอร์และความสามารถหลักของระบบในปัจจุบัน

### 📸 1. ระบบวิเคราะห์และสแกนอาหารด้วย AI (Google Gemini Vision AI Engine)
* **สแกนและตรวจจำแนกอาหารจากภาพถ่าย:** ถ่ายรูปหรืออัปโหลดรูปภาพอาหาร/เครื่องดื่มจากโทรศัพท์มือถือหรือคอมพิวเตอร์
* **ตรวจจับเมนูอาหารเฉพาะทางและเมนูไทยได้อย่างแม่นยำ:** จำแนกเมนูอาหารจานเดียวของไทย รวมถึงเครื่องดื่มสุขภาพ เช่น **อกไก่ปั่น**, **อกไก่ปั่นสมูทตี้**, **เวย์โปรตีนเชค**, **สเต๊ก**, **ต้มยำ** ฯลฯ
* **คำนวณสารอาหารและแจกแจงส่วนประกอบ:** แสดงชื่อเมนู, ปริมาณแคลอรีรวม, โปรตีน, คาร์โบไฮเดรต, ไขมัน และแจกแจงส่วนประกอบย่อยในจาน (Breakdown Items) พร้อมค่าน้ำหนักโดยประมาณและระดับความเชื่อมั่น (Confidence Score)
* **ระบบเชื่อมโยงเบื้องหลังอัตโนมัติ (Zero Configuration):** ผูกระบบเข้ากับ **Google Gemini 3.5 Flash Lite** และ **3.8 Flash** โดยตรง ผู้ใช้งานไม่ต้องกรอก API Key เองหน้าเว็บ
* **Smart Auto-Fill to Meal Plan:** นำผลลัพธ์จากการสแกนไปกรอกเป็นรายการอาหารในแผนโภชนาการได้ทันทีในคลิกเดียว

### 📋 2. ระบบจัดทำและจัดการแผนอาหาร (Dynamic Meal Plan Builder & Client Self-Management)
* **การวางแผนหลายวัน (Multi-Day Meal Plans):** กำหนดเมนูอาหารและเป้าหมายสารอาหารสำหรับแต่ละมื้อ (เช้า, ว่างเช้า, กลางวัน, ว่างบ่าย, เย็น)
* **ลูกค้าสามารถเพิ่ม/ปรับปรุงเมนูอาหารในแผนได้เอง (Client Meal Addition):** แก้ไขข้อจำกัดเดิมที่ให้เฉพาะนักโภชนาการเพิ่มเมนูได้ โดยปัจจุบันลูกค้าสามารถเพิ่มรายการอาหาร หรือใช้กล้อง AI สแกนอาหารเพิ่มเข้าในแต่ละวันได้โดยตรง
* **ระบบตรวจจับสารก่อภูมิแพ้อัจฉริยะ (Smart Allergen Detection):** ตรวจสอบวัตถุดิบเทียบกับประวัติการแพ้อาหารของลูกค้า และแจ้งเตือนทันทีหากพบส่วนผสมอันตราย

### 📱 3. รองรับการปรับสเกลหน้าจอตามอุปกรณ์อัตโนมัติ (Fully Responsive & Mobile Viewport Scaling)
* ออกแบบและปรับแต่งโครงสร้าง CSS ให้รองรับหน้าจอทุกขนาด ตั้งแต่มือถือสมาร์ตโฟน แท็บเล็ต ไปจนถึงเดสก์ท็อป
* แก้ไขปัญหาเนื้อหาหลุดจอ (Mobile Overflow) ด้วย Next.js Viewport Configuration (`width: device-width`, `initialScale: 1`) และ Tailwind CSS v4 Responsive Breakpoints
* รองรับ Touch Gesture และเปิดกล้องถ่ายภาพบนโทรศัพท์มือถือได้โดยตรง

### 🌐 4. ระบบรองรับ 2 ภาษา (Bilingual Support: TH / EN)
* สามารถสลับภาษาระหว่าง **ภาษาไทย** และ **English** ได้แบบ Real-time ตลอดการใช้งานผ่าน `LanguageContext`

### 🧮 5. เครื่องมือคำนวณโภชนาการตามหลักวิทยาศาสตร์ (BMR & TDEE Engine)
* คำนวณอัตราการเผาผลาญพื้นฐาน (BMR) และพลังงานที่ใช้ต่อวัน (TDEE) ด้วยสูตร **Mifflin-St Jeor** และ **Harris-Benedict**
* ปรับแต่งเป้าหมายพลังงานอัตโนมัติ (Calorie Target) ตามวัตถุประสงค์ (ลดน้ำหนัก / คงน้ำหนัก / เพิ่มมวลกล้ามเนื้อ)

### 🛍️ 6. ระบบสรุปและส่งออกรายการวัตถุดิบ (Automated Shopping List Aggregator)
* คำนวณรวมปริมาณวัตถุดิบที่ต้องใช้จากแผนอาหารทั้งหมดโดยอัตโนมัติ
* ส่งออกเอกสารได้หลายรูปแบบ (PDF / Text) ผ่านการประยุกต์ใช้ **Factory Method Pattern**

### 📊 7. ระบบติดตามและวิเคราะห์พฤติกรรม (Adherence Tracking & Analytics)
* บันทึกปริมาณอาหารที่รับประทานจริงเปรียบเทียบกับแผนงาน
* ประเมินและคำนวณคะแนนความต่อเนื่อง (% Adherence Score) พร้อมรายงานผลการปฏิบัติตนตามแผนอาหาร

---

## 🏗️ ผังแสดงสถาปัตยกรรมระบบ (System Architecture)

```mermaid
graph TD
    User([📱 ผู้ใช้งาน / Client / Nutritionist])
    
    subgraph "Vercel Edge Platform (Frontend Tier)"
        NextJS["⚡ Next.js 16 App Router<br/>(React 19 + TypeScript + TailwindCSS v4)"]
        ScannerModal["📸 AI Food Scanner Modal<br/>(Gemini Vision Engine)"]
        Axios["Client API Layer (Axios Interceptors)"]
    end

    subgraph "AI Services (Google Cloud)"
        Gemini["🤖 Google Gemini Vision API<br/>(gemini-3.5-flash-lite / 3.8-flash)"]
    end
    
    subgraph "Render Cloud Container (Backend Tier)"
        NETCore[".NET 8 Web API<br/>(Clean Architecture & Controllers)"]
        Domain["Core Domain Layer<br/>(Entities, Value Objects, Enums)"]
        AppLayer["Application Use Cases<br/>(Services, DTOs, Interfaces)"]
        Infra["Infrastructure Layer<br/>(EF Core 8 + Gemini Service)"]
    end
    
    subgraph "Neon Cloud Persistence (Database Tier)"
        Postgres[(🐘 Serverless PostgreSQL 16<br/>AWS Singapore Data Center)]
    end

    User -->|HTTPS Request| NextJS
    NextJS --> ScannerModal
    ScannerModal -.->|Image Analysis| Gemini
    NextJS --> Axios
    Axios -->|REST API / JWT| NETCore
    NETCore --> AppLayer
    AppLayer --> Domain
    AppLayer --> Infra
    Infra -.->|Server-side Food Vision| Gemini
    Infra -->|Encrypted SSL Connection| Postgres
```

---

## 📐 การออกแบบเชิงวัตถุและสถาปัตยกรรมซอฟต์แวร์ (OOD & Architecture)

### 1. โครงสร้าง Clean Architecture (4-Tier Layering)
* **`NutriPlan.Domain`:** ชั้นในสุดที่เป็นศูนย์กลางของ Business Logic ประกอบด้วย Core Entities (`User`, `Client`, `Nutritionist`, `MealPlan`, `DailyMenu`, `FoodItem`, `MealLog`), Value Objects (`NutrientProfile`) และ Enums โดยไม่มี Dependency ต่อ Library ภายนอก
* **`NutriPlan.Application`:** รวม Use Cases ของระบบ, Data Transfer Objects (DTOs) และ Interfaces ของ Service (`IMealPlanService`, `IAuthService`, `IFoodRecognitionService`)
* **`NutriPlan.Infrastructure`:** การจัดการข้อมูลผ่าน Entity Framework Core 8, Repository Pattern, Database Migrations, บริการ Gemini AI (`GeminiFoodRecognitionService`) และระบบรักษาความปลอดภัย
* **`NutriPlan.Api`:** RESTful Controllers, Middleware จัดการ Exception และการลงทะเบียน Dependency Injection (DI)

### 2. Design Patterns ที่นำมาประยุกต์ใช้ในระบบ
* **Repository & Unit of Work Pattern:** แยกส่วนประสานข้อมูล (Data Access) ออกจาก Business Logic ช่วยให้โค้ดสามารถทำการ Unit Test ได้อย่างอิสระ
* **Factory Method Pattern:** ออกแบบ `ShoppingListFactory` สำหรับสร้างวัตถุในการส่งออกข้อมูล Shopping List เป็นรูปแบบเอกสารที่หลากหลาย (PDF / Text)
* **Value Object Pattern:** สร้าง `NutrientProfile` เป็นแบบ Immutable เพื่อเก็บและคำนวณค่าสารอาหารอย่างถูกต้องปลอดภัยจากการแก้ไขโดยไม่ได้รับอนุญาต
* **Dependency Inversion Principle (DIP):** การออกแบบให้ทุก Component ขึ้นอยู่กับ Abstraction (Interfaces) ทำการ Inject ผ่าน IoC Container ของ .NET 8

---

## 🛠️ เทคโนโลยีที่เลือกใช้ (Technology Stack)

| ส่วนประกอบ (Component) | เทคโนโลยีหลัก (Tech Stack) | รายละเอียด |
| :--- | :--- | :--- |
| **Frontend UI Framework** | **Next.js 16 (React 19)** | App Router, TypeScript 5, Tailwind CSS v4, Lucide Icons |
| **Backend API Engine** | **.NET 8 (ASP.NET Core)** | C#, Clean Architecture, Entity Framework Core 8 |
| **AI Computer Vision** | **Google Gemini Vision API** | `gemini-3.5-flash-lite`, `gemini-3.8-flash` |
| **Database System** | **PostgreSQL 16** | Serverless Architecture บน Neon Cloud (AWS Singapore) |
| **Authentication & Security** | **JWT Bearer Token** | Role-Based Access Control (RBAC), BCrypt Password Hashing |
| **Deployment & Hosting** | **Vercel & Render** | Frontend บน Vercel Edge Network / Backend Docker บน Render |

---

## 💻 คู่มือการติดตั้งและเปิดใช้งานในเครื่อง (Local Setup)

### ข้อกำหนดเบื้องต้น (Prerequisites)
* [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* [Node.js 20+ และ npm](https://nodejs.org/)

### 1. ดาวน์โหลดซอร์สโค้ด (Clone Repository)
```bash
git clone https://github.com/6731470008-web/NutriPlan.git
cd NutriPlan
```

### 2. การติดตั้งและรันระบบ Backend (.NET API)
```bash
cd backend

# สั่ง Restore Package Dependencies
dotnet restore

# รัน EF Core Migration เพื่อสร้างโครงสร้างตาราง
dotnet ef database update --project src/Infrastructure/NutriPlan.Infrastructure --startup-project src/Infrastructure/NutriPlan.Api

# สั่งรัน Backend Server
dotnet run --project src/Infrastructure/NutriPlan.Api
```
*Backend API จะพร้อมใช้งานที่: `http://localhost:5128`*

### 3. การติดตั้งและรันระบบ Frontend (Next.js)
```bash
cd ../frontend

# ติดตั้ง Node Modules
npm install

# รัน Development Server
npm run dev
```
*เปิดใช้งานหน้าเว็บได้ที่: `http://localhost:3000` (หรือ `http://localhost:3001`)*

---

<br/>
<br/>

# 🇬🇧 English

## 📌 System Overview & Vision

**NutriPlan** is an enterprise-grade nutrition management platform designed to revolutionize personal health tracking and professional dietetic planning. The platform solves the underlying complexity of caloric calculations, macronutrient balancing, health-specific dietary constraint management, client adherence tracking, and the integration of **AI Computer Vision** for instant food macro recognition from photos.

Architected using **Clean Architecture (Onion Architecture)**, **Domain-Driven Design (DDD)**, and **SOLID Principles**, NutriPlan showcases advanced **Object-Oriented Design (OOD)** and **Design Patterns** ensuring maintainability, high testability, and seamless scalability.

---

## 🌐 Public Live Deployments

* **Frontend Web Application (Vercel):** [https://nutri-plan-chi-two.vercel.app](https://nutri-plan-chi-two.vercel.app)
* **Backend RESTful API (Render):** `https://nutriplan-b3i6.onrender.com/api/v1`
* **Cloud Database (Neon PostgreSQL):** Serverless PostgreSQL 16 (Singapore Data Center)

---

## 🔑 Demo Evaluation Credentials

Pre-seeded accounts are available for instant testing and academic evaluation:

| Role | Email | Password | Primary Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@admin.com` | `00000000` | Full administrative control, user & food item catalog management |
| **Nutritionist** | `nutritionist@test.com` | `00000000` | Client plan creation, meal orchestration, adherence review |
| **Client** | `client@test.com` | `00000000` | View assigned plans, log meals, AI food photo scanning, add entries |

---

## ✨ Core Platform Capabilities

### 📸 1. AI Food Vision & Recognition Engine (Google Gemini Vision API)
* **Visual Food Classification:** Capture photos or upload meal images directly from mobile cameras or desktop devices.
* **Specialized & Thai Food Identification:** Recognizes specialized health foods and Thai dishes accurately (e.g., blended chicken breast / smoothies, protein shakes, steak, Tom Yum).
* **Nutritional Decomposition & Estimation:** Returns menu title, total calories, macronutrients (Protein, Carbs, Fat), and ingredient breakdown items with estimated weights and confidence scores.
* **Zero Client Configuration:** Server-bound integration powered by **Gemini 3.5 Flash Lite** and **3.8 Flash**; clients do not need to configure API keys.
* **Smart Auto-Fill to Meal Plan:** Add scanned meal analysis directly into the daily meal plan with one click.

### 📋 2. Dynamic Meal Plan Builder & Client Self-Management
* **Multi-Day Meal Plans:** Plan breakfast, morning snack, lunch, afternoon snack, and dinner targets.
* **Client Meal Addition:** Clients can add their own food entries and scan meals directly inside `/meal-plans/[id]`.
* **Smart Allergen Detection:** Real-time cross-referencing between food ingredients and client allergy profiles.

### 📱 3. Fully Responsive & Mobile Viewport Scaling
* Engineered with mobile-first viewport scaling (`width=device-width`, `initial-scale=1`) preventing screen overflow on all mobile devices.
* Touch-friendly controls with native camera access.

### 🌐 4. Real-Time Bilingual Localization (TH / EN)
* Dynamic language switching between Thai and English via React `LanguageContext`.

### 🧮 5. Scientific Caloric & Macronutrient Engine (BMR & TDEE)
* Implements **Mifflin-St Jeor** and **Harris-Benedict** equations based on age, gender, height, weight, and activity metrics.
* Dynamic target calorie adjustments for Weight Loss, Maintenance, or Muscle Building.

### 🛍️ 6. Automated Shopping List Aggregator (Factory Pattern)
* Aggregates total ingredient requirements across meal plans.
* Multi-format document generation (PDF / Text) driven by the **Factory Method Pattern**.

### 📊 7. Adherence Analytics & Progress Monitoring
* Real-time comparison between planned vs. actual consumed portions.
* Automated compliance calculation (% Adherence Score) with historical logging.

---

## 🏗️ System Architecture Diagram

```mermaid
graph TD
    User([📱 Users / Client / Nutritionist])
    
    subgraph "Vercel Edge Platform (Frontend Tier)"
        NextJS["⚡ Next.js 16 App Router<br/>(React 19 + TypeScript + TailwindCSS v4)"]
        ScannerModal["📸 AI Food Scanner Modal<br/>(Gemini Vision Engine)"]
        Axios["Client API Layer (Axios Interceptors)"]
    end

    subgraph "AI Services (Google Cloud)"
        Gemini["🤖 Google Gemini Vision API<br/>(gemini-3.5-flash-lite / 3.8-flash)"]
    end
    
    subgraph "Render Cloud Container (Backend Tier)"
        NETCore[".NET 8 Web API<br/>(Clean Architecture & Controllers)"]
        Domain["Core Domain Layer<br/>(Entities, Value Objects, Enums)"]
        AppLayer["Application Use Cases<br/>(Services, DTOs, Interfaces)"]
        Infra["Infrastructure Layer<br/>(EF Core 8 + Gemini Service)"]
    end
    
    subgraph "Neon Cloud Persistence (Database Tier)"
        Postgres[(🐘 Serverless PostgreSQL 16<br/>AWS Singapore Data Center)]
    end

    User -->|HTTPS Request| NextJS
    NextJS --> ScannerModal
    ScannerModal -.->|Image Analysis| Gemini
    NextJS --> Axios
    Axios -->|REST API / JWT| NETCore
    NETCore --> AppLayer
    AppLayer --> Domain
    AppLayer --> Infra
    Infra -.->|Server-side Food Vision| Gemini
    Infra -->|Encrypted SSL Connection| Postgres
```

---

## 📐 Object-Oriented Engineering & Architecture Showcase

### 1. Clean Architecture Breakdown (4-Tier)
* **`NutriPlan.Domain`:** Pure business domain containing core entities (`User`, `Client`, `Nutritionist`, `MealPlan`, `DailyMenu`, `FoodItem`, `MealLog`), immutable Value Objects (`NutrientProfile`), and Enums with zero external dependencies.
* **`NutriPlan.Application`:** Application use-cases, Data Transfer Objects (DTOs), and service abstractions (`IMealPlanService`, `IAuthService`, `IFoodRecognitionService`).
* **`NutriPlan.Infrastructure`:** Data persistence powered by Entity Framework Core 8, Repository implementations, database migrations, Gemini AI Service, and security.
* **`NutriPlan.Api`:** ASP.NET Core RESTful controllers, global exception middleware, and Dependency Injection wiring.

### 2. Design Patterns Implemented
* **Repository & Unit of Work Pattern:** Decouples business logic from data access (`IUserRepository`, `IMealPlanRepository`, `IUnitOfWork`).
* **Factory Method Pattern:** `ShoppingListFactory` encapsulates document creation for PDF and Text outputs.
* **Value Object Pattern:** `NutrientProfile` provides immutable macronutrient encapsulation.
* **Dependency Inversion Principle (DIP):** Abstraction-driven architecture backed by .NET 8 IoC container.

---

## 🛠️ Complete Technical Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide Icons, Axios |
| **Backend** | .NET 8 (ASP.NET Core Web API), C#, Entity Framework Core 8, Npgsql, JWT |
| **AI Computer Vision** | Google Gemini Vision API (`gemini-3.5-flash-lite`, `gemini-3.8-flash`) |
| **Database** | Serverless PostgreSQL 16 on Neon Cloud (AWS Singapore Data Center) |
| **Hosting & DevOps** | Vercel (Frontend Edge Network), Render (Backend Container Docker Service) |

---

## 💻 Local Developer Quickstart

```bash
# 1. Clone repository
git clone https://github.com/6731470008-web/NutriPlan.git
cd NutriPlan

# 2. Setup & Run Backend (.NET 8)
cd backend
dotnet restore
dotnet ef database update --project src/Infrastructure/NutriPlan.Infrastructure --startup-project src/Infrastructure/NutriPlan.Api
dotnet run --project src/Infrastructure/NutriPlan.Api

# 3. Setup & Run Frontend (Next.js 16)
cd ../frontend
npm install
npm run dev
```

---

<div align="center">

Distributed under the **MIT License**. Engineered with ❤️ for Academic & Professional Excellence in Software Engineering.

</div>
