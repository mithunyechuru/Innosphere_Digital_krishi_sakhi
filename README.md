# InnoSphere - Digital Kheti Companion 🌾
> **Smart India Hackathon 2025 | Team InnoSphere (SIH25168)**
> 
> An AI-powered, multilingual digital agricultural advisory platform designed to empower Indian farmers with data-driven decision-making, improving productivity, income, and agricultural sustainability.

---

## 🌟 Key Features

*   **🎙️ Krishi Sakhi (Multilingual Conversational Voice Assistant)**
    *   An AI agricultural assistant powered by **Gemini 2.5 Flash**.
    *   Supports speech-to-text in major Indian regional languages including English, Hindi, Marathi, Telugu, Tamil, Kannada, and Malayalam.
*   **🏥 Pest Doctor (AI Disease Diagnosis)**
    *   Upload plant leaf pictures to diagnose pests or diseases.
    *   Receive detailed reports with Organic and Chemical control options, including specific dosage guidance per acre.
    *   Download diagnosis results as formatted PDF reports.
    *   Book video consultations with regional government agricultural experts.
*   **📊 Farm Dashboard & Live Crop Monitoring**
    *   Real-time hyper-local weather alerts, humidity, and precipitation tracking.
    *   Interactive timelines tracking active crop milestones.
    *   Checklists with sequential logic check to make sure preceding steps are completed.
*   **🌾 Soil Health Card Vision Analyzer**
    *   Upload physical Soil Health Cards issued by the Government of India.
    *   Extract nutrient indices (N, P, K, pH, Organic Carbon) using Gemini's multimodal capabilities.
    *   Find the nearest government-approved soil testing lab.
*   **📈 Mandi Connect (Live APMC Commodity Pricing)**
    *   Live market price index fetched directly from the open government data portal (data.gov.in).
    *   State and district-level filters with automatic location mapping.
    *   Interactive charts (powered by Recharts) showing pricing trends over the last 7 days.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v18.2.0), Vite (v5.1.5), TypeScript (v5.2.2)
*   **Styling**: Tailwind CSS (v3.4.1), Lucide React Icons
*   **AI Integration**: Google Gen AI SDK (`@google/genai` v0.3.0) via `gemini-2.5-flash`
*   **Analytics & Maps**: Recharts (v2.12.2) for price trends, Leaflet (v1.9.4) for geolocation
*   **Data APIs**: Open-Meteo API (Weather), Data.gov.in APMC API (Mandi Rates)

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
Ensure you have Node.js (v18 or higher) and npm installed.

### 2. Clone and Install
```bash
# Clone the repository
git clone https://github.com/mithunyechuru/Innosphere_Digital_krishi_sakhi.git
cd Innosphere_Digital_krishi_sakhi

# Install dependencies
npm install
```

### 3. Environment Variables Config
Create a `.env` file in the root of the project and add your Gemini API Key:
```env
API_KEY=your_gemini_api_key_here
```

### 4. Running Locally
Launch the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

### 5. Production Build
Compile and bundle the application for production deployment:
```bash
npm run build
```

---

## 🧪 Simulation & Testing Guide

*   **Register / Log In**: Use the "Fill Test Data" button on the onboarding screen for quick setup. The default OTP for mockup verification is `1234`.
*   **Soil Health Card**: Upload any sample card image to trigger the AI card parsing and recommendations.
*   **Pest Doctor**: Upload a leaf image showing symptoms to retrieve agricultural diagnostics.

---

## 👥 Team Information

*   **Institute**: Amrita Vishwa Vidyapeetham
*   **Team Name**: Team InnoSphere
*   **Team Members**:
    *   **Koushik Immidi** (Team Lead)
    *   **Allampati Sushanth**
    *   **Nidhi Sharma**
    *   **Magarla Charishma**
    *   **Yechuru Mithun Gupta**
    *   **Manukonda Pranav Surya**
