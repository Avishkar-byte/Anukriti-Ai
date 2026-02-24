from typing import Dict

from core.requirements.models import RequirementPackage


def convert_req_to_medet_config(req_package: RequirementPackage) -> Dict:
    """
    Extracts relevant parameters and device context from the RequirementPackage
    for MeDeT configuration.
    """
    device_name = req_package.device_name.replace(" ", "_")

    # Extract parameters from constraints or system reqs
    # Heuristic: any constraint with a unit is a potential monitoring parameter
    parameters = set()
    for req in req_package.requirements:
        for constraint in req.constraints:
            if constraint.unit:
                # Clean up description to be a parameter name
                param_name = constraint.description.replace(" ", "_").lower()
                parameters.add(param_name)

    if not parameters:
        # Fallback/Default parameters if none extracted
        parameters = {"voltage", "current", "temperature"}

    config = {
        "device_name": device_name,
        "parameters": list(parameters),
        "sampling_rate": 100,  # Default Hz
        "source_req_id": [r.id for r in req_package.requirements],
    }

    return config


if __name__ == "__main__":
    # Test stub
    pass
