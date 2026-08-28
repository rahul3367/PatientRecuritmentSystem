from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, model_validator

class DataType(str, Enum):
    NUMERIC = "NUMERIC"
    CATEGORICAL = "CATEGORICAL"
    BOOLEAN = "BOOLEAN"

class Classification(str, Enum):
    HARD = "HARD"
    SOFT = "SOFT"

class CriterionCreate(BaseModel):
    field: str
    data_type: DataType
    classification: Classification
    operator: str

    numeric_min: Optional[float] = None
    numeric_max: Optional[float] = None
    numeric_ideal: Optional[float] = None
    numeric_tolerance: Optional[float] = None
    categorical_ideal: Optional[str] = None
    boolean_ideal: Optional[bool] = None

    weight: Optional[float] = None
    importance: Optional[int] = None

    @model_validator(mode="after")
    def check_fields_match_type(self) -> "CriterionCreate":
        if self.data_type == DataType.NUMERIC:
            if self.classification == Classification.HARD:
                if self.numeric_min is None or self.numeric_max is None:
                    raise ValueError("HARD NUMERIC criteria must include numeric_min and numeric_max.")
                if self.numeric_ideal is not None or self.numeric_tolerance is not None:
                    raise ValueError("HARD NUMERIC criteria cannot use numeric_ideal or numeric_tolerance.")
            
            elif self.classification == Classification.SOFT:
                if self.numeric_ideal is None or self.numeric_tolerance is None:
                    raise ValueError("SOFT NUMERIC criteria must include numeric_ideal and numeric_tolerance.")
                if self.numeric_min is not None or self.numeric_max is not None:
                    raise ValueError("SOFT NUMERIC criteria cannot use numeric_min or numeric_max.")
                    
        elif self.data_type == DataType.CATEGORICAL:
            if self.categorical_ideal is None:
                raise ValueError("CATEGORICAL criteria must include categorical_ideal.")
                
        elif self.data_type == DataType.BOOLEAN:
            if self.boolean_ideal is None:
                raise ValueError("BOOLEAN criteria must include boolean_ideal.")
                
        return self

class CriterionResponse(CriterionCreate):
    criterion_id: int
    trial_id: str

    model_config = ConfigDict(from_attributes=True)