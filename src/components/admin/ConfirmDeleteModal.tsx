"use client";

import { useState } from "react";

interface DeleteSummary {
  companyName: string;
  sessions: number;
  referenceFiles: number;
  storageFiles: number;
}

interface ConfirmDeleteModalProps {
  company: { id: string; name: string };
  summary: DeleteSummary | null;
  loadingSummary: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  company,
  summary,
  loadingSummary,
  deleting,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  const [confirmName, setConfirmName] = useState("");
  const nameMatches = confirmName.trim() === company.name.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-company-title"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <h2 id="delete-company-title" className="text-lg font-semibold text-red-400">
            Delete company permanently
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            This action cannot be undone. All data for <span className="text-white font-medium">{company.name}</span> will be erased.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loadingSummary ? (
            <p className="text-sm text-slate-500">Calculating impact...</p>
          ) : summary ? (
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2 text-sm">
              <p className="text-slate-400 font-medium">The following will be permanently removed:</p>
              <ul className="text-slate-300 space-y-1">
                <li>• {summary.sessions} employee interview{summary.sessions === 1 ? "" : "s"} (messages, reports, attachments)</li>
                <li>• {summary.referenceFiles} reference data file{summary.referenceFiles === 1 ? "" : "s"} (Excel / PDF imports)</li>
                <li>• {summary.storageFiles} uploaded file{summary.storageFiles === 1 ? "" : "s"} from Supabase storage</li>
                <li>• Company profile, interview link, and AI context</li>
              </ul>
            </div>
          ) : null}

          <div>
            <label htmlFor="confirm-delete-name" className="block text-sm text-slate-400 mb-2">
              Type <span className="text-white font-medium">{company.name}</span> to confirm
            </label>
            <input
              id="confirm-delete-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={company.name}
              disabled={deleting}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 disabled:opacity-50"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl text-sm border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!nameMatches || deleting || loadingSummary}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed min-w-[120px]"
          >
            {deleting ? "Deleting..." : "Delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}
