import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const API_BASE_URL = "http://localhost:8000";

function App() {
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(
    "Choose a CSV or Excel file to preview its contents.",
  );
  const [isLoading, setIsLoading] = useState(false);

  const rowCount = rows.length;
  const emptyState = useMemo(() => rowCount === 0, [rowCount]);

  const handleUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setFileName(selectedFile.name);
    setStatus("Uploading and parsing file...");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.detail || "Upload failed.");
      }

      const payload = await response.json();
      setColumns(payload.columns || []);
      setRows(payload.rows || []);
      setStatus(
        `Loaded ${payload.rowCount ?? payload.rows?.length ?? 0} rows from ${payload.filename}.`,
      );
    } catch (error) {
      setColumns([]);
      setRows([]);
      setStatus(error.message);
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  return React.createElement(
    "main",
    { className: "shell" },
    React.createElement(
      "section",
      { className: "hero" },
      React.createElement("p", { className: "eyebrow" }, "dsqus data preview"),
      React.createElement(
        "h1",
        null,
        "Upload a CSV or Excel file and inspect it instantly.",
      ),
      React.createElement(
        "p",
        { className: "lede" },
        "The browser sends the file to the FastAPI backend, which parses the headers and rows and returns table-ready data.",
      ),
      React.createElement(
        "label",
        { className: "uploadButton" },
        React.createElement("input", {
          accept: ".csv,.xls,.xlsx",
          type: "file",
          onChange: handleUpload,
        }),
        isLoading ? "Processing..." : "Upload File",
      ),
      React.createElement(
        "div",
        { className: "statusBar" },
        React.createElement("span", null, status),
        fileName ? React.createElement("span", null, fileName) : null,
      ),
    ),
    React.createElement(
      "section",
      { className: "tableCard" },
      React.createElement(
        "div",
        { className: "tableMeta" },
        React.createElement("h2", null, "Preview"),
        React.createElement("span", null, `${rowCount} rows`),
      ),
      emptyState
        ? React.createElement(
            "div",
            { className: "emptyState" },
            "The table will appear here after upload.",
          )
        : React.createElement(
            "div",
            { className: "tableWrap" },
            React.createElement(
              "table",
              null,
              React.createElement(
                "thead",
                null,
                React.createElement(
                  "tr",
                  null,
                  columns.map((column) =>
                    React.createElement("th", { key: column }, column),
                  ),
                ),
              ),
              React.createElement(
                "tbody",
                null,
                rows.map((row, rowIndex) =>
                  React.createElement(
                    "tr",
                    { key: rowIndex },
                    columns.map((column) =>
                      React.createElement(
                        "td",
                        { key: column },
                        row[column] ?? "",
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
    ),
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
