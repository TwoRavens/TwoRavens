"""Convenience methods for JSON strings"""
import json
from datetime import date, datetime
import decimal


class RavenJSONEncoder(json.JSONEncoder):
    """class to encode the data"""
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        #if isinstance(obj, np.integer):
        #    return int(obj)
        #elif isinstance(obj, np.floating):
        #    return float(obj)
        #elif isinstance(obj, np.ndarray):
        #    return obj.tolist()
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()

        return super(RavenJSONEncoder, self).default(obj)
