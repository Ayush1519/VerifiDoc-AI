import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable.IncomingForm();
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Mock response - In production, forward to backend
    const mockResult = {
      status: "success",
      document_id: Math.random().toString(36).substr(2, 9),
      filename: file.originalFilename,
      file_type: file.mimetype,
      analysis_timestamp: new Date().toISOString(),
      
      metadata: {
        creation_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        modification_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        creator_app: "Adobe Acrobat Pro DC",
        producer: "iLovePDF",
        pages: Math.floor(Math.random() * 10) + 1,
        flags: []
      },

      ocr_results: {
        detected_text: [
          "IMPORTANT DOCUMENT",
          "Invoice #INV-2024-001234",
          "Date: January 15, 2024",
          "Amount: $5,250.00"
        ],
        confidence: 0.94,
        text_regions: 12
      },

      anomalies: {
        detected: false,
        total_flags: 0,
        severity: "none",
        pixel_analysis: {
          ela_max_error: 3.2,
          hotspots: 0,
          conclusion: "No significant forgery indicators detected"
        }
      },

      risk_assessment: {
        overall_score: 8.5,
        category: "LOW_RISK",
        confidence: 0.96,
        risk_factors: [
          { factor: "metadata_consistency", score: 0.95, status: "pass" },
          { factor: "text_anomalies", score: 0.92, status: "pass" },
          { factor: "image_integrity", score: 0.98, status: "pass" }
        ],
        recommendation: "APPROVE"
      },

      extracted_fields: {
        "document_type": "Invoice",
        "date": "2024-01-15",
        "amount": "$5,250.00",
        "vendor": "Acme Corporation",
        "invoice_number": "INV-2024-001234",
        "due_date": "2024-02-15"
      },

      processing_time_ms: 2847
    };

    res.status(200).json(mockResult);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Processing failed',
      detail: error.message
    });
  }
}
