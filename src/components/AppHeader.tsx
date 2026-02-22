import React from "react";
import { RefreshCw } from "lucide-react";

type AppHeaderProps = {
  title: string;
  icon: React.ReactNode;
  onRefresh?: () => void;
  lastUpdated?: string;
};

export default function AppHeader({
  title,
  icon,
  onRefresh,
  lastUpdated,
}: AppHeaderProps) {
  return (
    <div className="app-header">
      <div className="app-header-main">
        <div className="app-header-title-group">
          <div className="app-header-icon">{icon}</div>
          <h1 className="app-header-title">{title}</h1>
        </div>
        <div className="app-header-actions">
          {onRefresh && (
            <button className="btn-icon" onClick={onRefresh} title="Refresh">
              <RefreshCw size={20} />
            </button>
          )}
        </div>
      </div>
      {lastUpdated && (
        <div className="app-header-status-row">
          <span className="status-pill">Updated {lastUpdated}</span>
        </div>
      )}
    </div>
  );
}
