#!/usr/bin/env python3
"""
Self-Hosted SQL Generator using Groq LLM
Simple, fast, and truly self-hosted
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import Optional
from groq import Groq

from config import GROQ_API_KEY as CONFIG_GROQ_API_KEY

app = FastAPI(title="Groq SQL Generator", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
GROQ_API_KEY = os.environ.get('GROQ_API_KEY') or CONFIG_GROQ_API_KEY

if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)
    print("[OK] Groq client initialized")
else:
    client = None
    print("[ERROR] GROQ_API_KEY not set")
    print("Get your free API key from: https://console.groq.com/")

# Database schema context
DATABASE_SCHEMA = """
You are a PostgreSQL SQL expert. Generate SQL queries for an analytics database with these tables:

## Tables:

### Invoice
- id (TEXT, PRIMARY KEY)
- invoiceNumber (TEXT, UNIQUE)
- invoiceDate (TIMESTAMP)
- dueDate (TIMESTAMP)
- totalAmount (DOUBLE PRECISION)
- status (ENUM: 'PAID', 'PENDING', 'OVERDUE', 'SENT', 'PARTIALLY_PAID', 'CANCELLED')
- currency (TEXT, default 'EUR')
- vendorId (TEXT, FOREIGN KEY to Vendor)
- customerId (TEXT, FOREIGN KEY to Customer)

### Vendor
- id (TEXT, PRIMARY KEY)
- name (TEXT)
- email (TEXT)
- phone (TEXT)

### Customer
- id (TEXT, PRIMARY KEY)
- name (TEXT)
- email (TEXT)
- phone (TEXT)

### LineItem
- id (TEXT, PRIMARY KEY)
- invoiceId (TEXT, FOREIGN KEY to Invoice)
- description (TEXT)
- quantity (DOUBLE PRECISION)
- unitPrice (DOUBLE PRECISION)
- amount (DOUBLE PRECISION)
- sachkonto (TEXT) -- Category: Operations, Marketing, Facilities

### Payment
- id (TEXT, PRIMARY KEY)
- invoiceId (TEXT, FOREIGN KEY to Invoice)
- amount (DOUBLE PRECISION)
- paymentDate (TIMESTAMP)
- paymentMethod (ENUM: 'BANK_TRANSFER', 'CREDIT_CARD', etc.)

## Important Rules:
1. Use double quotes for table and column names (e.g., "Invoice", "totalAmount")
2. Use single quotes for string values
3. Use PostgreSQL syntax (CURRENT_DATE, NOW(), INTERVAL, etc.)
4. Always use proper JOINs when accessing related tables
5. Return only SELECT queries (never INSERT, UPDATE, DELETE, DROP)

## Example Queries:

Q: "What's the total spend in the last 90 days?"
SQL: SELECT SUM("totalAmount") as total_spend FROM "Invoice" WHERE "invoiceDate" >= NOW() - INTERVAL '90 days'

Q: "Show top 5 vendors by spend"
SQL: SELECT v.name as vendor_name, SUM(i."totalAmount") as total_spend FROM "Vendor" v JOIN "Invoice" i ON v.id = i."vendorId" GROUP BY v.id, v.name ORDER BY total_spend DESC LIMIT 5

Q: "List overdue invoices"
SQL: SELECT i."invoiceNumber", i."totalAmount", i."dueDate", v.name as vendor_name FROM "Invoice" i JOIN "Vendor" v ON i."vendorId" = v.id WHERE i.status = 'OVERDUE' ORDER BY i."dueDate"

Now generate SQL for the user's question. Return ONLY the SQL query, no explanation.
"""

class QueryRequest(BaseModel):
    query: str
    
class SQLResponse(BaseModel):
    sql: str
    success: bool
    error: Optional[str] = None

@app.get("/")
async def root():
    return {
        "service": "Groq SQL Generator",
        "status": "running",
        "groq_configured": client is not None,
        "model": "llama-3.3-70b-versatile",
        "endpoints": {
            "generate_sql": "/generate-sql",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "groq_available": client is not None
    }

@app.post("/generate-sql", response_model=SQLResponse)
async def generate_sql(request: QueryRequest):
    """
    Generate SQL from natural language using Groq LLM
    """
    try:
        if not client:
            raise HTTPException(
                status_code=503,
                detail="Groq is not configured. Set GROQ_API_KEY environment variable. Get it from: https://console.groq.com/"
            )
        
        # Call Groq API
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": DATABASE_SCHEMA
                },
                {
                    "role": "user",
                    "content": f"Generate PostgreSQL query for: {request.query}"
                }
            ],
            model="llama-3.3-70b-versatile",  # Latest and most capable model
            temperature=0.1,  # Low temperature for more consistent SQL
            max_tokens=500
        )
        
        sql = chat_completion.choices[0].message.content.strip()
        
        # Clean up the SQL (remove markdown code blocks if present)
        if sql.startswith("```"):
            # Remove ```sql or ```postgresql
            lines = sql.split('\n')
            sql = '\n'.join(lines[1:-1])  # Remove first and last line
        
        sql = sql.strip()
        
        if not sql:
            raise HTTPException(
                status_code=400,
                detail="Groq could not generate SQL from your question"
            )
        
        # Basic validation
        sql_lower = sql.lower()
        forbidden_keywords = ['insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create']
        if any(keyword in sql_lower for keyword in forbidden_keywords):
            raise HTTPException(
                status_code=400,
                detail="Generated SQL contains forbidden operations. Only SELECT queries are allowed."
            )
        
        return SQLResponse(sql=sql, success=True)
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] {error_msg}")
        return SQLResponse(
            sql="",
            success=False,
            error=error_msg
        )

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    if client:
        print("Starting Groq SQL Generator on http://localhost:8000")
        print("Using Groq LLM: llama-3.3-70b-versatile")
        print("Ready to generate SQL from natural language!")
    else:
        print("ERROR: GROQ_API_KEY not set")
        print("Get your free API key from: https://console.groq.com/")
        print("Then set: $env:GROQ_API_KEY='your-key-here'")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
