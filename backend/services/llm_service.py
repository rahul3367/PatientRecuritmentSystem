import json
from typing import List, Optional, Tuple, Dict, Any

from groq import Groq, GroqError
from pydantic import ValidationError

from backend.config import settings
from backend.schemas.criterion_schema import CriterionCreate


def generate_extraction_messages(
    text: str,
    retry_error: Optional[str] = None,
) -> List[Dict[str, str]]:
    """
    Construct system and user messages to instruct the LLM to exhaustively
    extract all eligibility and exclusion criteria into structured JSON.
    """
    system_prompt = """You are an expert clinical trial protocol analyzer. Your task is to exhaustively extract EVERY eligibility criterion (both Inclusion Criteria and Exclusion Criteria) from the provided clinical trial protocol text.

EXTRACTION PRINCIPLES:
1. COMPLETE & EXHAUSTIVE: You MUST extract EVERY SINGLE criterion mentioned in the text. Do not summarize, group, omit, skip, or truncate any items. If the protocol lists 13 criteria, you must return all 13 criteria objects in the "criteria" array.
2. INCLUSION CRITERIA:
   - Positive participant requirements (e.g., Age ranges, Diagnosis, Device access, Vision/hearing, Willingness to complete training, Informed consent).
   - For Boolean inclusion criteria, set "boolean_ideal": true.
3. EXCLUSION CRITERIA:
   - Disqualifying medical conditions, prior diseases, concurrent trial participation, recent acute events, intensive therapies, or psychiatric conditions.
   - For Boolean exclusion criteria, set "boolean_ideal": false, "classification": "HARD", and "operator": "EQUALS".
4. DATA TYPES:
   - "NUMERIC": For numerical ranges or measurements (e.g., Age 40-70, Blood Pressure, BMI, lab thresholds). If HARD, provide "numeric_min" and "numeric_max". If SOFT, provide "numeric_ideal" and "numeric_tolerance".
   - "CATEGORICAL": For medical conditions, diagnoses, disease stages, or discrete categories. Provide "categorical_ideal".
   - "BOOLEAN": For presence/absence of conditions, abilities, consents, exclusions, or binary requirements. Provide "boolean_ideal" (true for required inclusion, false for forbidden exclusion).
5. CLASSIFICATION:
   - "HARD": Mandatory pass/fail gates (e.g., age limits, mandatory conditions, all exclusion criteria, device access, informed consent).
   - "SOFT": Graded/scored biomarker preferences or targets (e.g., optimal HbA1c target ± tolerance, ideal BMI ± tolerance).
6. FIELD NAMES: Provide clean, descriptive names (e.g., "Age", "Subjective memory difficulties", "Mild cognitive impairment diagnosis", "Access to smartphone/tablet/computer", "Adequate vision and hearing", "Willingness to complete training", "Ability to provide informed consent", "Major neurocognitive disorder exclusion", "Major neurological disease exclusion", "Current participation in another clinical trial exclusion", "Recent major neurological event exclusion", "Intensive cognitive rehabilitation exclusion", "Uncontrolled psychiatric condition exclusion").

Return ONLY a valid JSON object with the "criteria" list."""

    user_prompt = f"""Extract ALL inclusion criteria and ALL exclusion criteria from the protocol below without omitting any item.

CLINICAL TRIAL PROTOCOL:
{text}

Return ONLY a valid JSON object with this exact structure:
{{
    "criteria": [
        {{
            "field": "string",
            "data_type": "NUMERIC | CATEGORICAL | BOOLEAN",
            "classification": "HARD | SOFT",
            "operator": "BETWEEN | EQUALS | INCLUDES | GAUSSIAN",
            "numeric_min": float or null,
            "numeric_max": float or null,
            "numeric_ideal": float or null,
            "numeric_tolerance": float or null,
            "categorical_ideal": "string or null",
            "boolean_ideal": true or false or null,
            "weight": float or null
        }}
    ]
}}"""

    if retry_error:
        user_prompt += f"""

YOUR PREVIOUS ATTEMPT FAILED.
Validation error:
{retry_error}

Return corrected JSON containing ALL criteria adhering strictly to the schema."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def generate_extraction_prompt(
    text: str,
    retry_error: Optional[str] = None,
) -> str:
    """
    Legacy single-prompt generator for backward compatibility.
    """
    messages = generate_extraction_messages(text, retry_error)
    return f"{messages[0]['content']}\n\n{messages[1]['content']}"


def clean_json_string(raw_str: str) -> str:
    """
    Remove accidental Markdown code fences or surrounding text from the LLM response,
    and repair incomplete trailing braces if needed.
    """
    raw_str = raw_str.strip()

    if raw_str.startswith("```json"):
        raw_str = raw_str[7:].strip()
    elif raw_str.startswith("```"):
        raw_str = raw_str[3:].strip()

    if raw_str.endswith("```"):
        raw_str = raw_str[:-3].strip()

    # If extra text precedes the first '{'
    first_brace = raw_str.find("{")
    if first_brace != -1:
        raw_str = raw_str[first_brace:]

    # Check if closing brackets are present
    if not raw_str.endswith("}"):
        last_brace = raw_str.rfind("}")
        if last_brace != -1:
            raw_str = raw_str[:last_brace + 1]
            if '"criteria"' in raw_str and not raw_str.endswith("]}"):
                if raw_str.endswith("]"):
                    raw_str = raw_str + "}"
                else:
                    raw_str = raw_str + "]}"

    return raw_str


def extract_criteria(
    text: str,
    retry_error: Optional[str] = None,
) -> List[CriterionCreate]:

    client = Groq(api_key=settings.LLM_API_KEY)
    messages = generate_extraction_messages(text, retry_error)

    try:
        # 1. Attempt structured JSON object mode with high max_tokens
        try:
            response = client.chat.completions.create(
                model=settings.LLM_MODEL,
                temperature=0.0,
                max_tokens=4096,
                response_format={"type": "json_object"},
                messages=messages,
            )
            raw_json_str = response.choices[0].message.content
        except (GroqError, Exception) as json_mode_err:
            # Fallback if json_object constrained decoding encounters an error
            response = client.chat.completions.create(
                model=settings.LLM_MODEL,
                temperature=0.0,
                max_tokens=4096,
                messages=messages,
            )
            raw_json_str = response.choices[0].message.content

        if not raw_json_str:
            raise ValueError("LLM returned an empty response.")

        cleaned_json_str = clean_json_string(raw_json_str)

        # Parse JSON
        data = json.loads(cleaned_json_str)

        if not isinstance(data, dict):
            raise TypeError(
                "Expected a JSON object containing a 'criteria' key."
            )

        if "criteria" not in data:
            raise TypeError(
                "JSON response does not contain the required 'criteria' key."
            )

        criteria_data = data["criteria"]

        if not isinstance(criteria_data, list):
            raise TypeError(
                "The 'criteria' field must contain a JSON array."
            )

        # Sanitize and validate each criterion using Pydantic
        validated_criteria = []
        for idx, item in enumerate(criteria_data, start=1):
            if not isinstance(item, dict):
                continue

            # Field name normalization
            raw_field = item.get("field")
            if not raw_field or not str(raw_field).strip():
                raw_field = f"criterion_{idx}"
            item["field"] = str(raw_field).strip()

            # Normalize data_type
            d_type = str(item.get("data_type", "NUMERIC")).upper().strip()
            if d_type not in ["NUMERIC", "CATEGORICAL", "BOOLEAN"]:
                d_type = "CATEGORICAL"
            item["data_type"] = d_type

            # Normalize classification
            c_class = str(item.get("classification", "HARD")).upper().strip()
            if c_class not in ["HARD", "SOFT"]:
                c_class = "HARD"
            item["classification"] = c_class

            # Normalize operator
            raw_op = item.get("operator")
            if raw_op:
                item["operator"] = str(raw_op).upper().strip()
            else:
                if d_type == "NUMERIC":
                    item["operator"] = "BETWEEN" if c_class == "HARD" else "GAUSSIAN"
                elif d_type == "CATEGORICAL":
                    item["operator"] = "EQUALS"
                else:
                    item["operator"] = "EQUALS"

            # Clean and coerce fields based on data_type & classification
            if d_type == "NUMERIC":
                if c_class == "HARD":
                    item.pop("numeric_ideal", None)
                    item.pop("numeric_tolerance", None)
                    try:
                        item["numeric_min"] = float(item["numeric_min"]) if item.get("numeric_min") is not None else 0.0
                    except (ValueError, TypeError):
                        item["numeric_min"] = 0.0
                    try:
                        item["numeric_max"] = float(item["numeric_max"]) if item.get("numeric_max") is not None else 100.0
                    except (ValueError, TypeError):
                        item["numeric_max"] = 100.0
                elif c_class == "SOFT":
                    item.pop("numeric_min", None)
                    item.pop("numeric_max", None)
                    try:
                        item["numeric_ideal"] = float(item["numeric_ideal"]) if item.get("numeric_ideal") is not None else 50.0
                    except (ValueError, TypeError):
                        item["numeric_ideal"] = 50.0
                    try:
                        item["numeric_tolerance"] = float(item["numeric_tolerance"]) if item.get("numeric_tolerance") is not None else 10.0
                    except (ValueError, TypeError):
                        item["numeric_tolerance"] = 10.0
                item.pop("categorical_ideal", None)
                item.pop("boolean_ideal", None)

            elif d_type == "CATEGORICAL":
                item.pop("numeric_min", None)
                item.pop("numeric_max", None)
                item.pop("numeric_ideal", None)
                item.pop("numeric_tolerance", None)
                item.pop("boolean_ideal", None)
                cat_val = item.get("categorical_ideal")
                if not cat_val or not str(cat_val).strip():
                    item["categorical_ideal"] = item["field"]
                else:
                    item["categorical_ideal"] = str(cat_val).strip()

            elif d_type == "BOOLEAN":
                item.pop("numeric_min", None)
                item.pop("numeric_max", None)
                item.pop("numeric_ideal", None)
                item.pop("numeric_tolerance", None)
                item.pop("categorical_ideal", None)
                b_val = item.get("boolean_ideal")
                if isinstance(b_val, str):
                    item["boolean_ideal"] = b_val.strip().lower() in ["true", "1", "yes", "positive"]
                elif b_val is None:
                    # Check if field name indicates an exclusion
                    is_exclusion = "exclusion" in item["field"].lower() or "exclude" in item["field"].lower()
                    item["boolean_ideal"] = False if is_exclusion else True
                else:
                    item["boolean_ideal"] = bool(b_val)

            # Weight normalization
            if item.get("weight") is not None:
                try:
                    item["weight"] = float(item["weight"])
                except (ValueError, TypeError):
                    item["weight"] = 1.0

            try:
                validated_criteria.append(CriterionCreate(**item))
            except ValidationError as ve:
                continue

        if len(validated_criteria) == 0:
            raise ValueError("No valid criteria could be parsed from LLM response.")

        return validated_criteria

    except GroqError as e:
        raise ValueError(
            f"Groq API Error: {str(e)}"
        ) from e

    except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as e:
        # Retry once with the validation/parsing error
        if not retry_error:
            return extract_criteria(
                text,
                retry_error=str(e),
            )

        raise ValueError(
            f"LLM failed to produce valid criteria schema: {str(e)}"
        ) from e