from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pandas as pd


SUPPORTED_EXTENSIONS = {".csv", ".xls", ".xlsx"}


def parse_uploaded_file(filename: str, content: bytes) -> dict[str, object]:
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only CSV and Excel files are supported.")

    if extension == ".csv":
        frame = pd.read_csv(BytesIO(content))
    else:
        frame = pd.read_excel(BytesIO(content))

    frame = frame.fillna("")
    columns = list(frame.columns.astype(str))
    rows = frame.to_dict(orient="records")

    return {
        "filename": filename,
        "columns": columns,
        "rows": rows,
        "rowCount": len(rows),
    }