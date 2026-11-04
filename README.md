# 🩸 Blood Match — Emergency Compatibility & Transfusion Network

<p align="center">
  <img src="https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
  <img src="https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-MIT-brightgreen?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge"/>
</p>

<p align="center">
  <strong>Blood Match</strong> is a modern, high-performance clinical transfusion and emergency blood compatibility platform. Built with React 19, TypeScript, and Tailwind CSS, it features dynamic video split-screen authentication, interactive ABO/RhD antigen compatibility cross-matching, an emergency dispatch board, and live cryo-inventory tracking.
</p>

---

## ✨ Features

- **Full Universal Compatibility Engine** — Interactive 8x8 matrix evaluating all ABO and RhD antigen combinations (A+, A-, B+, B-, AB+, AB-, O+, O-) with instant match scoring and clinical contraindication warnings.
- **Dynamic Split-Screen Video Authentication** — Immersive authentication interface powered by `Login.mp4` on sign-in and `signup.mp4` on registration, overlaid on an atmospheric `background.mp4` stream.
- **Real-Time Emergency Dispatch Board** — Urgent broadcast system for hospital transfusion requests with critical severity alarms and automatic eligible donor filtering.
- **Certified Voluntary Donor Registry** — Searchable donor directory with filtering by blood type, city, age, and immediate mobilization readiness.
- **Blood Bank Cryo-Storage Inventory** — Live inventory management with visual stock health indicators (Optimal, Low, Critical) and real-time pint adjustments.
- **Clean Zero-State Architecture** — Starts with zero synthetic dummy data, persisting real operational records via resilient client storage.
- **Cloudflare Pages Production Ready** — Optimized single-page application build with automated SPA rewrites (`_redirects`) and HTTP caching headers (`_headers`).
- **Glassmorphic Medical Aesthetics** — Modern dark-mode interface with crimson transfusion accents, smooth animations, and responsive layouts across mobile, tablet, and desktop.

---

## 🔗 Project Repository

| Repository | Purpose | Status |
|---|---|---|
| [Blood_Match_software](https://github.com/HelloWorld-Farhan/Blood_Match_software) | Main Blood Match Application & Transfusion Network | Active |

---

## 🖼 Application Architecture

```text
BloodMatch/
├── index.html                                      → Application Entrypoint
├── public/
│   ├── background.mp4                              → Atmospheric Looped Background Video
│   ├── Login.mp4                                   → Sign-In Split-Screen Video
│   ├── signup.mp4                                  → Registration Split-Screen Video
│   ├── _redirects                                  → Cloudflare Pages SPA Routing Rules
│   └── _headers                                    → Cloudflare Edge Caching Directives
└── src/
    ├── components/
    │   ├── BackgroundVideo.tsx                     → Fullscreen Ambient Video Stream Player
    │   ├── Navbar.tsx                              → Modern Glass Navigation & Tab Controller
    │   ├── AuthModal.tsx                           → Video Split-Screen Login & Registration
    │   ├── Dashboard.tsx                           → Live KPI Hub & Quick-Match Simulator
    │   ├── CompatibilityMatrix.tsx                 → Comprehensive 8x8 Transfusion Matrix
    │   ├── DonorRegistry.tsx                       → Searchable Donor Directory & Registration
    │   ├── EmergencyRequests.tsx                   → Live Urgent Call Board & Donor Matcher
    │   └── InventoryManager.tsx                    → Cryo-Vault Unit Inventory & Dispensing
    ├── services/
    │   └── storage.ts                              → Clean Zero-State Local Persistence
    ├── utils/
    │   └── bloodCompatibility.ts                   → Medically Validated ABO/Rh Matching Logic
    ├── types/
    │   └── index.ts                                → Strict TypeScript Data Contracts
    ├── App.tsx                                     → Root Application Orchestrator
    ├── main.tsx                                    → React 19 Bootstrap
    └── index.css                                   → Tailwind Directives & Custom Utilities
```

---

## 🎨 Design System

### Transfusion Theme
| Token | Value | Clinical Representation |
|---|---|---|
| Primary Crimson | `#DC2626` | Whole Blood / Emergency Alerts |
| Deep Burgundy | `#7F1D1D` | Concentrated Erythrocyte Reserves |
| Background Void | `#030712` | High-Contrast Clinical Dark Mode |
| Glass Surface | `rgba(15, 23, 42, 0.8)` | Translucent Frosted Dashboard Panels |
| Text Main | `#F8FAFC` | High-Legibility Primary Data |
| Text Muted | `#94A3B8` | Clinical Metadata & Timestamps |

---

## 🚀 How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/HelloWorld-Farhan/Blood_Match_software.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Blood_Match_software
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
5. Build for production (Cloudflare Pages):
   ```bash
   npm run build
   ```

---

## ☁️ Cloudflare Pages Deployment Configuration

To deploy on Cloudflare Pages:
1. Connect repository `HelloWorld-Farhan/Blood_Match_software`.
2. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
   - **Node.js Version**: `18.x` or higher

---

## 👨‍💻 Author

**Farhan Khalid**  
📧 farhankhalid17968@gmail.com  
🔗 [LinkedIn](https://www.linkedin.com/in/farhan-khalid-117514259/)  
🐙 [GitHub](https://github.com/HelloWorld-Farhan)

---

## 📄 License

```text
MIT License

Copyright (c) 2026 Farhan Khalid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🌟 Support

If this project helps your medical team or blood bank, please give it a ⭐ on GitHub!

<p align="center">Made with ❤️ — React 19 · TypeScript · Vite · Tailwind CSS · Cloudflare</p>

