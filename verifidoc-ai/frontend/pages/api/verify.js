export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock response with realistic verification data
    const mockResult = {
      status: "success",
      document_id: Math.random().toString(36).substr(2, 9),
      filename: "document.pdf",
      file_type: "application/pdf",
      analysis_timestamp: new Date().toISOString(),
      
      metadata: {
        creation_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        modification_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        creator_app: "Adobe Acrobat Pro DC",
        producer: "iLovePDF",
        pages: Math.floor(Math.random() * 10) + 1,
        flags: []
      },

      metadata_flags: [],

      ocr_results: {
        detected_text: [
          "IMPORTANT DOCUMENT",
          "Invoice #INV-2024-001234",
          "Date: January 15, 2024",
          "Amount: $5,250.00",
          "Vendor: Acme Corporation"
        ],
        confidence: 0.94,
        text_regions: 12
      },

      anomalies: [],
      
      risk_level: "LOW",
      risk_score: 8.5,
      
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

      recommendations: [
        "Document appears to be authentic",
        "All automated checks passed successfully",
        "Ready for underwriting approval"
      ],

      processing_time_ms: 2847
    };

    return res.status(200).json(mockResult);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Processing failed',
      detail: error.message
    });
  }
}
