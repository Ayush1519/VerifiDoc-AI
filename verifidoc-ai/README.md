# VerifiDoc AI 🛡️
**Real-time Document Anomaly Detection & Fraud Prevention**  
SuRaksha Initiative · Canara Bank Hackathon

---

## What it does

VerifiDoc AI analyses uploaded financial documents (PDFs, scanned images) for signs of forgery or tampering:

| Module | What it checks |
|---|---|
| **Metadata Forensics** | Creator software, edit history, future creation dates |
| **OCR Extraction** | Extracts PAN, Aadhaar, amounts, IFSC, dates |
| **ELA Pixel Analysis** | Error Level Analysis to find manipulated image regions |
| **Noise Consistency** | Uneven sensor noise across quadrants = composite image |
| **PDF Structure** | Mixed page sizes, embedded JavaScript |
| **Semantic Checks** | Contradictory terms, unreplaced template placeholders |
| **Field Consistency** | Multiple PAN/Aadhaar numbers in one document |

All findings are combined into a **0–100 risk score** with colour-coded alerts and underwriter recommendations.

---

## Project Structure

```
verifidoc-ai/
├── backend/
│   ├── main.py                  ← FastAPI app + all routes
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py           ← Pydantic models
│   ├── services/
│   │   ├── ocr_service.py       ← Tesseract / pdfplumber OCR
│   │   ├── metadata_service.py  ← EXIF + PDF metadata analysis
│   │   ├── anomaly_service.py   ← ELA, noise, semantic checks
│   │   └── risk_engine.py       ← Score aggregation + recommendations
│   └── utils/
│       └── helpers.py
└── frontend/
    ├── pages/
    │   ├── _app.js
    │   └── index.js             ← Full dashboard UI
    ├── components/
    │   ├── FileUpload.jsx        ← Drag-and-drop uploader
    │   ├── RiskDashboard.jsx     ← Animated gauge + stats
    │   └── AnomalyReport.jsx    ← Detailed findings list
    ├── styles/globals.css
    ├── tailwind.config.js
    ├── next.config.js
    └── package.json
```

---

## Prerequisites

| Tool | Install link |
|---|---|
| **Python 3.11+** | https://www.python.org/downloads/ |
| **Node.js 18+** | https://nodejs.org/ |
| **Tesseract OCR** | See below |

### Install Tesseract

**Windows:**
```
winget install UB-Mannheim.TesseractOCR
```
After install, add `C:\Program Files\Tesseract-OCR` to your system PATH.

**macOS:**
```bash
brew install tesseract
```

**Ubuntu / Debian:**
```bash
sudo apt install tesseract-ocr
```

---

## Quick Start

### 1. Clone / open in VS Code
Open the `verifidoc-ai/` folder in VS Code.

### 2. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Start the backend

```bash
# From the backend/ directory, with venv activated
uvicorn main:app --reload --port 8000
```

The API will be available at http://localhost:8000  
Interactive docs at http://localhost:8000/api/docs

### 4. Frontend setup (new terminal)

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be at http://localhost:3000

---

## API Reference

### `POST /api/verify`

Upload a document for verification.

**Request:** `multipart/form-data`  
- `file` — PDF, JPEG, or PNG (max 20 MB)

**Response:**
```json
{
  "document_id": "uuid",
  "filename": "statement.pdf",
  "risk_score": 45,
  "risk_level": "HIGH",
  "anomalies": [
    {
      "type": "ELA_TAMPERING",
      "severity": "HIGH",
      "description": "...",
      "confidence": 0.72,
      "location": "image_body"
    }
  ],
  "metadata_flags": ["EDITED_WITH_IMAGE_SOFTWARE: adobe photoshop"],
  "ocr_confidence": 0.87,
  "extracted_fields": {
    "pan_number": ["ABCDE1234F"],
    "amount": ["₹5,00,000"]
  },
  "recommendations": ["..."],
  "processing_time_ms": 1240
}
```

### `GET /api/health`

Returns service status.

### `POST /api/verify/batch`

Verify up to 5 documents in one call.

---

## Risk Levels

| Score | Level | Meaning |
|---|---|---|
| 0–14 | 🟢 LOW | Document appears authentic |
| 15–39 | 🟡 MODERATE | Minor flags; request additional docs |
| 40–69 | 🟠 HIGH | Multiple anomalies; manual review required |
| 70–100 | 🔴 CRITICAL | Strong forgery indicators; halt processing |

---

## Deployment (Vercel + Backend)

### Prerequisites
- A deployed backend (Heroku, Railway, Azure, AWS, etc.)
- A Vercel account (free at vercel.com)

### Step 1: Deploy Backend First
Deploy your FastAPI backend to a cloud platform:
- **Heroku:** `git push heroku main`
- **Railway:** Connect your repo → Railway will auto-deploy
- **Azure:** Use Azure App Service → Deploy from GitHub
- **Render.com:** Connect repo → Deploy

Note the backend URL (e.g., `https://my-verifidoc-api.herokuapp.com`)

### Step 2: Configure Frontend for Vercel
1. In Vercel dashboard, add environment variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend-url.com` (without trailing slash)

2. Redeploy: Push code to GitHub or click "Redeploy" in Vercel

### Step 3: Get Your Live Link
Once deployed, your Vercel project URL will be: `https://your-project-name.vercel.app`

---

## Troubleshooting

**`pytesseract.pytesseract.TesseractNotFoundError`**  
→ Tesseract is not installed or not in PATH. See Prerequisites above.

**`ModuleNotFoundError: No module named 'cv2'`**  
→ Run `pip install opencv-python` inside the venv.

**Frontend shows "Verification failed"**  
→ Make sure the backend is running on port 8000 first, OR set `NEXT_PUBLIC_API_URL` env var to your backend URL.

**Live link on Vercel not working**  
→ Backend URL must be set in Vercel environment variables. See Deployment section.

**Backend API URL issues on production**  
→ Check that `NEXT_PUBLIC_API_URL` is set correctly and the backend is accessible from your Vercel deployment.

**Port already in use**  
→ `uvicorn main:app --reload --port 8001` then set `NEXT_PUBLIC_API_URL=http://localhost:8001` in `.env.local`.

---

## Tech Stack

**Backend:** Python · FastAPI · pdfplumber · PyMuPDF · pytesseract · OpenCV · NumPy  
**Frontend:** Next.js 14 · React 18 · Tailwind CSS · Framer Motion · Lucide Icons
