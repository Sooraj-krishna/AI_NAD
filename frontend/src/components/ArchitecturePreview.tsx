import React from 'react';
import './ArchitecturePreview.css';

interface ArchitecturePreviewProps {
  architecture?: any;
}

export const ArchitecturePreview: React.FC<ArchitecturePreviewProps> = ({
  architecture
}) => {
  if (!architecture) return null;

  return (
    <div className="architecture-preview">
      <h3>Generated Architecture</h3>
      
      <div className="architecture-grid">
        <div className="arch-section">
          <h4>Stack</h4>
          <ul>
            <li><strong>Frontend:</strong> {architecture.architecture?.frontend || 'N/A'}</li>
            <li><strong>Backend:</strong> {architecture.architecture?.backend || 'N/A'}</li>
            <li><strong>Database:</strong> {architecture.architecture?.database || 'N/A'}</li>
          </ul>
        </div>

        {architecture.api_endpoints && architecture.api_endpoints.length > 0 && (
          <div className="arch-section">
            <h4>API Endpoints</h4>
            <ul>
              {architecture.api_endpoints.map((endpoint: any, idx: number) => (
                <li key={idx}>
                  <code>{endpoint.method}</code> {endpoint.path}
                  <span className="endpoint-desc"> - {endpoint.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {architecture.database_schema?.tables && architecture.database_schema.tables.length > 0 && (
          <div className="arch-section">
            <h4>Database Tables</h4>
            <ul>
              {architecture.database_schema.tables.map((table: any, idx: number) => (
                <li key={idx}>
                  <strong>{table.name}</strong>
                  <span className="table-columns">
                    ({table.columns.length} columns)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};


