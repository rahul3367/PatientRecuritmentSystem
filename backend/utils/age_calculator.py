from datetime import date, datetime
from typing import Any

def calculate_age(dob: Any) -> int:
    """
    Calculates current age based on DOB, correctly accounting for 
    whether the birthday has happened yet this year.
    Supports both date instances and YYYY-MM-DD strings.
    """
    if isinstance(dob, str):
        try:
            dob = datetime.strptime(dob, "%Y-%m-%d").date()
        except ValueError:
            return 0

    today = date.today()
    birthday_not_yet_passed = ((today.month, today.day) < (dob.month, dob.day))
    return today.year - dob.year - birthday_not_yet_passed