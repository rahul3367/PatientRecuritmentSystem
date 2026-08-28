import pandas as pd
from typing import Any, Dict, List

def parse_patient_excel(file_obj: Any) -> Dict[str, Any]:
    """
    Reads an uploaded .xlsx file, normalizes column headers, and returns 
    structured rows and validation errors. This does not touch the DB.
    """
    try:
        # Read the excel file
        df = pd.read_excel(file_obj)
    except Exception as e:
        return {"rows": [], "errors": [f"Failed to read Excel file: {str(e)}"]}
        
    # Normalize column headers (lowercase, strip whitespace)
    df.columns = df.columns.str.strip().str.lower()
    
    # Map common variants to exact model/schema fields
    column_mapping = {
        "date of birth": "dob",
        "birth date": "dob",
        "phone number": "phone",
        "blood type": "blood_group",
        "systolic": "bp_systolic",
        "diastolic": "bp_diastolic",
        "heart rate": "heart_rate",
        "blood glucose": "blood_glucose"
    }
    df = df.rename(columns=column_mapping)
    
    # Validate required columns
    required_columns = ["name", "consent"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        return {
            "rows": [], 
            "errors": [f"Missing required columns: {', '.join(missing_columns)}"]
        }
        
    # Clean NaN values to None for Pydantic/SQLAlchemy compatibility
    df = df.where(pd.notnull(df), None)
    
    # Convert DataFrame to a list of dicts
    rows = df.to_dict(orient="records")
    
    return {
        "rows": rows,
        "errors": []
    }